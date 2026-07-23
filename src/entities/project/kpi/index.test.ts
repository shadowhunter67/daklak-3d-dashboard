import { describe, expect, it } from 'vitest';
import type { ProjectBundle, ProjectIssue } from '../types';
import {
  budgetVariance,
  dataCompleteness,
  dataFreshness,
  disbursementRate,
  forecastDelayInDays,
  landClearanceCompletionRate,
  overdueIssueCount,
  progressVariance,
  scheduleVariance,
} from './index';

function makeBundle(overrides: Partial<ProjectBundle['project']> = {}): ProjectBundle {
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
      approvedBudget: 1000,
      disbursedAmount: 400,
      overallProgress: 40,
      plannedProgress: 50,
      financialProgress: 40,
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
  };
}

const now = new Date('2026-07-23T00:00:00.000Z');

describe('disbursementRate', () => {
  it('computes disbursedAmount / approvedBudget when no adjustedBudget', () => {
    const result = disbursementRate(
      makeBundle({ approvedBudget: 1000, disbursedAmount: 400 }),
      now,
    );
    expect(result.status).toBe('ok');
    expect(result.value).toBeCloseTo(40);
  });

  it('prefers adjustedBudget when present', () => {
    const result = disbursementRate(
      makeBundle({ approvedBudget: 1000, adjustedBudget: 2000, disbursedAmount: 400 }),
      now,
    );
    expect(result.value).toBeCloseTo(20);
  });

  it('is unavailable when budget is zero or missing', () => {
    const result = disbursementRate(makeBundle({ approvedBudget: 0, disbursedAmount: 0 }), now);
    expect(result.status).toBe('unavailable');
    expect(result.value).toBeNull();
  });
});

describe('scheduleVariance', () => {
  it('is negative when behind plan', () => {
    const result = scheduleVariance(makeBundle({ overallProgress: 40, plannedProgress: 55 }), now);
    expect(result.value).toBeCloseTo(-15);
  });
});

describe('progressVariance', () => {
  it('compares financial pace against physical pace', () => {
    const result = progressVariance(
      makeBundle({ financialProgress: 60, overallProgress: 40 }),
      now,
    );
    expect(result.value).toBeCloseTo(20);
  });
});

describe('budgetVariance', () => {
  it('is unavailable without an adjusted budget', () => {
    const result = budgetVariance(makeBundle({ adjustedBudget: undefined }), now);
    expect(result.status).toBe('unavailable');
  });

  it('computes the delta when adjusted budget exists', () => {
    const result = budgetVariance(makeBundle({ approvedBudget: 1000, adjustedBudget: 1200 }), now);
    expect(result.value).toBe(200);
  });
});

describe('forecastDelayInDays', () => {
  it('is unavailable without both dates', () => {
    const result = forecastDelayInDays(makeBundle({ forecastCompletionDate: undefined }), now);
    expect(result.status).toBe('unavailable');
  });

  it('computes a positive delay when forecast is after plan', () => {
    const result = forecastDelayInDays(
      makeBundle({ plannedCompletionDate: '2026-01-01', forecastCompletionDate: '2026-01-11' }),
      now,
    );
    expect(result.value).toBe(10);
  });
});

describe('overdueIssueCount', () => {
  const baseIssue: ProjectIssue = {
    id: 'is-1',
    projectId: 'prj-1',
    category: 'other',
    severity: 'low',
    title: 'x',
    description: 'x',
    openedAt: '2026-01-01T00:00:00.000Z',
    status: 'open',
    evidenceIds: [],
  };

  it('is unavailable when no issue declares a due date', () => {
    const result = overdueIssueCount([baseIssue], now);
    expect(result.status).toBe('unavailable');
  });

  it('counts only open issues past their due date', () => {
    const overdue: ProjectIssue = { ...baseIssue, id: 'is-2', dueAt: '2026-06-01T00:00:00.000Z' };
    const resolvedOverdue: ProjectIssue = {
      ...baseIssue,
      id: 'is-3',
      dueAt: '2026-06-01T00:00:00.000Z',
      status: 'resolved',
    };
    const notYetDue: ProjectIssue = { ...baseIssue, id: 'is-4', dueAt: '2026-12-01T00:00:00.000Z' };
    const result = overdueIssueCount([overdue, resolvedOverdue, notYetDue], now);
    expect(result.value).toBe(1);
  });
});

describe('landClearanceCompletionRate', () => {
  it('is unavailable when the project has no land-clearance issues', () => {
    const result = landClearanceCompletionRate([], now);
    expect(result.status).toBe('unavailable');
  });

  it('computes the resolved ratio among land-clearance issues only', () => {
    const issues: ProjectIssue[] = [
      {
        id: 'is-1',
        projectId: 'prj-1',
        category: 'land-clearance',
        severity: 'high',
        title: 'x',
        description: 'x',
        openedAt: '2026-01-01T00:00:00.000Z',
        status: 'resolved',
        evidenceIds: [],
      },
      {
        id: 'is-2',
        projectId: 'prj-1',
        category: 'land-clearance',
        severity: 'high',
        title: 'x',
        description: 'x',
        openedAt: '2026-01-01T00:00:00.000Z',
        status: 'open',
        evidenceIds: [],
      },
      {
        id: 'is-3',
        projectId: 'prj-1',
        category: 'procurement',
        severity: 'low',
        title: 'x',
        description: 'x',
        openedAt: '2026-01-01T00:00:00.000Z',
        status: 'open',
        evidenceIds: [],
      },
    ];
    const result = landClearanceCompletionRate(issues, now);
    expect(result.value).toBeCloseTo(50);
  });
});

describe('dataFreshness', () => {
  it('computes age in days from dataUpdatedAt', () => {
    const result = dataFreshness(makeBundle({ dataUpdatedAt: '2026-07-13T00:00:00.000Z' }), now);
    expect(result.value).toBe(10);
  });
});

describe('dataCompleteness', () => {
  it('is always available and reports missing optional fields', () => {
    const result = dataCompleteness(
      makeBundle({ projectManagerId: undefined, geometry: undefined }),
      now,
    );
    expect(result.status).toBe('ok');
    expect(result.missingInputs).toContain('projectManagerId');
    expect(result.missingInputs).toContain('geometry');
  });
});
