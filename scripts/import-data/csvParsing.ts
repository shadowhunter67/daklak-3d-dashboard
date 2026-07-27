/**
 * Low-level CSV file → rows parsing — Phase 4 importer (ADR 0007). Dùng `csv-parse` (node-csv,
 * MIT) thay vì tự viết bằng `split(',')` — hỗ trợ quoted cell chứa dấu phẩy/newline, escaped quote
 * (`""`), BOM, CRLF/LF, empty trailing cell. Xem docs/project-data-import/csv-contract.md.
 */
import { parse } from 'csv-parse/sync';
import type { ImportIssue } from './errorCodes';

export interface CsvParseSuccess {
  ok: true;
  header: string[];
  rows: string[][];
}
export interface CsvParseFailure {
  ok: false;
  issue: ImportIssue;
}

/**
 * `bom: true` tự động bóc BOM khỏi cell đầu tiên. `relax_column_count: true` vì việc kiểm tra
 * số cột thiếu/thừa theo header phải là quyết định tường minh của tầng trên (header mapping), không
 * phải throw ngầm ở tầng parse — mỗi dòng ngắn/dài hơn header được tầng trên quy về đúng error code
 * cụ thể (csv-header-missing/csv-column-unknown) thay vì một lỗi parse chung chung.
 */
export function parseCsvFile(fileName: string, content: string): CsvParseSuccess | CsvParseFailure {
  let records: string[][];
  try {
    records = parse(content, {
      bom: true,
      skip_empty_lines: true,
      relax_column_count: true,
      trim: false, // trimming là việc của normalize.ts (áp dụng NFC trước), không phải parser.
    }) as string[][];
  } catch (error) {
    return {
      ok: false,
      issue: {
        code: 'csv-parse-failed',
        severity: 'error',
        layer: 'transport',
        file: fileName,
        message: `Không parse được CSV: ${error instanceof Error ? error.message : String(error)}`,
      },
    };
  }
  if (records.length === 0) return { ok: true, header: [], rows: [] };
  const [header, ...rows] = records;
  return { ok: true, header, rows };
}

export function findDuplicateHeaders(header: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const name of header) {
    if (seen.has(name)) duplicates.add(name);
    seen.add(name);
  }
  return [...duplicates];
}

export function findEmptyHeaderIndices(header: readonly string[]): number[] {
  return header.reduce<number[]>((acc, name, index) => {
    if (name.trim().length === 0) acc.push(index);
    return acc;
  }, []);
}
