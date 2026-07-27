/**
 * JSON input mode — Phase 4 importer (ADR 0007). Chấp nhận DUY NHẤT một file canonical bundle
 * `.json` hoàn chỉnh (từ chối directory ở mode này — xem `discoverInput` trong `pipeline.ts`).
 */
import type { ImportIssue } from './errorCodes';
import { isSupportedCanonicalSchemaVersion } from '../../src/entities/project/canonicalBundle';
import type { CanonicalProjectPortfolioBundle } from '../../src/entities/project/canonicalBundle';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Structural pre-check tối thiểu TRƯỚC Ajv — chỉ đủ để biết truy cập `schemaVersion`/`datasets` có
 * an toàn hay không (không phải một validator nghiệp vụ, không lặp lại constraint nào Ajv đã làm).
 * Cùng tinh thần `isPlausibleCanonicalBundleShape` trong `src/data/generatedJsonProjectPortfolioSource.ts`
 * — KHÔNG import lại từ đó vì hàm đó không export (nội bộ file); đây KHÔNG phải "viết lại record
 * validator" (nguyên tắc #2) vì không kiểm tra business rule nào, chỉ kiểm tra shape top-level.
 */
export function isPlausibleCanonicalBundleShape(
  value: unknown,
): value is Pick<CanonicalProjectPortfolioBundle, 'schemaVersion' | 'bundleVersion' | 'datasets'> {
  if (!isPlainObject(value)) return false;
  if (!isNonEmptyString(value.schemaVersion) || !isNonEmptyString(value.bundleVersion))
    return false;
  return isPlainObject(value.datasets);
}

export type JsonBundleParseResult =
  { ok: true; bundle: unknown } | { ok: false; issue: ImportIssue };

export function parseJsonBundle(content: string, fileName: string): JsonBundleParseResult {
  try {
    return { ok: true, bundle: JSON.parse(content) };
  } catch (error) {
    return {
      ok: false,
      issue: {
        code: 'json-parse-failed',
        severity: 'error',
        layer: 'transport',
        file: fileName,
        message: `Không parse được JSON: ${error instanceof Error ? error.message : String(error)}`,
      },
    };
  }
}

export function checkSchemaVersionSupported(schemaVersion: string): ImportIssue | null {
  if (isSupportedCanonicalSchemaVersion(schemaVersion)) return null;
  return {
    code: 'unsupported-schema-version',
    severity: 'error',
    layer: 'schema',
    message: `schemaVersion "${schemaVersion}" không nằm trong SUPPORTED_CANONICAL_SCHEMA_VERSIONS (canonicalBundle.ts) — không parse "best-effort".`,
  };
}
