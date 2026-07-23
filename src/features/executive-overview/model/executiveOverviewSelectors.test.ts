import { describe, expect, it } from 'vitest';
import type { KpiResult } from '../../../entities/project/kpi/types';
import type { PortfolioAlert } from './executiveOverviewTypes';
import { formatKpiValue, formatRelativeUpdatedAt, groupAlerts } from './executiveOverviewSelectors';

const asOf = new Date('2026-07-23T00:00:00.000Z');

function ok(value: number, unit: string): KpiResult {
  return {
    value,
    unit,
    status: 'ok',
    calculatedAt: asOf.toISOString(),
    sourceDatasetIds: [],
    missingInputs: [],
    explanation: '',
  };
}

const unavailable: KpiResult = {
  value: null,
  unit: '%',
  status: 'unavailable',
  calculatedAt: asOf.toISOString(),
  sourceDatasetIds: [],
  missingInputs: ['x'],
  explanation: '',
};

describe('formatKpiValue', () => {
  it('never renders 0 or a number for an unavailable KPI', () => {
    const result = formatKpiValue(unavailable);
    expect(result.isUnavailable).toBe(true);
    expect(result.text).not.toMatch(/^\d/);
  });

  it('formats VND with a currency suffix', () => {
    expect(formatKpiValue(ok(1000, 'VND')).text).toContain('₫');
  });

  it('formats percent with a % suffix', () => {
    expect(formatKpiValue(ok(42.5, '%')).text).toContain('%');
  });

  it('formats count as a plain localized number', () => {
    const result = formatKpiValue(ok(9, 'count'));
    expect(result.isUnavailable).toBe(false);
    expect(result.text).toContain('9');
  });
});

describe('groupAlerts', () => {
  const alerts: PortfolioAlert[] = [
    { id: '1', kind: 'business', severity: 'critical', category: 'schedule-delay', message: 'x' },
    { id: '2', kind: 'business', severity: 'warning', category: 'at-risk', message: 'x' },
    { id: '3', kind: 'data-quality', severity: 'warning', category: 'stale-data', message: 'x' },
    {
      id: '4',
      kind: 'data-quality',
      severity: 'critical',
      category: 'duplicate-primary-key',
      message: 'x',
    },
  ];

  it('separates business critical, business warning, and data-quality into three distinct groups', () => {
    const grouped = groupAlerts(alerts);
    expect(grouped.critical).toEqual([alerts[0]]);
    expect(grouped.warning).toEqual([alerts[1]]);
    expect(grouped.dataQuality).toEqual([alerts[2], alerts[3]]);
  });

  it('never lets a data-quality alert appear in the business critical/warning buckets', () => {
    const grouped = groupAlerts(alerts);
    expect(grouped.critical.every((a) => a.kind === 'business')).toBe(true);
    expect(grouped.warning.every((a) => a.kind === 'business')).toBe(true);
  });
});

describe('formatRelativeUpdatedAt', () => {
  it('says "Hôm nay" for the same day as asOf', () => {
    expect(formatRelativeUpdatedAt(asOf.toISOString(), asOf)).toBe('Hôm nay');
  });

  it('counts whole days for an older timestamp', () => {
    expect(formatRelativeUpdatedAt('2026-07-13T00:00:00.000Z', asOf)).toBe('10 ngày trước');
  });
});
