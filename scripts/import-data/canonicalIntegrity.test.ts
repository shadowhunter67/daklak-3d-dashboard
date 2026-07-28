import { describe, expect, it } from 'vitest';
import { validateCanonicalReferentialIntegrity } from './canonicalIntegrity';
import type { CanonicalProjectPortfolioDatasets } from '../../src/entities/project/canonicalBundle';

function emptyDatasets(): CanonicalProjectPortfolioDatasets {
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
  };
}

describe('validateCanonicalReferentialIntegrity', () => {
  it('flags a work package whose projectId matches no project (orphan the mapper would silently drop)', () => {
    const datasets = emptyDatasets();
    datasets.workPackages = [
      {
        id: 'wp-1',
        projectId: 'does-not-exist',
        code: 'WP-1',
        name: 'n',
        plannedStart: '2026-01-01',
        plannedEnd: '2026-02-01',
        plannedProgress: 0,
        actualProgress: 0,
        budget: 0,
        paidAmount: 0,
        status: 'planned',
      },
    ];
    const issues = validateCanonicalReferentialIntegrity(datasets);
    expect(issues.some((i) => i.code === 'foreign-key-unresolved' && i.recordId === 'wp-1')).toBe(
      true,
    );
  });

  it('flags duplicate project ids even when both instances are otherwise unreferenced', () => {
    const datasets = emptyDatasets();
    const project = {
      id: 'dup',
      code: 'C',
      name: 'n',
      description: 'd',
      sector: 'transport' as const,
      status: 'active' as const,
      priority: 'medium' as const,
      managingAuthorityId: 'a',
      investorId: 'a',
      approvedBudget: 0,
      disbursedAmount: 0,
      overallProgress: 0,
      plannedProgress: 0,
      financialProgress: 0,
      administrativeAreaCodes: ['x'],
      dataUpdatedAt: '2026-01-01T00:00:00.000Z',
      dataOwner: 'o',
      sourceDatasetId: 's',
      confidence: 'medium' as const,
      verificationStatus: 'submitted' as const,
    };
    datasets.projects = [project, { ...project }];
    const issues = validateCanonicalReferentialIntegrity(datasets);
    expect(issues.some((i) => i.code === 'duplicate-primary-key' && i.dataset === 'projects')).toBe(
      true,
    );
  });

  it('flags a milestone workPackageId and a work package contractorId that do not resolve', () => {
    const datasets = emptyDatasets();
    datasets.milestones = [
      {
        id: 'ms-1',
        projectId: 'p',
        name: 'n',
        plannedDate: '2026-01-01',
        critical: false,
        status: 'planned',
        workPackageId: 'missing-wp',
      },
    ];
    datasets.workPackages = [
      {
        id: 'wp-1',
        projectId: 'p',
        code: 'C',
        name: 'n',
        plannedStart: '2026-01-01',
        plannedEnd: '2026-02-01',
        plannedProgress: 0,
        actualProgress: 0,
        budget: 0,
        paidAmount: 0,
        status: 'planned',
        contractorId: 'missing-contractor',
      },
    ];
    datasets.contractors = [{ id: 'real-contractor', name: 'n' }];
    const issues = validateCanonicalReferentialIntegrity(datasets);
    expect(
      issues.some((i) => i.dataset === 'milestones' && i.message.includes('workPackageId')),
    ).toBe(true);
    expect(
      issues.some((i) => i.dataset === 'workPackages' && i.message.includes('contractorId')),
    ).toBe(true);
  });

  it('flags duplicate progress-snapshot identity with the same sourceRecordId as a true duplicate', () => {
    const datasets = emptyDatasets();
    const snapshot = {
      projectId: 'p',
      observedAt: '2026-01-01T00:00:00.000Z',
      plannedPhysicalProgress: 10,
      physicalProgress: 10,
      financialProgress: 10,
      disbursedAmount: 0,
      sourceDatasetId: 'ds',
      sourceRecordId: 'rec-1',
      importedAt: '2026-01-02T00:00:00.000Z',
      verificationStatus: 'submitted' as const,
    };
    datasets.progressSnapshots = [snapshot, { ...snapshot }];
    const issues = validateCanonicalReferentialIntegrity(datasets);
    expect(
      issues.some((i) => i.dataset === 'progressSnapshots' && i.code === 'duplicate-primary-key'),
    ).toBe(true);
  });

  it('does not flag a legitimate multiple-verification-stage group as a duplicate (business warning only)', () => {
    const datasets = emptyDatasets();
    const base = {
      projectId: 'p',
      observedAt: '2026-01-01T00:00:00.000Z',
      plannedPhysicalProgress: 10,
      physicalProgress: 10,
      financialProgress: 10,
      disbursedAmount: 0,
      sourceDatasetId: 'ds',
      importedAt: '2026-01-02T00:00:00.000Z',
    };
    datasets.progressSnapshots = [
      { ...base, sourceRecordId: 'raw-1', verificationStatus: 'raw' as const },
      { ...base, sourceRecordId: 'reviewed-1', verificationStatus: 'reviewed' as const },
    ];
    const issues = validateCanonicalReferentialIntegrity(datasets);
    const match = issues.find((i) => i.code === 'business-multiple-verification-stage');
    expect(match).toBeDefined();
    expect(match?.severity).toBe('warning');
    expect(issues.some((i) => i.code === 'duplicate-primary-key')).toBe(false);
  });

  it('returns no issues for a fully consistent minimal dataset', () => {
    const datasets = emptyDatasets();
    datasets.agencies = [{ id: 'a', name: 'Agency', type: 'managing-authority' }];
    datasets.projects = [
      {
        id: 'p',
        code: 'C',
        name: 'n',
        description: 'd',
        sector: 'transport',
        status: 'active',
        priority: 'medium',
        managingAuthorityId: 'a',
        investorId: 'a',
        approvedBudget: 0,
        disbursedAmount: 0,
        overallProgress: 0,
        plannedProgress: 0,
        financialProgress: 0,
        administrativeAreaCodes: ['x'],
        dataUpdatedAt: '2026-01-01T00:00:00.000Z',
        dataOwner: 'o',
        sourceDatasetId: 's',
        confidence: 'medium',
        verificationStatus: 'submitted',
      },
    ];
    expect(validateCanonicalReferentialIntegrity(datasets)).toEqual([]);
  });
});
