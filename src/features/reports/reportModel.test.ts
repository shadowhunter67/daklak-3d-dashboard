import { describe, expect, it } from 'vitest';
import { buildReportSummary } from './reportModel';
import type { ProjectBundle } from '../../entities/project/types';

const bundle = (overrides: Partial<ProjectBundle['project']> = {}): ProjectBundle => ({
  project: {
    id: 'p',
    code: 'P',
    name: 'P',
    description: '',
    sector: 'transport',
    status: 'active',
    priority: 'high',
    managingAuthorityId: 'a',
    investorId: 'i',
    approvedBudget: 100,
    disbursedAmount: 25,
    overallProgress: 20,
    plannedProgress: 40,
    financialProgress: 25,
    administrativeAreaCodes: ['A'],
    dataUpdatedAt: '2026-01-01',
    dataOwner: 'x',
    sourceDatasetId: 'x',
    confidence: 'medium',
    verificationStatus: 'validated-automatically',
    ...overrides,
  },
  workPackages: [],
  milestones: [],
  issues: [],
  progressSnapshots: [],
});

describe('buildReportSummary', () => {
  it('aggregates project facts deterministically', () => {
    const result = buildReportSummary([
      bundle(),
      bundle({ id: 'q', status: 'completed', sector: 'health', administrativeAreaCodes: ['B'] }),
    ]);
    expect(result.total).toBe(2);
    expect(result.completed).toBe(1);
    expect(result.disbursementRate).toBe(25);
    expect(result.byArea[0]?.area).toBe('A');
    expect(result.highlights.delayed).toBe(0);
    expect(result.unitAttention[0]?.openIssues).toBe(0);
  });
});
