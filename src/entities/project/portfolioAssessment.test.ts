import { describe, expect, it } from 'vitest';
import { assessPortfolio } from './portfolioAssessment';
import type { ProjectBundle, ProjectIssue } from './types';

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

describe('assessPortfolio', () => {
  it('produces empty arrays for a clean, healthy portfolio', () => {
    const result = assessPortfolio([bundle()], context);
    expect(result.validationErrors).toEqual([]);
    expect(result.qualityIssues).toEqual([]);
    expect(result.businessAlerts).toEqual([]);
    expect(result.asOf).toBe(context.asOf.toISOString());
  });

  it('treats an out-of-range progress value as a validation error, not a business alert', () => {
    const result = assessPortfolio([bundle({ overallProgress: 999 })], context);
    expect(result.validationErrors.some((e) => e.entityType === 'project')).toBe(true);
    expect(result.businessAlerts).toEqual([]);
  });

  it('treats a delayed project as a business alert, not a validation error', () => {
    const result = assessPortfolio([bundle({ status: 'delayed' })], context);
    expect(result.validationErrors).toEqual([]);
    expect(
      result.businessAlerts.some(
        (a) => a.category === 'schedule-delay' && a.severity === 'critical',
      ),
    ).toBe(true);
  });

  it('flags at-risk status as a warning-severity alert', () => {
    const result = assessPortfolio([bundle({ status: 'at-risk' })], context);
    expect(
      result.businessAlerts.some((a) => a.category === 'at-risk' && a.severity === 'warning'),
    ).toBe(true);
  });

  it('flags a suspended project as a critical alert', () => {
    const result = assessPortfolio([bundle({ status: 'suspended' })], context);
    expect(
      result.businessAlerts.some((a) => a.category === 'suspended' && a.severity === 'critical'),
    ).toBe(true);
  });

  it('flags an overdue critical issue as a critical business alert, and puts an unmapped code as a quality issue', () => {
    const overdueCriticalIssue: ProjectIssue = {
      id: 'is-1',
      projectId: 'prj-1',
      category: 'other',
      severity: 'critical',
      title: 'Vướng mắc nghiêm trọng',
      description: 'x',
      openedAt: '2026-01-01T00:00:00.000Z',
      dueAt: '2026-06-01T00:00:00.000Z',
      status: 'open',
      evidenceIds: [],
      sourceDatasetId: 'ds-issues',
    };
    const result = assessPortfolio(
      [bundle({ administrativeAreaCodes: ['99999'] }, { issues: [overdueCriticalIssue] })],
      context,
    );
    expect(
      result.businessAlerts.some(
        (a) => a.category === 'overdue-critical-issue' && a.severity === 'critical',
      ),
    ).toBe(true);
    expect(result.qualityIssues.some((i) => i.rule === 'unmapped-administrative-code')).toBe(true);
  });

  it('renders the overdue-issue due date as a plain date, not a raw ISO timestamp', () => {
    const overdueCriticalIssue: ProjectIssue = {
      id: 'is-1',
      projectId: 'prj-1',
      category: 'other',
      severity: 'critical',
      title: 'Vướng mắc nghiêm trọng',
      description: 'x',
      openedAt: '2026-01-01T00:00:00.000Z',
      dueAt: '2026-04-15T00:00:00.000Z',
      status: 'open',
      evidenceIds: [],
      sourceDatasetId: 'ds-issues',
    };
    const result = assessPortfolio([bundle({}, { issues: [overdueCriticalIssue] })], context);
    const alert = result.businessAlerts.find((a) => a.category === 'overdue-critical-issue');
    expect(alert?.message).not.toContain('T00:00:00.000Z');
    expect(alert?.message).toContain('2026');
  });

  // Regression guard for a real UX defect: business-alert messages briefly shipped with a
  // trailing "(status=suspended)"/"(status=delayed)"/"(status=at-risk)" technical suffix visible
  // directly to executives on the Executive Overview alert list — see AGENTS/PR history.
  it('never leaks a raw "status=..." enum value into a business-alert message', () => {
    for (const status of ['suspended', 'delayed', 'at-risk'] as const) {
      const result = assessPortfolio([bundle({ status })], context);
      for (const alert of result.businessAlerts) {
        expect(alert.message).not.toMatch(/status=/);
      }
    }
  });

  it('does not alert on a critical issue that is not yet overdue', () => {
    const notYetDue: ProjectIssue = {
      id: 'is-1',
      projectId: 'prj-1',
      category: 'other',
      severity: 'critical',
      title: 'x',
      description: 'x',
      openedAt: '2026-01-01T00:00:00.000Z',
      dueAt: '2026-12-01T00:00:00.000Z',
      status: 'open',
      evidenceIds: [],
      sourceDatasetId: 'ds-issues',
    };
    const result = assessPortfolio([bundle({}, { issues: [notYetDue] })], context);
    expect(result.businessAlerts.some((a) => a.category === 'overdue-critical-issue')).toBe(false);
  });

  it('flags budget exposure when financial progress outpaces physical progress beyond the threshold', () => {
    const result = assessPortfolio(
      [bundle({ financialProgress: 80, overallProgress: 40 })],
      context,
    );
    expect(result.businessAlerts.some((a) => a.category === 'budget-exposure')).toBe(true);
  });

  it('does not flag budget exposure within the threshold', () => {
    const result = assessPortfolio(
      [bundle({ financialProgress: 45, overallProgress: 40 })],
      context,
    );
    expect(result.businessAlerts.some((a) => a.category === 'budget-exposure')).toBe(false);
  });
});
