/**
 * CSV directory → per-dataset record arrays — Phase 4 importer (ADR 0007). Chỉ hỗ trợ canonical
 * column name từ `data-templates/csv/*.csv` (Phase 3) — không fuzzy match tên file/cột. Mỗi dòng lỗi
 * bị loại khỏi dataset (không đưa giá trị chưa chuẩn hoá được vào field có kiểu) NHƯNG việc này không
 * tương đương "import thành công một phần": bất kỳ transport issue nào cũng khiến toàn bộ lần chạy bị
 * đánh dấu blocking ở pipeline.ts (xem "Rejected records" trong docs/project-data-import/03-importer-design.md).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { findDuplicateHeaders, findEmptyHeaderIndices, parseCsvFile } from './csvParsing';
import { CSV_DATASET_SPECS, type ColumnSpec, type CsvDatasetSpec } from './csvColumnSpecs';
import {
  isEmptyCell,
  normalizeRawCell,
  parseBoolean,
  parseEnum,
  parseIsoDateOnly,
  parseIsoDateTime,
  parseNonEmptyString,
  parsePercentage,
  parseSemicolonArray,
  parseVndAmount,
} from './normalize';
import type { ImportIssue } from './errorCodes';

const KNOWN_FILE_NAMES = new Set(CSV_DATASET_SPECS.map((s) => s.fileName));
/** `audit-events.csv` được công nhận là tên file hợp lệ nhưng KHÔNG được ingest ở Phase 4 — xem
 * quyết định 5, ADR 0006 ("auditEvents deferred") + ADR 0007. Không phải "unknown file". */
const DEFERRED_FILE_NAMES = new Set(['audit-events.csv']);

export interface CsvDatasetResult {
  datasetKey: string;
  records: Record<string, unknown>[];
  issues: ImportIssue[];
}

export interface CsvDirectoryResult {
  datasets: CsvDatasetResult[];
  issues: ImportIssue[];
}

function parseCellByKind(
  column: ColumnSpec,
  normalized: string,
):
  | { ok: true; value: unknown }
  | { ok: false; issue: Omit<ImportIssue, 'file' | 'row' | 'dataset'> } {
  switch (column.kind) {
    case 'string':
      if (column.required) {
        const result = parseNonEmptyString(normalized);
        return result.ok
          ? { ok: true, value: result.value }
          : {
              ok: false,
              issue: {
                code: result.code,
                severity: 'error',
                layer: 'transport',
                fieldPath: column.field,
                message: result.message,
              },
            };
      }
      return { ok: true, value: normalized };
    case 'vnd': {
      const result = parseVndAmount(normalized);
      return result.ok
        ? { ok: true, value: result.value }
        : {
            ok: false,
            issue: {
              code: result.code,
              severity: 'error',
              layer: 'transport',
              fieldPath: column.field,
              message: result.message,
            },
          };
    }
    case 'percentage': {
      const result = parsePercentage(normalized);
      return result.ok
        ? { ok: true, value: result.value }
        : {
            ok: false,
            issue: {
              code: result.code,
              severity: 'error',
              layer: 'transport',
              fieldPath: column.field,
              message: result.message,
            },
          };
    }
    case 'dateOnly': {
      const result = parseIsoDateOnly(normalized);
      return result.ok
        ? { ok: true, value: result.value }
        : {
            ok: false,
            issue: {
              code: result.code,
              severity: 'error',
              layer: 'transport',
              fieldPath: column.field,
              message: result.message,
            },
          };
    }
    case 'dateTime': {
      const result = parseIsoDateTime(normalized);
      return result.ok
        ? { ok: true, value: result.value }
        : {
            ok: false,
            issue: {
              code: result.code,
              severity: 'error',
              layer: 'transport',
              fieldPath: column.field,
              message: result.message,
            },
          };
    }
    case 'boolean': {
      const result = parseBoolean(normalized);
      return result.ok
        ? { ok: true, value: result.value }
        : {
            ok: false,
            issue: {
              code: result.code,
              severity: 'error',
              layer: 'transport',
              fieldPath: column.field,
              message: result.message,
            },
          };
    }
    case 'enum': {
      const result = parseEnum(normalized, column.enumValues ?? []);
      return result.ok
        ? { ok: true, value: result.value }
        : {
            ok: false,
            issue: {
              code: result.code,
              severity: 'error',
              layer: 'transport',
              fieldPath: column.field,
              message: result.message,
            },
          };
    }
    case 'semicolonArray':
      return { ok: true, value: parseSemicolonArray(normalized) };
  }
}

function processDatasetFile(spec: CsvDatasetSpec, content: string): CsvDatasetResult {
  const issues: ImportIssue[] = [];
  const parsed = parseCsvFile(spec.fileName, content);
  if (!parsed.ok) return { datasetKey: spec.datasetKey, records: [], issues: [parsed.issue] };

  const { header, rows } = parsed;
  if (header.length === 0) {
    issues.push({
      code: 'csv-header-missing',
      severity: 'error',
      layer: 'transport',
      file: spec.fileName,
      dataset: spec.datasetKey,
      message: `${spec.fileName} rỗng hoặc không có header.`,
    });
    return { datasetKey: spec.datasetKey, records: [], issues };
  }

  const duplicates = findDuplicateHeaders(header);
  for (const name of duplicates)
    issues.push({
      code: 'csv-header-duplicate',
      severity: 'error',
      layer: 'transport',
      file: spec.fileName,
      dataset: spec.datasetKey,
      fieldPath: name,
      message: `Header trùng lặp: "${name}".`,
    });

  const emptyHeaderIndices = findEmptyHeaderIndices(header);
  for (const index of emptyHeaderIndices)
    issues.push({
      code: 'csv-column-unknown',
      severity: 'warning',
      layer: 'transport',
      file: spec.fileName,
      dataset: spec.datasetKey,
      message: `Cột thứ ${index + 1} có header rỗng — bị bỏ qua.`,
    });

  const headerIndex = new Map<string, number>();
  header.forEach((name, index) => {
    if (!headerIndex.has(name)) headerIndex.set(name, index);
  });

  const knownHeaders = new Set(spec.columns.map((col) => col.header));
  const unknownColumns = header.filter((name) => name.trim().length > 0 && !knownHeaders.has(name));
  for (const name of unknownColumns)
    issues.push({
      code: 'csv-column-unknown',
      severity: 'warning',
      layer: 'transport',
      file: spec.fileName,
      dataset: spec.datasetKey,
      fieldPath: name,
      message: `Cột không thuộc canonical schema (${spec.fileName}): "${name}" — bị bỏ qua (dùng --strict để coi là lỗi).`,
    });

  const missingRequiredColumns = spec.columns.filter(
    (col) => col.required && !headerIndex.has(col.header),
  );
  for (const col of missingRequiredColumns)
    issues.push({
      code: 'field-required',
      severity: 'error',
      layer: 'transport',
      file: spec.fileName,
      dataset: spec.datasetKey,
      fieldPath: col.field,
      message: `Thiếu cột bắt buộc "${col.header}" trong ${spec.fileName}.`,
    });

  if (duplicates.length > 0 || missingRequiredColumns.length > 0)
    return { datasetKey: spec.datasetKey, records: [], issues };

  const records: Record<string, unknown>[] = [];
  rows.forEach((row, rowIndex) => {
    const rowNumber = rowIndex + 2; // +1 for 1-based, +1 for header row.
    const record: Record<string, unknown> = {};
    let rowHasError = false;
    for (const column of spec.columns) {
      const columnIndex = headerIndex.get(column.header);
      const raw = columnIndex === undefined ? '' : (row[columnIndex] ?? '');
      const normalized = normalizeRawCell(raw);
      if (isEmptyCell(normalized)) {
        if (column.required) {
          issues.push({
            code: 'field-required',
            severity: 'error',
            layer: 'transport',
            file: spec.fileName,
            dataset: spec.datasetKey,
            row: rowNumber,
            fieldPath: column.field,
            message: `Dòng ${rowNumber}: thiếu giá trị bắt buộc cho "${column.header}".`,
          });
          rowHasError = true;
        } else if (column.kind === 'semicolonArray') {
          record[column.field] = [];
        }
        continue;
      }
      const result = parseCellByKind(column, normalized);
      if (!result.ok) {
        issues.push({
          ...result.issue,
          file: spec.fileName,
          dataset: spec.datasetKey,
          row: rowNumber,
        });
        rowHasError = true;
        continue;
      }
      record[column.field] = result.value;
    }
    if (!rowHasError) records.push(record);
  });

  return { datasetKey: spec.datasetKey, records, issues };
}

export function readCsvDirectory(inputDir: string, strict: boolean): CsvDirectoryResult {
  const entries = readdirSync(inputDir).filter((name) => name.toLowerCase().endsWith('.csv'));
  const issues: ImportIssue[] = [];

  for (const fileName of entries) {
    if (KNOWN_FILE_NAMES.has(fileName) || DEFERRED_FILE_NAMES.has(fileName)) continue;
    issues.push({
      code: 'dataset-unresolved',
      severity: strict ? 'error' : 'warning',
      layer: 'transport',
      file: fileName,
      message: `Tên file CSV không khớp bất kỳ dataset canonical nào: "${fileName}" (dùng --strict để coi là lỗi).`,
    });
  }
  for (const fileName of DEFERRED_FILE_NAMES) {
    if (entries.includes(fileName))
      issues.push({
        code: 'dataset-unresolved',
        severity: 'warning',
        layer: 'transport',
        file: fileName,
        message: `${fileName} được nhận diện nhưng KHÔNG được import ở Phase 4 (auditEvents deferred, xem ADR 0006/0007) — nội dung bị bỏ qua.`,
      });
  }

  const datasets: CsvDatasetResult[] = [];
  for (const spec of CSV_DATASET_SPECS) {
    const filePath = join(inputDir, spec.fileName);
    if (!entries.includes(spec.fileName)) {
      if (spec.required)
        issues.push({
          code: 'input-not-found',
          severity: 'error',
          layer: 'transport',
          file: spec.fileName,
          dataset: spec.datasetKey,
          message: `Thiếu file bắt buộc: ${spec.fileName}.`,
        });
      datasets.push({ datasetKey: spec.datasetKey, records: [], issues: [] });
      continue;
    }
    const content = readFileSync(filePath, 'utf8');
    datasets.push(processDatasetFile(spec, content));
  }

  return { datasets, issues };
}
