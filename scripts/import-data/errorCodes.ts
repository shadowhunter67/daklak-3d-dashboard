/**
 * Stable error-code taxonomy cho offline importer — Phase 4 (docs/project-data-import/, ADR 0007).
 * Test và report PHẢI so khớp theo `code`, không phải theo nội dung `message` (message có thể đổi
 * câu chữ mà không phá test — xem docs/project-data-import/importer-error-codes.md).
 */
export const IMPORTER_ERROR_CODES = [
  'cli-invalid-argument',
  'input-not-found',
  'input-encoding-invalid',
  'json-parse-failed',
  'csv-parse-failed',
  'csv-header-missing',
  'csv-header-duplicate',
  'csv-column-unknown',
  'field-required',
  'field-invalid-type',
  'field-invalid-enum',
  'field-invalid-date',
  'field-invalid-vnd',
  'field-invalid-array',
  'unsupported-schema-version',
  'schema-invalid',
  'domain-invalid',
  'duplicate-primary-key',
  'foreign-key-unresolved',
  'administrative-code-unresolved',
  'geometry-invalid',
  'dataset-unresolved',
  'output-write-failed',
  'last-known-good-protection-failed',
  // Hai code bổ sung (spec liệt kê taxonomy dùng "ví dụ:", không đóng danh sách) cho hai loại
  // business alert non-blocking đã có sẵn trong `dataQualityRules.ts` (rule §9, "multiple
  // verification stage records") — KHÔNG được biến thành lỗi chặn import (nguyên tắc bắt buộc #17).
  'business-stale-data',
  'business-multiple-verification-stage',
] as const;
export type ImporterErrorCode = (typeof IMPORTER_ERROR_CODES)[number];

export type IssueSeverity = 'error' | 'warning';
/** `transport` = CSV/JSON parsing; `schema` = Layer 1 JSON Schema; `domain` = Layer 2 record
 * validators; `quality` = Layer 3 cross-record rules; `business` = non-blocking operational signal
 * (stale/at-risk) that must NEVER be promoted to a validation error (nguyên tắc bắt buộc #17). */
export type IssueLayer = 'transport' | 'schema' | 'domain' | 'quality' | 'business';

export interface ImportIssue {
  code: ImporterErrorCode;
  severity: IssueSeverity;
  layer: IssueLayer;
  dataset?: string;
  file?: string;
  row?: number;
  recordId?: string;
  fieldPath?: string;
  message: string;
  details?: string;
}
