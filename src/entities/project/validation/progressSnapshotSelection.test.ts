import { describe, expect, it } from 'vitest';
import type { ProgressSnapshot } from '../types';
import {
  groupSnapshotsByIdentity,
  isUsableForKpi,
  progressSnapshotIdentityKey,
  selectAuthoritativeSnapshot,
  selectAuthoritativeSnapshots,
} from './progressSnapshotSelection';

function makeSnapshot(overrides: Partial<ProgressSnapshot> = {}): ProgressSnapshot {
  return {
    projectId: 'prj-1',
    observedAt: '2026-07-01T00:00:00.000Z',
    plannedPhysicalProgress: 50,
    physicalProgress: 50,
    financialProgress: 50,
    disbursedAmount: 1000,
    sourceDatasetId: 'ds-progress',
    sourceRecordId: 'rec-1',
    importedAt: '2026-07-02T00:00:00.000Z',
    verificationStatus: 'raw',
    ...overrides,
  };
}

describe('progressSnapshotIdentityKey', () => {
  it('is built from projectId + observedAt + sourceDatasetId (not sourceRecordId)', () => {
    const a = makeSnapshot({ sourceRecordId: 'rec-a' });
    const b = makeSnapshot({ sourceRecordId: 'rec-b' });
    expect(progressSnapshotIdentityKey(a)).toBe(progressSnapshotIdentityKey(b));
  });
});

describe('isUsableForKpi', () => {
  it('excludes superseded and rejected', () => {
    expect(isUsableForKpi('superseded')).toBe(false);
    expect(isUsableForKpi('rejected')).toBe(false);
  });

  it('includes every other verification status', () => {
    for (const status of [
      'raw',
      'validated-automatically',
      'submitted',
      'reviewed',
      'approved',
    ] as const) {
      expect(isUsableForKpi(status)).toBe(true);
    }
  });
});

describe('selectAuthoritativeSnapshot', () => {
  it('prefers approved over reviewed over submitted over validated-automatically over raw', () => {
    const raw = makeSnapshot({ sourceRecordId: 'rec-raw', verificationStatus: 'raw' });
    const reviewed = makeSnapshot({
      sourceRecordId: 'rec-reviewed',
      verificationStatus: 'reviewed',
    });
    const approved = makeSnapshot({
      sourceRecordId: 'rec-approved',
      verificationStatus: 'approved',
    });
    expect(selectAuthoritativeSnapshot([raw, reviewed, approved])?.sourceRecordId).toBe(
      'rec-approved',
    );
    expect(selectAuthoritativeSnapshot([raw, reviewed])?.sourceRecordId).toBe('rec-reviewed');
  });

  it('never selects a superseded or rejected record when a usable one exists', () => {
    const superseded = makeSnapshot({
      sourceRecordId: 'rec-old',
      verificationStatus: 'superseded',
    });
    const raw = makeSnapshot({ sourceRecordId: 'rec-new', verificationStatus: 'raw' });
    expect(selectAuthoritativeSnapshot([superseded, raw])?.sourceRecordId).toBe('rec-new');
  });

  it('returns null when every record in the group is superseded or rejected', () => {
    const superseded = makeSnapshot({ sourceRecordId: 'rec-1', verificationStatus: 'superseded' });
    const rejected = makeSnapshot({ sourceRecordId: 'rec-2', verificationStatus: 'rejected' });
    expect(selectAuthoritativeSnapshot([superseded, rejected])).toBeNull();
  });

  it('breaks ties at equal priority by the most recently imported record', () => {
    const older = makeSnapshot({
      sourceRecordId: 'rec-a',
      verificationStatus: 'reviewed',
      importedAt: '2026-07-01T00:00:00.000Z',
    });
    const newer = makeSnapshot({
      sourceRecordId: 'rec-b',
      verificationStatus: 'reviewed',
      importedAt: '2026-07-05T00:00:00.000Z',
    });
    expect(selectAuthoritativeSnapshot([older, newer])?.sourceRecordId).toBe('rec-b');
  });

  it('is deterministic for a single-record group regardless of call order', () => {
    const only = makeSnapshot();
    expect(selectAuthoritativeSnapshot([only])).toBe(only);
  });
});

describe('groupSnapshotsByIdentity / selectAuthoritativeSnapshots', () => {
  it('groups by identity and selects one authoritative record per group', () => {
    const groupA = [
      makeSnapshot({
        observedAt: '2026-06-01T00:00:00.000Z',
        sourceRecordId: 'a-raw',
        verificationStatus: 'raw',
      }),
      makeSnapshot({
        observedAt: '2026-06-01T00:00:00.000Z',
        sourceRecordId: 'a-approved',
        verificationStatus: 'approved',
      }),
    ];
    const groupB = [
      makeSnapshot({ observedAt: '2026-07-01T00:00:00.000Z', sourceRecordId: 'b-only' }),
    ];
    const groups = groupSnapshotsByIdentity([...groupA, ...groupB]);
    expect(groups.size).toBe(2);

    const selected = selectAuthoritativeSnapshots([...groupA, ...groupB]);
    expect(selected).toHaveLength(2);
    expect(selected.map((s) => s.sourceRecordId).sort()).toEqual(['a-approved', 'b-only']);
  });
});
