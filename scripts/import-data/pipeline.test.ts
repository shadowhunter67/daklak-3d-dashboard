import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runImportPipeline, resolveInputFormat, PipelineConfigError } from './pipeline';

function resolveRepoRoot(): string {
  try {
    return resolve(fileURLToPath(new URL('../..', import.meta.url)));
  } catch {
    return process.cwd();
  }
}
const repoRoot = resolveRepoRoot();
const fixturesDir = join(repoRoot, 'scripts', 'import-data', '__fixtures__');
const administrativeCodesPath = join(
  repoRoot,
  'src',
  'assets',
  'maps',
  'daklak',
  'daklak-labels.json',
);
const importerVersion = 'test';
const asOf = '2026-07-27T00:00:00.000Z';

function baseOptions(inputPath: string, format: 'auto' | 'json' | 'csv' = 'auto') {
  return {
    repoRoot,
    inputPath,
    format,
    asOf,
    strict: false,
    administrativeCodesPath,
    importerVersion,
  };
}

describe('resolveInputFormat', () => {
  it('throws PipelineConfigError for a non-existent path', () => {
    expect(() => resolveInputFormat(join(fixturesDir, 'nope'), 'auto')).toThrow(
      PipelineConfigError,
    );
  });
  it('throws when --format explicitly mismatches the filesystem entry', () => {
    expect(() => resolveInputFormat(join(fixturesDir, 'csv-valid'), 'json')).toThrow(
      PipelineConfigError,
    );
  });
});

describe('runImportPipeline — CSV mode', () => {
  it('accepts a valid minimal CSV directory with no blocking issues', () => {
    const result = runImportPipeline(baseOptions(join(fixturesDir, 'csv-valid')));
    expect(result.blocking).toBe(false);
    expect(result.canonicalBundle?.datasets.projects).toHaveLength(1);
    expect(result.canonicalBundle?.datasets.agencies).toHaveLength(1);
    expect(result.canonicalBundle?.datasets.projects[0].administrativeAreaCodes).toEqual(['22015']);
  });

  it('rejects a thousands-separated VND value as blocking', () => {
    const result = runImportPipeline(baseOptions(join(fixturesDir, 'csv-invalid')));
    expect(result.blocking).toBe(true);
    expect(result.issues.some((i) => i.code === 'field-invalid-vnd')).toBe(true);
    expect(result.canonicalBundle?.datasets.projects).toHaveLength(0);
  });

  it('produces the same normalizedContentChecksum across repeated runs (determinism)', () => {
    const first = runImportPipeline(baseOptions(join(fixturesDir, 'csv-valid')));
    const second = runImportPipeline(baseOptions(join(fixturesDir, 'csv-valid')));
    expect(first.normalizedContentChecksum).not.toBeNull();
    expect(first.normalizedContentChecksum).toBe(second.normalizedContentChecksum);
    expect(first.inputPackageChecksum).toBe(second.inputPackageChecksum);
  });

  it('never uses Date.now() for the business bundleVersion (deterministic given same asOf)', () => {
    const first = runImportPipeline(baseOptions(join(fixturesDir, 'csv-valid')));
    const second = runImportPipeline(baseOptions(join(fixturesDir, 'csv-valid')));
    expect(first.canonicalBundle?.bundleVersion).toBe(second.canonicalBundle?.bundleVersion);
  });
});

describe('runImportPipeline — JSON mode', () => {
  const examplesDir = join(repoRoot, 'data-templates', 'examples');

  it('accepts the representative-valid canonical bundle example', () => {
    const inputPath = join(examplesDir, 'representative-valid', 'project-portfolio-bundle.json');
    const result = runImportPipeline(baseOptions(inputPath));
    expect(result.blocking).toBe(false);
  });

  it('rejects an unsupported schemaVersion without best-effort parsing', () => {
    const inputPath = join(examplesDir, 'invalid', 'unknown-schema-version.json');
    const result = runImportPipeline(baseOptions(inputPath));
    expect(result.blocking).toBe(true);
    expect(result.issues.some((i) => i.code === 'unsupported-schema-version')).toBe(true);
    expect(result.canonicalBundle).toBeNull();
  });

  it('rejects a structurally invalid bundle via Layer 1 schema errors', () => {
    const inputPath = join(examplesDir, 'invalid', 'missing-required-field.json');
    const result = runImportPipeline(baseOptions(inputPath));
    expect(result.blocking).toBe(true);
    expect(result.issues.some((i) => i.layer === 'schema')).toBe(true);
  });

  it('rejects a bundle with a broken foreign key at the quality layer (passes Layer 1)', () => {
    const inputPath = join(examplesDir, 'invalid', 'broken-foreign-key.json');
    const result = runImportPipeline(baseOptions(inputPath));
    expect(result.blocking).toBe(true);
    expect(result.issues.some((i) => i.code === 'foreign-key-unresolved')).toBe(true);
  });
});
