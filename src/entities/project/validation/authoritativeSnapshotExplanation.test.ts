import { describe, expect, it } from 'vitest';
import type { ProgressSnapshot } from '../types';
import { explainLatestAuthoritativeSnapshot } from './authoritativeSnapshotExplanation';

function snapshot(overrides: Partial<ProgressSnapshot>): ProgressSnapshot {
  return {
    projectId: 'project-1',
    observedAt: '2026-01-01T00:00:00.000Z',
    plannedPhysicalProgress: 20,
    physicalProgress: 20,
    financialProgress: 20,
    disbursedAmount: 1000,
    sourceDatasetId: 'source-a',
    sourceRecordId: 'row-1',
    importedAt: '2026-01-02T00:00:00.000Z',
    verificationStatus: 'approved',
    ...overrides,
  };
}

describe('explainLatestAuthoritativeSnapshot', () => {
  it('returns an empty explanation when there is no snapshot', () => {
    const result = explainLatestAuthoritativeSnapshot([]);
    expect(result.selectedSnapshot).toBeNull();
    expect(result.selectedReason).toBeNull();
    expect(result.competingSnapshots).toEqual([]);
    expect(result.affectedKpis).toEqual([]);
  });

  it('explains a single snapshot as selected', () => {
    const s = snapshot({});
    const result = explainLatestAuthoritativeSnapshot([s]);
    expect(result.selectedSnapshot).toBe(s);
    expect(result.competingSnapshots).toHaveLength(1);
    expect(result.competingSnapshots[0].selected).toBe(true);
    expect(result.affectedKpis.length).toBeGreaterThan(0);
    expect(result.selectedReason).toEqual({
      code: 'highest-verification-priority',
      verificationStatus: 'approved',
      competingCount: 1,
    });
  });

  it('explains multiple verification stages for the same observation, picking the highest priority', () => {
    const raw = snapshot({
      verificationStatus: 'raw',
      sourceRecordId: 'row-1',
      importedAt: '2026-01-01T00:00:00.000Z',
    });
    const approved = snapshot({
      verificationStatus: 'approved',
      sourceRecordId: 'row-2',
      importedAt: '2026-01-03T00:00:00.000Z',
    });
    const result = explainLatestAuthoritativeSnapshot([raw, approved]);
    expect(result.selectedSnapshot).toBe(approved);
    expect(result.competingSnapshots).toHaveLength(2);
    const rawEntry = result.competingSnapshots.find((c) => c.snapshot === raw);
    expect(rawEntry?.selected).toBe(false);
    expect(rawEntry?.exclusionReason).toEqual({ code: 'lower-priority' });
  });

  it('explains a rejected-only observation as having no selected snapshot', () => {
    const rejected = snapshot({ verificationStatus: 'rejected' });
    const result = explainLatestAuthoritativeSnapshot([rejected]);
    expect(result.selectedSnapshot).toBeNull();
    expect(result.selectedReason).toBeNull();
    expect(result.competingSnapshots[0].exclusionReason).toEqual({ code: 'rejected' });
    expect(result.affectedKpis).toEqual([]);
  });

  it('explains a superseded-only observation as having no selected snapshot', () => {
    const superseded = snapshot({ verificationStatus: 'superseded' });
    const result = explainLatestAuthoritativeSnapshot([superseded]);
    expect(result.selectedSnapshot).toBeNull();
    expect(result.competingSnapshots[0].exclusionReason).toEqual({ code: 'superseded' });
  });

  it('picks the most recent observedAt as the explained identity, and lists the others separately', () => {
    const older = snapshot({ observedAt: '2026-01-01T00:00:00.000Z', sourceRecordId: 'row-old' });
    const newer = snapshot({ observedAt: '2026-02-01T00:00:00.000Z', sourceRecordId: 'row-new' });
    const result = explainLatestAuthoritativeSnapshot([older, newer]);
    expect(result.observedAt).toBe('2026-02-01T00:00:00.000Z');
    expect(result.selectedSnapshot).toBe(newer);
    expect(result.otherObservationDates).toEqual(['2026-01-01T00:00:00.000Z']);
  });

  it('is deterministic when tie-broken by sourceRecordId at equal priority and importedAt', () => {
    const a = snapshot({ sourceRecordId: 'row-a', importedAt: '2026-01-02T00:00:00.000Z' });
    const b = snapshot({ sourceRecordId: 'row-b', importedAt: '2026-01-02T00:00:00.000Z' });
    const result = explainLatestAuthoritativeSnapshot([b, a]);
    expect(result.selectedSnapshot?.sourceRecordId).toBe('row-a');
  });
});
