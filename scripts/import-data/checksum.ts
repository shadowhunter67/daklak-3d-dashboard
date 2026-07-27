/**
 * Deterministic checksum helpers — Phase 4 importer (ADR 0007). Hai loại checksum tách biệt:
 * `inputPackageChecksum` (bytes gốc, đổi khi BẤT KỲ byte input nào đổi, kể cả whitespace vô hại) và
 * `normalizedContentChecksum` (chỉ nội dung nghiệp vụ đã chuẩn hoá, KHÔNG bao gồm `generatedAt` —
 * hai lần chạy importer trên cùng input ở hai thời điểm khác nhau phải cho cùng
 * normalizedContentChecksum, đó là điều kiện để "no-change detection" hoạt động đúng).
 */
import { createHash } from 'node:crypto';

export function sha256Hex(bytes: Buffer | string): string {
  return createHash('sha256').update(bytes).digest('hex');
}

export interface ChecksummedSourceFile {
  relativePath: string;
  byteSize: number;
  sha256: string;
}

/** Checksum toàn bộ input package — độc lập với thứ tự liệt kê filesystem (sort theo relativePath
 * trước khi hash), theo đúng nguyên tắc "Không dựa vào filesystem enumeration order". */
export function computeInputPackageChecksum(files: readonly ChecksummedSourceFile[]): string {
  const sorted = [...files].sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  const manifestLines = sorted.map((f) => `${f.relativePath}:${f.byteSize}:${f.sha256}`);
  return sha256Hex(manifestLines.join('\n'));
}

/**
 * Stable, deterministic JSON stringify: object keys sorted recursively, arrays kept in the order
 * given by the CALLER (caller is responsible for sorting arrays by a stable identity field before
 * calling this — see `sortCanonicalDatasetsForChecksum` in pipeline.ts). This function only removes
 * key-order nondeterminism, not array-order nondeterminism (arrays can have meaningful order that
 * differs from an identity sort in general, so this function must not silently reorder them).
 */
export function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeysDeep(value));
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    const result: Record<string, unknown> = {};
    for (const [key, val] of entries) result[key] = sortKeysDeep(val);
    return result;
  }
  return value;
}

export function computeNormalizedContentChecksum(normalizedDatasets: unknown): string {
  return sha256Hex(stableStringify(normalizedDatasets));
}
