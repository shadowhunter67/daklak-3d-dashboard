/**
 * Import-local dataset-id resolution — Phase 4 importer (ADR 0007, "Dataset catalog" trong spec
 * Phase 4). Không tạo `DatasetDescriptor` giả cho id lạ — chỉ kiểm tra id có resolve được qua
 * `DATASET_CATALOG` (đã có, Phase 1-3) HOẶC qua một `--source-registry <path>` tuỳ chọn đi kèm input
 * (mảng id đơn giản, KHÔNG phải bản sao DatasetDescriptor đầy đủ — file này chỉ khai báo "id này có
 * chủ", không tự xác nhận chất lượng dữ liệu).
 */
import { existsSync, readFileSync } from 'node:fs';
import { DATASET_CATALOG } from '../../src/data-platform/catalog/datasets';
import type { ImportIssue } from './errorCodes';

export function loadLocalSourceRegistryIds(filePath: string | undefined): ReadonlySet<string> {
  if (!filePath || !existsSync(filePath)) return new Set();
  const parsed = JSON.parse(readFileSync(filePath, 'utf8')) as unknown;
  if (!Array.isArray(parsed))
    throw new Error(
      `--source-registry phải là JSON array các id chuỗi, nhận được: ${typeof parsed}`,
    );
  return new Set(parsed.filter((id): id is string => typeof id === 'string'));
}

export function resolveDatasetIds(
  referencedIds: ReadonlySet<string>,
  localRegistryIds: ReadonlySet<string>,
  strict: boolean,
): ImportIssue[] {
  const catalogIds = new Set(DATASET_CATALOG.map((d) => d.id));
  const issues: ImportIssue[] = [];
  for (const id of referencedIds) {
    if (catalogIds.has(id) || localRegistryIds.has(id)) continue;
    issues.push({
      code: 'dataset-unresolved',
      severity: strict ? 'error' : 'warning',
      layer: 'quality',
      recordId: id,
      message: `sourceDatasetId "${id}" không resolve qua DATASET_CATALOG lẫn --source-registry (dùng --strict để coi là lỗi chặn import).`,
    });
  }
  return issues;
}
