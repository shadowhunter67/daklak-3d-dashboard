import { describe, expect, it } from 'vitest';
import type { Milestone, Project, ProjectIssue, ProgressSnapshot, WorkPackage } from '../types';
import {
  isValidProjectGeometry,
  validateMilestoneRecord,
  validateProgressSnapshotRecord,
  validateProjectIssueRecord,
  validateProjectRecord,
  validateWorkPackageRecord,
} from './validateProject';

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'prj-x',
    code: 'DL-X',
    name: 'Dự án X',
    description: 'mô tả',
    sector: 'transport',
    status: 'active',
    priority: 'medium',
    managingAuthorityId: 'agency-a',
    investorId: 'agency-b',
    approvedBudget: 100,
    disbursedAmount: 50,
    overallProgress: 40,
    plannedProgress: 45,
    financialProgress: 42,
    administrativeAreaCodes: ['24133'],
    dataUpdatedAt: '2026-07-01T00:00:00.000Z',
    dataOwner: 'owner',
    sourceDatasetId: 'ds-x',
    confidence: 'medium',
    verificationStatus: 'reviewed',
    ...overrides,
  };
}

function makeWorkPackage(overrides: Partial<WorkPackage> = {}): WorkPackage {
  return {
    id: 'wp-x',
    projectId: 'prj-x',
    code: 'WP-01',
    name: 'Gói thầu 1',
    plannedStart: '2026-01-01',
    plannedEnd: '2026-06-30',
    plannedProgress: 40,
    actualProgress: 40,
    budget: 100,
    paidAmount: 40,
    status: 'active',
    ...overrides,
  };
}

describe('validateProjectRecord', () => {
  it('accepts a well-formed project', () => {
    expect(validateProjectRecord(makeProject())).toEqual([]);
  });

  it('rejects progress values outside 0-100', () => {
    const errors = validateProjectRecord(makeProject({ overallProgress: 140 }));
    expect(errors.some((e) => e.includes('overallProgress'))).toBe(true);
  });

  it('rejects disbursedAmount exceeding the effective budget ceiling', () => {
    const errors = validateProjectRecord(
      makeProject({ approvedBudget: 100, disbursedAmount: 150 }),
    );
    expect(errors.some((e) => e.includes('disbursedAmount'))).toBe(true);
  });

  it('prefers adjustedBudget over approvedBudget as the ceiling', () => {
    const errors = validateProjectRecord(
      makeProject({ approvedBudget: 100, adjustedBudget: 200, disbursedAmount: 150 }),
    );
    expect(errors).toEqual([]);
  });

  it('rejects an invalid status/sector/priority', () => {
    const errors = validateProjectRecord(makeProject({ status: 'bogus' as Project['status'] }));
    expect(errors.some((e) => e.includes('status'))).toBe(true);
  });

  it('rejects plannedCompletionDate before startDate', () => {
    const errors = validateProjectRecord(
      makeProject({ startDate: '2026-06-01', plannedCompletionDate: '2026-01-01' }),
    );
    expect(errors.some((e) => e.includes('plannedCompletionDate'))).toBe(true);
  });

  it('requires at least one administrative area code', () => {
    const errors = validateProjectRecord(makeProject({ administrativeAreaCodes: [] }));
    expect(errors.some((e) => e.includes('administrativeAreaCodes'))).toBe(true);
  });
});

describe('validateWorkPackageRecord', () => {
  it('accepts a well-formed work package', () => {
    expect(validateWorkPackageRecord(makeWorkPackage())).toEqual([]);
  });

  it('rejects plannedEnd before plannedStart', () => {
    const errors = validateWorkPackageRecord(
      makeWorkPackage({ plannedStart: '2026-06-30', plannedEnd: '2026-01-01' }),
    );
    expect(errors.some((e) => e.includes('plannedEnd'))).toBe(true);
  });

  it('rejects actualEnd before actualStart', () => {
    const errors = validateWorkPackageRecord(
      makeWorkPackage({ actualStart: '2026-06-30', actualEnd: '2026-01-01' }),
    );
    expect(errors.some((e) => e.includes('actualEnd'))).toBe(true);
  });

  it('rejects paidAmount exceeding budget', () => {
    const errors = validateWorkPackageRecord(makeWorkPackage({ budget: 100, paidAmount: 150 }));
    expect(errors.some((e) => e.includes('paidAmount'))).toBe(true);
  });
});

describe('validateMilestoneRecord', () => {
  it('accepts a well-formed milestone', () => {
    const milestone: Milestone = {
      id: 'ms-x',
      projectId: 'prj-x',
      name: 'Mốc 1',
      plannedDate: '2026-06-30',
      critical: true,
      status: 'planned',
    };
    expect(validateMilestoneRecord(milestone)).toEqual([]);
  });
});

describe('validateProjectIssueRecord', () => {
  it('rejects resolvedAt set while status is still open', () => {
    const issue: ProjectIssue = {
      id: 'is-x',
      projectId: 'prj-x',
      category: 'other',
      severity: 'low',
      title: 'x',
      description: 'x',
      openedAt: '2026-01-01T00:00:00.000Z',
      resolvedAt: '2026-02-01T00:00:00.000Z',
      status: 'open',
      evidenceIds: [],
    };
    expect(validateProjectIssueRecord(issue).some((e) => e.includes('resolvedAt'))).toBe(true);
  });
});

describe('validateProgressSnapshotRecord', () => {
  it('rejects out-of-range progress fields', () => {
    const snapshot: ProgressSnapshot = {
      projectId: 'prj-x',
      observedAt: '2026-07-01T00:00:00.000Z',
      plannedPhysicalProgress: 50,
      physicalProgress: -5,
      financialProgress: 50,
      disbursedAmount: 10,
      sourceDatasetId: 'ds-x',
      sourceRecordId: 'rec-1',
      importedAt: '2026-07-02T00:00:00.000Z',
      verificationStatus: 'raw',
    };
    expect(
      validateProgressSnapshotRecord(snapshot).some((e) => e.includes('physicalProgress')),
    ).toBe(true);
  });
});

describe('isValidProjectGeometry', () => {
  it('accepts a valid point', () => {
    expect(isValidProjectGeometry({ type: 'Point', coordinates: [108.0, 12.6] })).toEqual([]);
  });

  it('rejects an out-of-range point', () => {
    expect(
      isValidProjectGeometry({ type: 'Point', coordinates: [500, 12.6] }).length,
    ).toBeGreaterThan(0);
  });

  it('rejects an unclosed polygon ring', () => {
    const errors = isValidProjectGeometry({
      type: 'Polygon',
      coordinates: [
        [
          [108, 12],
          [108.1, 12],
          [108.1, 12.1],
          [108, 12.05],
        ],
      ],
    });
    expect(errors.some((e) => e.includes('không khép kín'))).toBe(true);
  });
});
