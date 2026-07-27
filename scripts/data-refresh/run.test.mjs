import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { runDatasetRefresh } from './run.mjs';
import { SOURCE_HEALTH_ISSUE_MARKER } from './reportGen.mjs';

// Integration test: exercises the full offline pipeline (registry → compliance → recorded-fixture
// adapter → privacy scan → diff against the committed last-known-good → schema check → risk →
// manifest → report) end to end, with no network access anywhere (docs/adr/
// 0004-public-data-ingestion.md section 9). --dry-run so it never rewrites the committed
// last-known-good fixture as a side effect of running the test suite.
describe('runDatasetRefresh (offline, recorded fixture)', () => {
  const DATASET_ID = 'investment-opportunities-daklak-illustrative';

  it('runs the whole pipeline without throwing and without any network access', () => {
    const result = runDatasetRefresh({ datasetId: DATASET_ID, dryRun: true });
    expect(['success', 'no-change', 'review-required']).toContain(result.runStatus);
    expect(['low-risk', 'hard-stop']).toContain(result.riskLevel);
  });

  it('produces a PR report and a source-health issue body', () => {
    const result = runDatasetRefresh({ datasetId: DATASET_ID, dryRun: true });
    expect(result.prMarkdown).toContain(DATASET_ID);
    expect(result.issueBody.startsWith(SOURCE_HEALTH_ISSUE_MARKER)).toBe(true);
  });

  it('throws a clear error for an unregistered datasetId', () => {
    expect(() => runDatasetRefresh({ datasetId: 'does-not-exist', dryRun: true })).toThrow(
      /no source-registry entry/,
    );
  });

  it('writes run-report.json and run-report.md to reports/data-refresh/', () => {
    runDatasetRefresh({ datasetId: DATASET_ID, dryRun: true });
    expect(existsSync(`reports/data-refresh/${DATASET_ID}.run-report.json`)).toBe(true);
    expect(existsSync(`reports/data-refresh/${DATASET_ID}.run-report.md`)).toBe(true);
    const report = JSON.parse(
      readFileSync(`reports/data-refresh/${DATASET_ID}.run-report.json`, 'utf8'),
    );
    expect(report.manifest.datasetId).toBe(DATASET_ID);
  });

  it('a dry run never modifies the committed last-known-good file', () => {
    const path = `reports/data-refresh/last-known-good/${DATASET_ID}.json`;
    const before = readFileSync(path, 'utf8');
    runDatasetRefresh({ datasetId: DATASET_ID, dryRun: true });
    const after = readFileSync(path, 'utf8');
    expect(after).toBe(before);
  });

  it('a dry run never touches the generated source-health snapshot', () => {
    const canonicalPath = 'data/published/source-health.json';
    const bundledPath = 'src/assets/data/data-refresh-source-health.json';
    const canonicalBefore = readFileSync(canonicalPath, 'utf8');
    const bundledBefore = readFileSync(bundledPath, 'utf8');
    runDatasetRefresh({ datasetId: DATASET_ID, dryRun: true });
    expect(readFileSync(canonicalPath, 'utf8')).toBe(canonicalBefore);
    expect(readFileSync(bundledPath, 'utf8')).toBe(bundledBefore);
  });

  it('the recorded fixture (maturity: experimental) is never auto-merge eligible, even on a clean low-risk run', () => {
    const result = runDatasetRefresh({ datasetId: DATASET_ID, dryRun: true });
    expect(result.riskLevel).toBe('low-risk');
    expect(result.autoMergeEligible).toBe(false);
  });

  it('writes a machine-readable reports/data-refresh/run-result.json for the workflow to read', () => {
    runDatasetRefresh({ datasetId: DATASET_ID, dryRun: true });
    const result = JSON.parse(readFileSync('reports/data-refresh/run-result.json', 'utf8'));
    expect(result.datasetId).toBe(DATASET_ID);
    expect(['low-risk', 'hard-stop']).toContain(result.riskLevel);
    expect(typeof result.autoMergeEligible).toBe('boolean');
    expect(typeof result.hasLastKnownGoodChange).toBe('boolean');
    expect(result.dryRun).toBe(true);
  });

  it('the PR report mentions the owner and explains why manual review is required for a non-eligible maturity', () => {
    const result = runDatasetRefresh({ datasetId: DATASET_ID, dryRun: true });
    expect(result.prMarkdown).toContain('@shadowhunter67');
    expect(result.prMarkdown).toContain('Manual review required');
  });
});
