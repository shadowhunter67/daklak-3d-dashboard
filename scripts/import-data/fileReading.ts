/**
 * UTF-8-strict file reading + checksumming — Phase 4 importer (ADR 0007). `fatal: true` khiến
 * `TextDecoder` throw trên byte sequence không hợp lệ thay vì âm thầm thay thế bằng U+FFFD (hành vi
 * mặc định của `fs.readFileSync(path, 'utf8')`, sẽ che giấu file bị lỗi encoding).
 */
import { readFileSync } from 'node:fs';
import type { ImportIssue } from './errorCodes';
import { sha256Hex, type ChecksummedSourceFile } from './checksum';

const strictUtf8Decoder = new TextDecoder('utf-8', { fatal: true });

export type ReadUtf8Result =
  { ok: true; content: string; bytes: Buffer } | { ok: false; issue: ImportIssue };

export function readUtf8FileStrict(filePath: string, relativePath: string): ReadUtf8Result {
  const bytes = readFileSync(filePath);
  try {
    const content = strictUtf8Decoder.decode(bytes);
    return { ok: true, content, bytes };
  } catch {
    return {
      ok: false,
      issue: {
        code: 'input-encoding-invalid',
        severity: 'error',
        layer: 'transport',
        file: relativePath,
        message: `${relativePath} không phải UTF-8 hợp lệ.`,
      },
    };
  }
}

export function checksumFile(relativePath: string, bytes: Buffer): ChecksummedSourceFile {
  return { relativePath, byteSize: bytes.length, sha256: sha256Hex(bytes) };
}
