import { describe, expect, it } from 'vitest';
import type { ProjectBundle } from '../types';
import { runDataQualityRules } from './dataQualityRules';

function bundle(
  overrides: Partial<ProjectBundle['project']> = {},
  extra: Partial<ProjectBundle> = {},
): ProjectBundle {
  return {
    project: {
      id: 'prj-1',
      code: 'DL-1',
      name: 'Dự án 1',
      description: 'x',
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
    },
    workPackages: [],
    milestones: [],
    issues: [],
    progressSnapshots: [],
    ...extra,
  };
}

const context = {
  validAdministrativeCodes: new Set(['24133']),
  asOf: new Date('2026-07-23T00:00:00.000Z'),
};

describe('runDataQualityRules', () => {
  it('returns no issues for a clean bundle', () => {
    expect(runDataQualityRules([bundle()], context)).toEqual([]);
  });

  it('flags an administrative code that does not exist', () => {
    const issues = runDataQualityRules([bundle({ administrativeAreaCodes: ['99999'] })], context);
    expect(issues.some((i) => i.rule === 'unmapped-administrative-code')).toBe(true);
  });

  it('flags duplicate project ids across the bundle set', () => {
    const issues = runDataQualityRules([bundle(), bundle()], context);
    expect(
      issues.some((i) => i.rule === 'duplicate-primary-key' && i.entityType === 'project'),
    ).toBe(true);
  });

  it('flags a work package referencing a project that does not exist', () => {
    const issues = runDataQualityRules(
      [
        bundle(
          {},
          {
            workPackages: [
              {
                id: 'wp-1',
                projectId: 'does-not-exist',
                code: 'WP',
                name: 'x',
                plannedStart: '2026-01-01',
                plannedEnd: '2026-06-30',
                plannedProgress: 0,
                actualProgress: 0,
                budget: 1,
                paidAmount: 0,
                status: 'planned',
              },
            ],
          },
        ),
      ],
      context,
    );
    expect(
      issues.some((i) => i.rule === 'dangling-project-reference' && i.entityType === 'workPackage'),
    ).toBe(true);
  });

  it('flags a milestone referencing a project that does not exist', () => {
    const issues = runDataQualityRules(
      [
        bundle(
          {},
          {
            milestones: [
              {
                id: 'ms-1',
                projectId: 'does-not-exist',
                name: 'x',
                plannedDate: '2026-06-30',
                critical: false,
                status: 'planned',
              },
            ],
          },
        ),
      ],
      context,
    );
    expect(
      issues.some((i) => i.rule === 'dangling-project-reference' && i.entityType === 'milestone'),
    ).toBe(true);
  });

  it('flags stale data past the freshness SLA', () => {
    const issues = runDataQualityRules([bundle({ dataUpdatedAt: '2025-01-01T00:00:00.000Z' })], {
      ...context,
      freshnessSlaMs: 90 * 24 * 60 * 60 * 1000,
    });
    expect(issues.some((i) => i.rule === 'stale-data')).toBe(true);
  });

  it('does not flag stale data within the freshness SLA', () => {
    const issues = runDataQualityRules(
      [bundle({ dataUpdatedAt: '2026-07-20T00:00:00.000Z' })],
      context,
    );
    expect(issues.some((i) => i.rule === 'stale-data')).toBe(false);
  });

  const baseSnapshot = {
    projectId: 'prj-1',
    observedAt: '2026-06-01T00:00:00.000Z',
    plannedPhysicalProgress: 50,
    physicalProgress: 50,
    financialProgress: 50,
    disbursedAmount: 1000,
    sourceDatasetId: 'ds-progress',
    importedAt: '2026-06-02T00:00:00.000Z',
  } as const;

  it('flags an exact duplicate progress snapshot (same identity and sourceRecordId) as an error', () => {
    const issues = runDataQualityRules(
      [
        bundle(
          {},
          {
            progressSnapshots: [
              { ...baseSnapshot, sourceRecordId: 'rec-1', verificationStatus: 'raw' },
              { ...baseSnapshot, sourceRecordId: 'rec-1', verificationStatus: 'raw' },
            ],
          },
        ),
      ],
      context,
    );
    const duplicate = issues.find(
      (i) => i.entityType === 'progressSnapshot' && i.rule === 'duplicate-primary-key',
    );
    expect(duplicate?.severity).toBe('error');
  });

  it('flags same-identity, different-sourceRecordId snapshots as a warning, not an error', () => {
    const issues = runDataQualityRules(
      [
        bundle(
          {},
          {
            progressSnapshots: [
              { ...baseSnapshot, sourceRecordId: 'rec-raw', verificationStatus: 'raw' },
              { ...baseSnapshot, sourceRecordId: 'rec-approved', verificationStatus: 'approved' },
            ],
          },
        ),
      ],
      context,
    );
    const multiStage = issues.find(
      (i) =>
        i.entityType === 'progressSnapshot' && i.rule === 'multiple-verification-stage-records',
    );
    expect(multiStage?.severity).toBe('warning');
    expect(issues.some((i) => i.rule === 'duplicate-primary-key')).toBe(false);
  });

  it('does not flag a single progress snapshot per identity', () => {
    const issues = runDataQualityRules(
      [
        bundle(
          {},
          {
            progressSnapshots: [
              { ...baseSnapshot, sourceRecordId: 'rec-1', verificationStatus: 'approved' },
            ],
          },
        ),
      ],
      context,
    );
    expect(issues.some((i) => i.entityType === 'progressSnapshot')).toBe(false);
  });
});
