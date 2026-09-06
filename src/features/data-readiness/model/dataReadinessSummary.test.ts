import { describe, expect, it } from 'vitest';
import { buildDataReadinessSummary } from './dataReadinessSummary';
import type { DataReadinessModel } from './dataReadinessTypes';

function baseModel(overrides: Partial<DataReadinessModel> = {}): DataReadinessModel {
  return {
    metadata: {
      sourceId: 'x',
      sourceKind: 'generated-json',
      displayName: 'x',
      datasetIds: ['a', 'b', 'c'],
      schemaVersion: '1',
      bundleVersion: '1',
      asOf: null,
      generatedAt: null,
      isIllustrative: true,
      deploymentCompatibility: [],
    },
    asOf: '2026-07-23T00:00:00.000Z',
    counts: { projects: 15, workPackages: 10, milestones: 10, issues: 5, progressSnapshots: 13 },
    validationErrors: [],
    dataQualityIssues: [],
    businessAlerts: [],
    staleProjectCount: 0,
    duplicateRecordCount: 0,
    unmappedAdministrativeCodeCount: 0,
    lowConfidenceProjectCount: 0,
    unverifiedProjectCount: 0,
    missingProvenanceChildCount: 0,
    ...overrides,
  };
}

describe('buildDataReadinessSummary', () => {
  it('reports "good" for a clean model with no structural errors or quality concerns', () => {
    const summary = buildDataReadinessSummary(baseModel());
    expect(summary.status).toBe('good');
  });

  it('reports "critical" whenever there is at least one structural validation error, regardless of anything else', () => {
    const summary = buildDataReadinessSummary(
      baseModel({ validationErrors: ['Project x thiếu code'] }),
    );
    expect(summary.status).toBe('critical');
  });

  it('reports "attention" (not "critical") for a quality concern with zero structural errors', () => {
    const summary = buildDataReadinessSummary(baseModel({ staleProjectCount: 2 }));
    expect(summary.status).toBe('attention');
  });

  it('never fabricates a numeric score — only exposes the real counts it was given', () => {
    const summary = buildDataReadinessSummary(
      baseModel({ staleProjectCount: 2, duplicateRecordCount: 1, missingProvenanceChildCount: 20 }),
    );
    expect(summary.freshness.staleCount).toBe(2);
    expect(summary.consistency.duplicateCount).toBe(1);
    expect(summary.provenance.missingCount).toBe(20);
    expect(summary.activeDatasetCount).toBe(3);
    expect('score' in summary).toBe(false);
  });

  it('sums every record-count category for the completeness card total', () => {
    const summary = buildDataReadinessSummary(baseModel());
    expect(summary.completeness.totalRecordCount).toBe(15 + 10 + 10 + 5 + 13);
  });
});
