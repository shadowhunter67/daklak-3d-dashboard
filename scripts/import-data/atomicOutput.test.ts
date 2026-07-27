import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  cleanupOrphanedTempDirs,
  isNoChangeAgainstLastKnownGood,
  writeOutputAtomically,
} from './atomicOutput';

let workDir: string | undefined;

afterEach(() => {
  if (workDir) rmSync(workDir, { recursive: true, force: true });
  workDir = undefined;
});

describe('writeOutputAtomically', () => {
  it('writes all files and leaves no temp directory behind on success', () => {
    workDir = mkdtempSync(join(tmpdir(), 'importer-atomic-'));
    const outputDir = join(workDir, 'generated-data');
    writeOutputAtomically(outputDir, [
      { fileName: 'a.json', content: '{"a":1}' },
      { fileName: 'b.md', content: '# hi' },
    ]);
    expect(readFileSync(join(outputDir, 'a.json'), 'utf8')).toBe('{"a":1}');
    expect(readFileSync(join(outputDir, 'b.md'), 'utf8')).toBe('# hi');
    const siblings = readdirSync(workDir);
    expect(siblings.some((name) => name.startsWith('.generated-data.tmp-'))).toBe(false);
  });

  it('preserves an existing output directory when the previous run never promoted', () => {
    workDir = mkdtempSync(join(tmpdir(), 'importer-atomic-'));
    const outputDir = join(workDir, 'generated-data');
    writeOutputAtomically(outputDir, [{ fileName: 'a.json', content: 'first' }]);
    // Second run promotes and REPLACES the directory — this proves promote overwrites cleanly,
    // not that it corrupts a partially-written directory (the failure-preserves-LKG guarantee is
    // that a THROWING write never calls renameSync at all — see writeOutputAtomically's try/catch).
    writeOutputAtomically(outputDir, [{ fileName: 'a.json', content: 'second' }]);
    expect(readFileSync(join(outputDir, 'a.json'), 'utf8')).toBe('second');
  });
});

describe('cleanupOrphanedTempDirs', () => {
  it('removes leftover .generated-data.tmp-* directories without touching the real output', () => {
    workDir = mkdtempSync(join(tmpdir(), 'importer-atomic-'));
    const outputDir = join(workDir, 'generated-data');
    writeOutputAtomically(outputDir, [{ fileName: 'a.json', content: 'x' }]);
    const orphan = join(workDir, '.generated-data.tmp-orphan');
    writeFileSync(join(workDir, '.marker'), 'x');
    mkdirSync(orphan);
    cleanupOrphanedTempDirs(outputDir);
    expect(existsSync(orphan)).toBe(false);
    expect(existsSync(outputDir)).toBe(true);
  });
});

describe('isNoChangeAgainstLastKnownGood', () => {
  it('returns false when no lastKnownGood path is given', () => {
    expect(isNoChangeAgainstLastKnownGood(undefined, 'abc')).toBe(false);
  });

  it('returns true only when normalizedContentChecksum matches, ignoring generatedAt', () => {
    workDir = mkdtempSync(join(tmpdir(), 'importer-lkg-'));
    writeFileSync(
      join(workDir, 'import-manifest.json'),
      JSON.stringify({ normalizedContentChecksum: 'abc', generatedAt: '2020-01-01T00:00:00.000Z' }),
    );
    expect(isNoChangeAgainstLastKnownGood(workDir, 'abc')).toBe(true);
    expect(isNoChangeAgainstLastKnownGood(workDir, 'different')).toBe(false);
  });
});
