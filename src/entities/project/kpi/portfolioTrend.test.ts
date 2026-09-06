import { describe, expect, it } from 'vitest';
import { portfolioDisbursementRateTrend } from './portfolioTrend';
import type { ProjectBundle } from '../types';

const ASOF = new Date('2026-07-23T00:00:00.000Z');

function bundle(
  id: string,
  approvedBudget: number,
  disbursedAmount: number,
  snapshots: Array<{ observedAt: string; disbursedAmount: number }>,
): ProjectBundle {
  return {
    project: {
      id,
      code: id,
      name: id,
      sector: 'transport',
      status: 'active',
      approvedBudget,
      disbursedAmount,
      administrativeAreaCodes: [],
      dataUpdatedAt: ASOF.toISOString(),
      sourceDatasetId: 'test',
      confidence: 'high',
    } as unknown as ProjectBundle['project'],
    workPackages: [],
    milestones: [],
    issues: [],
    progressSnapshots: snapshots.map((s, i) => ({
      projectId: id,
      observedAt: s.observedAt,
      plannedPhysicalProgress: 0,
      physicalProgress: 0,
      financialProgress: 0,
      disbursedAmount: s.disbursedAmount,
      sourceDatasetId: 'test',
      sourceRecordId: `${id}-${i}`,
      importedAt: s.observedAt,
      verificationStatus: 'reviewed',
    })),
  };
}

describe('portfolioDisbursementRateTrend', () => {
  it('is unavailable for an empty portfolio', () => {
    const result = portfolioDisbursementRateTrend([], ASOF);
    expect(result.status).toBe('unavailable');
    expect(result.deltaPercentagePoints).toBeNull();
  });

  it('computes a real positive delta when enough projects have old-enough snapshots', () => {
    const bundles = [
      bundle('a', 1000, 500, [{ observedAt: '2026-05-01T00:00:00.000Z', disbursedAmount: 300 }]),
      bundle('b', 1000, 400, [{ observedAt: '2026-05-01T00:00:00.000Z', disbursedAmount: 400 }]),
    ];
    const result = portfolioDisbursementRateTrend(bundles, ASOF);
    expect(result.status).toBe('ok');
    // current: (500+400)/2000*100=45 ; previous: (300+400)/2000*100=35 -> +10
    expect(result.deltaPercentagePoints).toBeCloseTo(10, 5);
    expect(result.comparableProjectCount).toBe(2);
  });

  it('computes a real negative delta (disbursement pace slowed)', () => {
    const bundles = [
      bundle('a', 1000, 300, [{ observedAt: '2026-05-01T00:00:00.000Z', disbursedAmount: 500 }]),
    ];
    const result = portfolioDisbursementRateTrend(bundles, ASOF);
    expect(result.status).toBe('ok');
    expect(result.deltaPercentagePoints).toBeCloseTo(-20, 5);
  });

  it('ignores a snapshot newer than the comparison window (only uses the latest ELIGIBLE one)', () => {
    const bundles = [
      bundle('a', 1000, 600, [
        { observedAt: '2026-05-01T00:00:00.000Z', disbursedAmount: 300 },
        { observedAt: '2026-07-10T00:00:00.000Z', disbursedAmount: 550 }, // after previousAsOf, must be ignored
      ]),
    ];
    const result = portfolioDisbursementRateTrend(bundles, ASOF);
    expect(result.status).toBe('ok');
    // previous should resolve to the 300 snapshot, not 550
    expect(result.deltaPercentagePoints).toBeCloseTo(30, 5);
  });

  it('is unavailable when no project has a snapshot old enough — never fabricates a delta', () => {
    const bundles = [
      bundle('a', 1000, 500, [{ observedAt: '2026-07-20T00:00:00.000Z', disbursedAmount: 480 }]),
      bundle('b', 1000, 400, []),
    ];
    const result = portfolioDisbursementRateTrend(bundles, ASOF);
    expect(result.status).toBe('unavailable');
    expect(result.deltaPercentagePoints).toBeNull();
    expect(result.comparableProjectCount).toBe(0);
  });

  it('is unavailable when the comparable subset covers less than 50% of total budget ceiling', () => {
    const bundles = [
      // covered: 100 of 1100 total => ~9%, below the 50% threshold
      bundle('small', 100, 60, [{ observedAt: '2026-05-01T00:00:00.000Z', disbursedAmount: 40 }]),
      bundle('big', 1000, 500, []),
    ];
    const result = portfolioDisbursementRateTrend(bundles, ASOF);
    expect(result.status).toBe('unavailable');
  });

  it('is deterministic for the same input', () => {
    const bundles = [
      bundle('a', 1000, 500, [{ observedAt: '2026-05-01T00:00:00.000Z', disbursedAmount: 300 }]),
    ];
    expect(portfolioDisbursementRateTrend(bundles, ASOF)).toEqual(
      portfolioDisbursementRateTrend(bundles, ASOF),
    );
  });
});
