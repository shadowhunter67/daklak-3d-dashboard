import { describe, expect, it } from 'vitest';
import type { CanonicalProjectPortfolioDatasets } from './canonicalBundle';
import { groupCanonicalDatasetsIntoProjectBundles } from './canonicalBundleMapper';
import type { Milestone, Project, ProjectIssue, ProgressSnapshot, WorkPackage } from './types';

function project(id: string): Project {
  return {
    id,
    code: id.toUpperCase(),
    name: `Project ${id}`,
    description: 'test',
    sector: 'transport',
    status: 'active',
    priority: 'medium',
    managingAuthorityId: 'agency-a',
    investorId: 'agency-a',
    approvedBudget: 100,
    disbursedAmount: 10,
    overallProgress: 10,
    plannedProgress: 10,
    financialProgress: 10,
    administrativeAreaCodes: ['22165'],
    dataUpdatedAt: '2026-07-01T00:00:00.000Z',
    dataOwner: 'test',
    sourceDatasetId: 'ds-x',
    confidence: 'medium',
    verificationStatus: 'reviewed',
  };
}

function datasets(
  overrides: Partial<CanonicalProjectPortfolioDatasets>,
): CanonicalProjectPortfolioDatasets {
  return {
    agencies: [],
    contractors: [],
    projects: [],
    workPackages: [],
    milestones: [],
    projectIssues: [],
    progressSnapshots: [],
    evidence: [],
    referenceDocuments: [],
    ...overrides,
  };
}

describe('groupCanonicalDatasetsIntoProjectBundles', () => {
  it('groups each dataset-oriented array back onto the project it belongs to', () => {
    const wpA: WorkPackage = {
      id: 'wp-a',
      projectId: 'prj-a',
      code: 'WP-A',
      name: 'WP A',
      plannedStart: '2026-01-01',
      plannedEnd: '2026-06-01',
      plannedProgress: 10,
      actualProgress: 10,
      budget: 10,
      paidAmount: 1,
      status: 'active',
    };
    const msA: Milestone = {
      id: 'ms-a',
      projectId: 'prj-a',
      name: 'MS A',
      plannedDate: '2026-03-01',
      critical: false,
      status: 'planned',
    };
    const issueB: ProjectIssue = {
      id: 'iss-b',
      projectId: 'prj-b',
      category: 'other',
      severity: 'low',
      title: 'issue',
      description: 'test',
      openedAt: '2026-01-01T00:00:00.000Z',
      status: 'open',
      evidenceIds: [],
      sourceDatasetId: 'ds-x',
    };
    const snapshotA: ProgressSnapshot = {
      projectId: 'prj-a',
      observedAt: '2026-06-01T00:00:00.000Z',
      plannedPhysicalProgress: 10,
      physicalProgress: 10,
      financialProgress: 10,
      disbursedAmount: 1,
      sourceDatasetId: 'ds-x',
      sourceRecordId: 'rec-1',
      importedAt: '2026-06-01T00:00:00.000Z',
      verificationStatus: 'reviewed',
    };

    const result = groupCanonicalDatasetsIntoProjectBundles(
      datasets({
        projects: [project('prj-a'), project('prj-b')],
        workPackages: [wpA],
        milestones: [msA],
        projectIssues: [issueB],
        progressSnapshots: [snapshotA],
      }),
    );

    expect(result).toHaveLength(2);
    const bundleA = result.find((b) => b.project.id === 'prj-a');
    const bundleB = result.find((b) => b.project.id === 'prj-b');
    expect(bundleA?.workPackages).toEqual([wpA]);
    expect(bundleA?.milestones).toEqual([msA]);
    expect(bundleA?.progressSnapshots).toEqual([snapshotA]);
    expect(bundleA?.issues).toEqual([]);
    expect(bundleB?.issues).toEqual([issueB]);
    expect(bundleB?.workPackages).toEqual([]);
  });

  it('returns an empty array for an empty project list, even with orphan child records', () => {
    const result = groupCanonicalDatasetsIntoProjectBundles(
      datasets({
        projects: [],
        milestones: [
          {
            id: 'ms-orphan',
            projectId: 'prj-missing',
            name: 'Orphan',
            plannedDate: '2026-01-01',
            critical: false,
            status: 'planned',
          },
        ],
      }),
    );
    expect(result).toEqual([]);
  });
});
