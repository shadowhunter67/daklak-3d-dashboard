/**
 * Administrative-code set resolution — Phase 4 importer (ADR 0007). Mặc định dùng CHÍNH file GIS
 * artifact `daklak-labels.json` mà `IllustrativeProjectPortfolioSource`/
 * `GeneratedJsonProjectPortfolioSource` đã dùng (Phase 1/3) — không nhúng bản sao riêng cho importer
 * (cùng lý do đã ghi trong `src/entities/project/canonicalBundle.ts`: tránh hai nguồn sự thật lệch
 * nhau). `--administrative-codes <path>` cho phép override khi vận hành cần một tập mã khác (đã
 * document rủi ro: file override không tự động là mã hành chính hợp lệ, chỉ là input thay thế).
 */
import { readFileSync } from 'node:fs';
import { sha256Hex } from './checksum';

export interface AdministrativeCodeSet {
  codes: ReadonlySet<string>;
  version: string;
  checksum: string;
}

export function loadAdministrativeCodes(filePath: string): AdministrativeCodeSet {
  const raw = readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw) as Record<string, unknown> & { version?: string };
  const checksum = sha256Hex(raw);
  return {
    codes: new Set(Object.keys(parsed)),
    version: typeof parsed.version === 'string' ? parsed.version : checksum.slice(0, 12),
    checksum,
  };
}
