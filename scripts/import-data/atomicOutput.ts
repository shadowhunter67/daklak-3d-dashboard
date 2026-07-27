/**
 * Atomic output write + last-known-good protection — Phase 4 importer (ADR 0007,
 * docs/project-data-import/last-known-good-policy.md). Ghi vào thư mục tạm CÙNG parent với output
 * thật rồi rename — rename trong cùng filesystem là atomic trên cả POSIX và NTFS (không cần
 * transaction database, spec §"Atomic output").
 */
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { computeNormalizedContentChecksum } from './checksum';

export interface StagedFile {
  fileName: string;
  content: string;
}

/** So sánh `normalizedContentChecksum` của output MỚI với last-known-good hiện có — `generatedAt`
 * (chỉ tồn tại trong manifest, không trong phần nội dung được hash) không bao giờ ảnh hưởng kết quả
 * so sánh này (spec "generatedAt thay đổi không được biến no-change thành changed"). */
export function isNoChangeAgainstLastKnownGood(
  lastKnownGoodDir: string | undefined,
  newNormalizedContentChecksum: string | null,
): boolean {
  if (!lastKnownGoodDir || newNormalizedContentChecksum === null) return false;
  const manifestPath = join(lastKnownGoodDir, 'import-manifest.json');
  if (!existsSync(manifestPath)) return false;
  try {
    const previous = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
      normalizedContentChecksum?: string;
    };
    return previous.normalizedContentChecksum === newNormalizedContentChecksum;
  } catch {
    return false;
  }
}

/**
 * Ghi toàn bộ file vào `.generated-data.tmp-<pid>-<random>` cùng cấp với `outputDir`, rồi
 * `renameSync` đè lên `outputDir` khi mọi file đã ghi xong — nếu process chết giữa chừng, `outputDir`
 * cũ (last-known-good) không hề bị chạm tới; thư mục tạm mồ côi cần dọn thủ công (best-effort cleanup
 * ở nhánh success/failure đều có, nhưng một crash cứng giữa write và rename có thể để lại temp dir —
 * chấp nhận được, không phải trạng thái mất dữ liệu).
 */
export function writeOutputAtomically(outputDir: string, files: readonly StagedFile[]): void {
  const parentDir = dirname(outputDir);
  mkdirSync(parentDir, { recursive: true });
  const tempDir = mkdtempSync(join(parentDir, '.generated-data.tmp-'));
  try {
    for (const file of files) writeFileSync(join(tempDir, file.fileName), file.content, 'utf8');
    if (existsSync(outputDir)) rmSync(outputDir, { recursive: true, force: true });
    renameSync(tempDir, outputDir);
  } catch (error) {
    rmSync(tempDir, { recursive: true, force: true });
    throw error;
  }
}

export function cleanupOrphanedTempDirs(outputDir: string): void {
  const parentDir = dirname(outputDir);
  if (!existsSync(parentDir)) return;
  // Best-effort only — never throws, per "cleanup best-effort" spec requirement.
  try {
    const entries = readdirSync(parentDir);
    for (const entry of entries) {
      if (entry.startsWith('.generated-data.tmp-'))
        rmSync(join(parentDir, entry), { recursive: true, force: true });
    }
  } catch {
    /* best-effort */
  }
}

export { computeNormalizedContentChecksum };
