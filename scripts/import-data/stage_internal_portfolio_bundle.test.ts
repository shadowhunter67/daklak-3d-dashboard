import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { main } from './stage_internal_portfolio_bundle';
import {
  CANONICAL_PROJECT_PORTFOLIO_SCHEMA_VERSION,
  type CanonicalProjectPortfolioBundle,
} from '../../src/entities/project/canonicalBundle';

function validBundle(): CanonicalProjectPortfolioBundle {
  return {
    schemaVersion: CANONICAL_PROJECT_PORTFOLIO_SCHEMA_VERSION,
    bundleVersion: 'test-1',
    metadata: {
      generatedAt: '2026-01-01T00:00:00.000Z',
      asOf: '2026-01-01T00:00:00.000Z',
      sourceDatasetIds: ['project-portfolio-illustrative'],
      administrativeCodeVersion: 'v1',
      classification: 'internal',
      producer: 'test',
    },
    datasets: {
      agencies: [{ id: 'a', name: 'Agency', type: 'managing-authority' }],
      contractors: [],
      projects: [
        {
          id: 'p',
          code: 'C',
          name: 'n',
          description: 'd',
          sector: 'transport',
          status: 'active',
          priority: 'medium',
          managingAuthorityId: 'a',
          investorId: 'a',
          approvedBudget: 0,
          disbursedAmount: 0,
          overallProgress: 0,
          plannedProgress: 0,
          financialProgress: 0,
          administrativeAreaCodes: ['22015'],
          dataUpdatedAt: '2026-01-01T00:00:00.000Z',
          dataOwner: 'o',
          sourceDatasetId: 'project-portfolio-illustrative',
          confidence: 'medium',
          verificationStatus: 'submitted',
        },
      ],
      workPackages: [],
      milestones: [],
      projectIssues: [],
      progressSnapshots: [],
      evidence: [],
      referenceDocuments: [],
    },
  };
}

let workDir: string;
let bundlePath: string;
let targetPath: string;

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), 'stage-test-'));
  bundlePath = join(workDir, 'input-bundle.json');
  targetPath = join(workDir, 'target', 'project-portfolio.json');
  process.env.STAGE_TARGET_PATH_OVERRIDE = targetPath;
});

afterEach(() => {
  delete process.env.STAGE_TARGET_PATH_OVERRIDE;
  rmSync(workDir, { recursive: true, force: true });
});

function writeBundle(content: unknown) {
  writeFileSync(bundlePath, JSON.stringify(content), 'utf8');
}

describe('stage_internal_portfolio_bundle', () => {
  it('stages a valid canonical bundle and exits 0', async () => {
    writeBundle(validBundle());
    const code = await main(['--bundle', bundlePath]);
    expect(code).toBe(0);
    expect(existsSync(targetPath)).toBe(true);
    const staged = JSON.parse(readFileSync(targetPath, 'utf8'));
    expect(staged.schemaVersion).toBe(CANONICAL_PROJECT_PORTFOLIO_SCHEMA_VERSION);
  });

  it('rejects invalid JSON and exits 1 without creating the target', async () => {
    writeFileSync(bundlePath, '{ not json', 'utf8');
    const code = await main(['--bundle', bundlePath]);
    expect(code).toBe(1);
    expect(existsSync(targetPath)).toBe(false);
  });

  it('rejects an unsupported schemaVersion and exits 1', async () => {
    writeBundle({ ...validBundle(), schemaVersion: '9.9.9' });
    const code = await main(['--bundle', bundlePath]);
    expect(code).toBe(1);
    expect(existsSync(targetPath)).toBe(false);
  });

  it('rejects a schema-invalid bundle (missing required field) and exits 1', async () => {
    const bundle = validBundle();
    // @ts-expect-error deliberately deleting a required field for the test
    delete bundle.metadata.producer;
    writeBundle(bundle);
    const code = await main(['--bundle', bundlePath]);
    expect(code).toBe(1);
    expect(existsSync(targetPath)).toBe(false);
  });

  it('does not modify an existing target when validation fails', async () => {
    writeBundle(validBundle());
    expect(await main(['--bundle', bundlePath])).toBe(0);
    const before = readFileSync(targetPath, 'utf8');

    writeFileSync(bundlePath, '{ not json', 'utf8');
    expect(await main(['--bundle', bundlePath])).toBe(1);
    expect(readFileSync(targetPath, 'utf8')).toBe(before);
  });

  it('safely replaces an existing target with new valid content', async () => {
    writeBundle(validBundle());
    await main(['--bundle', bundlePath]);
    const first = JSON.parse(readFileSync(targetPath, 'utf8'));
    expect(first.bundleVersion).toBe('test-1');

    writeBundle({ ...validBundle(), bundleVersion: 'test-2' });
    await main(['--bundle', bundlePath]);
    const second = JSON.parse(readFileSync(targetPath, 'utf8'));
    expect(second.bundleVersion).toBe('test-2');
  });

  it('cleans up its temp directory after staging', async () => {
    writeBundle(validBundle());
    await main(['--bundle', bundlePath]);
    const siblingEntries = readdirSync(join(workDir, 'target'));
    expect(siblingEntries.some((name) => name.startsWith('.stage-tmp-'))).toBe(false);
  });

  it('rejects an unknown CLI option and exits 2', async () => {
    const code = await main(['--bundle', bundlePath, '--bogus']);
    expect(code).toBe(2);
  });

  it('exits 2 when --bundle is missing', async () => {
    expect(await main([])).toBe(2);
  });

  it('exits 2 when the input file does not exist', async () => {
    const code = await main(['--bundle', join(workDir, 'does-not-exist.json')]);
    expect(code).toBe(2);
  });

  it('exits 2 when --bundle and the target resolve to the same path', async () => {
    const code = await main(['--bundle', targetPath]);
    expect(code).toBe(2);
  });
});
