/**
 * Phase 8 (ADR 0011) — automated regression coverage for the Phase 7 pilot rehearsal
 * (data-templates/pilot/phase7-integration-rehearsal/), previously only exercised manually and
 * recorded in docs/project-data-import/phase7-pilot-rehearsal.md (review post-merge Phase 7 finding
 * F-009). Runs the real pilot CSV through import -> public projection -> staging via the actual CLI
 * `main()` entry points (not re-implemented logic), and asserts the fail-closed behavior AND the new
 * F-007 warnings survive future changes without needing a human to re-run the manual rehearsal.
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { main as importMain } from '../import-data/cli';
import { main as projectPublicDataMain } from './cli';
import { main as stagePublicPortfolioMain } from './stage_public_portfolio_bundle';

const repoRoot = resolve(__dirname, '..', '..');
const pilotDir = join(repoRoot, 'data-templates', 'pilot', 'phase7-integration-rehearsal');
const sourceRegistryPath = join(pilotDir, 'source-registry.json');
const publicationDecisionsPath = join(pilotDir, 'publication-decisions.pilot.json');
const approvalReceiptPath = join(pilotDir, 'approval-receipt.pilot.json');

let workDir: string;

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), 'phase8-pilot-rehearsal-'));
});

afterEach(() => {
  delete process.env.STAGE_PUBLIC_TARGET_PATH_OVERRIDE;
  delete process.env.STAGE_PUBLIC_MANIFEST_TARGET_PATH_OVERRIDE;
  rmSync(workDir, { recursive: true, force: true });
});

async function runImport(outputDir: string): Promise<number> {
  return importMain([
    '--input',
    pilotDir,
    '--output',
    outputDir,
    '--as-of',
    '2026-07-29T00:00:00.000Z',
    '--strict',
    '--source-registry',
    sourceRegistryPath,
  ]);
}

describe('Phase 7 pilot rehearsal — automated regression (Phase 8, F-009)', () => {
  it('import -> projection with --require-publication-decisions excludes the record marked excluded', async () => {
    const importOutputDir = join(workDir, 'import');
    const projectionOutputDir = join(workDir, 'public');
    expect(await runImport(importOutputDir)).toBe(0);

    const exitCode = await projectPublicDataMain([
      '--input',
      join(importOutputDir, 'project-portfolio.bundle.json'),
      '--output',
      projectionOutputDir,
      '--publication-decisions',
      publicationDecisionsPath,
      '--require-publication-decisions',
    ]);
    expect(exitCode).toBe(0);

    const bundle = JSON.parse(
      readFileSync(join(projectionOutputDir, 'project-portfolio.public.bundle.json'), 'utf8'),
    );
    const projectIds = bundle.datasets.projects.map((p: { id: string }) => p.id);
    expect(projectIds).toEqual(['pilot-proj-001', 'pilot-proj-002', 'pilot-proj-003']);
    expect(projectIds).not.toContain('pilot-proj-004');
  });

  it('F-007 regression guard: projection WITHOUT --require-publication-decisions warns and re-includes the excluded record', async () => {
    const importOutputDir = join(workDir, 'import');
    const projectionOutputDir = join(workDir, 'public-noflag');
    expect(await runImport(importOutputDir)).toBe(0);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const exitCode = await projectPublicDataMain([
      '--input',
      join(importOutputDir, 'project-portfolio.bundle.json'),
      '--output',
      projectionOutputDir,
    ]);
    expect(exitCode).toBe(0);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('--require-publication-decisions'),
    );
    warnSpy.mockRestore();

    const bundle = JSON.parse(
      readFileSync(join(projectionOutputDir, 'project-portfolio.public.bundle.json'), 'utf8'),
    );
    const projectIds = bundle.datasets.projects.map((p: { id: string }) => p.id);
    expect(projectIds).toContain('pilot-proj-004');
  });

  it('staging with a matching approval receipt succeeds under --require-approval-receipt', async () => {
    const importOutputDir = join(workDir, 'import');
    const projectionOutputDir = join(workDir, 'public');
    expect(await runImport(importOutputDir)).toBe(0);
    expect(
      await projectPublicDataMain([
        '--input',
        join(importOutputDir, 'project-portfolio.bundle.json'),
        '--output',
        projectionOutputDir,
        '--publication-decisions',
        publicationDecisionsPath,
        '--require-publication-decisions',
      ]),
    ).toBe(0);

    const stagedBundlePath = join(workDir, 'staged-bundle.json');
    const stagedManifestPath = join(workDir, 'staged-manifest.json');
    process.env.STAGE_PUBLIC_TARGET_PATH_OVERRIDE = stagedBundlePath;
    process.env.STAGE_PUBLIC_MANIFEST_TARGET_PATH_OVERRIDE = stagedManifestPath;

    const exitCode = await stagePublicPortfolioMain([
      '--input',
      projectionOutputDir,
      '--approval-receipt',
      approvalReceiptPath,
      '--require-approval-receipt',
    ]);
    expect(exitCode).toBe(0);
    expect(readFileSync(stagedBundlePath, 'utf8')).toContain('pilot-proj-001');
  });

  it('staging is refused when the approval receipt checksum does not match the freshly generated manifest', async () => {
    // The committed approval-receipt.pilot.json is bound to a specific historical run's checksums —
    // re-running the pipeline with a fresh generatedAt still yields the SAME projectedContentChecksum
    // (determinism), so to prove mismatch-detection we tamper with the receipt's checksum instead of
    // relying on drift, which would be flaky.
    const importOutputDir = join(workDir, 'import');
    const projectionOutputDir = join(workDir, 'public');
    expect(await runImport(importOutputDir)).toBe(0);
    expect(
      await projectPublicDataMain([
        '--input',
        join(importOutputDir, 'project-portfolio.bundle.json'),
        '--output',
        projectionOutputDir,
        '--publication-decisions',
        publicationDecisionsPath,
        '--require-publication-decisions',
      ]),
    ).toBe(0);

    const tamperedReceipt = {
      ...JSON.parse(readFileSync(approvalReceiptPath, 'utf8')),
      projectedContentChecksum: 'tampered-checksum',
    };
    const tamperedReceiptPath = join(workDir, 'tampered-receipt.json');
    writeFileSync(tamperedReceiptPath, JSON.stringify(tamperedReceipt));

    const stagedBundlePath = join(workDir, 'staged-bundle.json');
    process.env.STAGE_PUBLIC_TARGET_PATH_OVERRIDE = stagedBundlePath;
    process.env.STAGE_PUBLIC_MANIFEST_TARGET_PATH_OVERRIDE = join(workDir, 'staged-manifest.json');

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exitCode = await stagePublicPortfolioMain([
      '--input',
      projectionOutputDir,
      '--approval-receipt',
      tamperedReceiptPath,
      '--require-approval-receipt',
    ]);
    expect(exitCode).toBe(1);
    errorSpy.mockRestore();
    expect(() => readFileSync(stagedBundlePath, 'utf8')).toThrow();
  });

  it('F-007 regression guard: staging WITHOUT any approval-receipt flag warns but still stages (demo/fixture path preserved)', async () => {
    const importOutputDir = join(workDir, 'import');
    const projectionOutputDir = join(workDir, 'public-noflag');
    expect(await runImport(importOutputDir)).toBe(0);
    expect(
      await projectPublicDataMain([
        '--input',
        join(importOutputDir, 'project-portfolio.bundle.json'),
        '--output',
        projectionOutputDir,
      ]),
    ).toBe(0);

    const stagedBundlePath = join(workDir, 'staged-bundle.json');
    process.env.STAGE_PUBLIC_TARGET_PATH_OVERRIDE = stagedBundlePath;
    process.env.STAGE_PUBLIC_MANIFEST_TARGET_PATH_OVERRIDE = join(workDir, 'staged-manifest.json');

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const exitCode = await stagePublicPortfolioMain(['--input', projectionOutputDir]);
    expect(exitCode).toBe(0);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('không có approval receipt'));
    warnSpy.mockRestore();
    expect(readFileSync(stagedBundlePath, 'utf8')).toContain('pilot-proj-001');
  });
});
