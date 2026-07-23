import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { KpiResult } from '../../entities/project/kpi/types';
import { KpiCardGrid } from './KpiCardGrid';
import type { ExecutiveOverviewKpis } from './model/executiveOverviewTypes';

const asOf = new Date('2026-07-23T00:00:00.000Z');

function ok(value: number, unit: string): KpiResult {
  return {
    value,
    unit,
    status: 'ok',
    calculatedAt: asOf.toISOString(),
    sourceDatasetIds: [],
    missingInputs: [],
    explanation: 'x',
  };
}
function unavailable(explanation: string): KpiResult {
  return {
    value: null,
    unit: '%',
    status: 'unavailable',
    calculatedAt: asOf.toISOString(),
    sourceDatasetIds: [],
    missingInputs: ['x'],
    explanation,
  };
}

const kpis: ExecutiveOverviewKpis = {
  totalProjects: ok(9, 'count'),
  totalApprovedBudget: ok(1_000_000_000, 'VND'),
  disbursementRate: unavailable('Không có ngân sách hợp lệ.'),
  onTrackProjects: ok(4, 'count'),
  atRiskProjects: ok(1, 'count'),
  delayedProjects: ok(1, 'count'),
  overdueIssues: ok(2, 'count'),
};

describe('KpiCardGrid', () => {
  afterEach(cleanup);

  it('renders a heading and one card per KPI', () => {
    render(<KpiCardGrid kpis={kpis} />);
    expect(screen.getByRole('heading', { name: 'Chỉ số tổng quan' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(7);
  });

  it('shows the explanatory text for an unavailable KPI instead of a number', () => {
    render(<KpiCardGrid kpis={kpis} />);
    const card = screen.getByText('Tỷ lệ giải ngân').closest('li')!;
    expect(card.textContent).toContain('Không có ngân sách hợp lệ.');
    expect(card.getAttribute('data-unavailable')).toBe('true');
  });

  it('renders an available count KPI as a plain number', () => {
    render(<KpiCardGrid kpis={kpis} />);
    const card = screen.getByText('Đúng tiến độ').closest('li')!;
    expect(card.textContent).toContain('4');
    expect(card.getAttribute('data-unavailable')).toBeNull();
  });
});
