import { describe, expect, it } from 'vitest';
import { calculateDataHealthScore } from './dataHealthScore';
import type { DataHealthSummary } from './executiveOverviewTypes';

const health: DataHealthSummary = {
  totalProjects: 10,
  validProjects: 9,
  invalidProjects: 1,
  staleProjectCount: 2,
  duplicateRecordCount: 1,
  unmappedAdministrativeCodeCount: 0,
  missingRequiredFieldIssueCount: 1,
  totalDataQualityIssues: 4,
  sourceAvailable: true,
  calculatedAt: '2026-01-01T00:00:00Z',
  confidenceBreakdown: { verified: 4, high: 3, medium: 1, low: 1, unknown: 1 },
};

describe('calculateDataHealthScore', () => {
  it('averages completeness, freshness, consistency and traceability', () => {
    const result = calculateDataHealthScore(health);
    expect(result.metrics).toHaveLength(4);
    expect(result.score).toBe(85);
  });

  it('does not invent traceability when there is no confidence data', () => {
    expect(
      calculateDataHealthScore({
        ...health,
        confidenceBreakdown: { verified: 0, high: 0, medium: 0, low: 0, unknown: 0 },
      }).metrics,
    ).toHaveLength(3);
  });
});
