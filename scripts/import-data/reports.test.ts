import { describe, expect, it } from 'vitest';
import { buildRejectedRecords, sortIssues } from './reports';
import type { PipelineResult } from './pipeline';
import type { ImportIssue } from './errorCodes';

function fakeResult(issues: ImportIssue[]): PipelineResult {
  return {
    resolvedFormat: 'csv',
    canonicalBundle: null,
    bundles: [],
    issues,
    blocking: issues.some((i) => i.severity === 'error'),
    sourceFiles: [],
    inputPackageChecksum: 'x',
    normalizedContentChecksum: null,
    administrativeCodeVersion: 'v1',
    administrativeCodeChecksum: 'c1',
    qualitySummary: null,
    qualityIssues: [],
  };
}

describe('sortIssues', () => {
  it('produces a stable deterministic order regardless of input order', () => {
    const a: ImportIssue = {
      code: 'domain-invalid',
      severity: 'error',
      layer: 'domain',
      dataset: 'projects',
      recordId: 'b',
      message: 'm',
    };
    const b: ImportIssue = {
      code: 'domain-invalid',
      severity: 'error',
      layer: 'domain',
      dataset: 'projects',
      recordId: 'a',
      message: 'm',
    };
    const sorted1 = sortIssues([a, b]);
    const sorted2 = sortIssues([b, a]);
    expect(sorted1).toEqual(sorted2);
    expect(sorted1[0].recordId).toBe('a');
  });
});

describe('buildRejectedRecords', () => {
  it('merges multiple issues on the same record into a single entry', () => {
    const issues: ImportIssue[] = [
      {
        code: 'field-required',
        severity: 'error',
        layer: 'transport',
        dataset: 'projects',
        recordId: 'proj-1',
        fieldPath: 'code',
        message: 'missing code',
      },
      {
        code: 'field-invalid-vnd',
        severity: 'error',
        layer: 'transport',
        dataset: 'projects',
        recordId: 'proj-1',
        fieldPath: 'approvedBudget',
        message: 'bad vnd',
      },
      {
        code: 'business-stale-data',
        severity: 'warning',
        layer: 'business',
        dataset: 'projects',
        recordId: 'proj-1',
        message: 'stale',
      },
    ];
    const rejected = buildRejectedRecords(fakeResult(issues));
    expect(rejected).toHaveLength(1);
    expect(rejected[0].errorCodes.sort()).toEqual(['field-invalid-vnd', 'field-required']);
    expect(rejected[0].fieldPaths.sort()).toEqual(['approvedBudget', 'code']);
  });

  it('never includes warning-only issues', () => {
    const issues: ImportIssue[] = [
      {
        code: 'business-stale-data',
        severity: 'warning',
        layer: 'business',
        dataset: 'projects',
        recordId: 'proj-1',
        message: 'stale',
      },
    ];
    expect(buildRejectedRecords(fakeResult(issues))).toHaveLength(0);
  });
});
