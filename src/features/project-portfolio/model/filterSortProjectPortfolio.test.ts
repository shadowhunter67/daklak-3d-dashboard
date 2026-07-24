import { describe, expect, it } from 'vitest';
import labels from '../../../assets/maps/daklak/daklak-labels.json';
import {
  MOCK_PROJECT_BUNDLES,
  MOCK_REFERENCE_DATE,
} from '../../../entities/project/illustrativeProjectPortfolio';
import { buildProjectPortfolioViewModel } from './buildProjectPortfolioViewModel';
import { filterProjectPortfolioRows, sortProjectPortfolioRows } from './filterSortProjectPortfolio';

const validAdministrativeCodes = new Set(Object.keys(labels));
const asOf = new Date(MOCK_REFERENCE_DATE);
const model = buildProjectPortfolioViewModel({
  bundles: MOCK_PROJECT_BUNDLES,
  context: { validAdministrativeCodes, asOf },
});

describe('filterProjectPortfolioRows', () => {
  it('returns all rows when no filters are set', () => {
    expect(filterProjectPortfolioRows(model.rows, {})).toHaveLength(model.rows.length);
  });

  it('filters by status', () => {
    const filtered = filterProjectPortfolioRows(model.rows, { status: 'delayed' });
    expect(filtered.every((r) => r.status === 'delayed')).toBe(true);
    expect(filtered.length).toBeGreaterThan(0);
  });

  it('filters by sector', () => {
    const filtered = filterProjectPortfolioRows(model.rows, { sector: 'health' });
    expect(filtered.every((r) => r.sector === 'health')).toBe(true);
  });

  it('filters by administrative area code', () => {
    const someArea = model.filterOptions.area[0]?.value;
    expect(someArea).toBeTruthy();
    const filtered = filterProjectPortfolioRows(model.rows, { area: someArea });
    expect(filtered.every((r) => r.administrativeAreaCodes.includes(someArea))).toBe(true);
  });

  it('filters by query matching name or code, diacritic-insensitive', () => {
    const target = model.rows[0];
    const query = target.name.slice(0, 4);
    const filtered = filterProjectPortfolioRows(model.rows, { query });
    expect(filtered.some((r) => r.projectId === target.projectId)).toBe(true);
  });

  it('combines multiple filters with AND semantics', () => {
    const filtered = filterProjectPortfolioRows(model.rows, {
      status: 'completed',
      sector: 'urban-development',
    });
    for (const row of filtered) {
      expect(row.status).toBe('completed');
      expect(row.sector).toBe('urban-development');
    }
  });

  it('produces an empty result for a query that matches nothing', () => {
    expect(filterProjectPortfolioRows(model.rows, { query: 'zzzzz-no-match-zzzzz' })).toHaveLength(
      0,
    );
  });
});

describe('sortProjectPortfolioRows', () => {
  it('sorts name-asc alphabetically (Vietnamese collation)', () => {
    const sorted = sortProjectPortfolioRows(model.rows, 'name-asc');
    const names = sorted.map((r) => r.name);
    const expected = [...names].sort((a, b) => a.localeCompare(b, 'vi'));
    expect(names).toEqual(expected);
  });

  it('sorts progress-asc ascending by overallProgress', () => {
    const sorted = sortProjectPortfolioRows(model.rows, 'progress-asc');
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].overallProgress).toBeGreaterThanOrEqual(sorted[i - 1].overallProgress);
    }
  });

  it('sorts attention-first with overdue-critical-issue before delayed before at-risk', () => {
    const sorted = sortProjectPortfolioRows(model.rows, 'attention-first');
    const overdueIndex = sorted.findIndex((r) => r.reasonCategory === 'overdue-critical-issue');
    const delayedIndex = sorted.findIndex((r) => r.reasonCategory === 'delayed');
    if (overdueIndex >= 0 && delayedIndex >= 0) expect(overdueIndex).toBeLessThan(delayedIndex);
  });

  it('sorts rows with an unavailable KPI value last for disbursement-desc', () => {
    const sorted = sortProjectPortfolioRows(model.rows, 'disbursement-desc');
    const unavailableIndices = sorted
      .map((r, i) => (r.disbursementRate.status === 'unavailable' ? i : -1))
      .filter((i) => i >= 0);
    for (const idx of unavailableIndices) {
      expect(idx).toBeGreaterThanOrEqual(sorted.length - unavailableIndices.length);
    }
  });

  it('defaults to attention-first when no sort key is given', () => {
    expect(sortProjectPortfolioRows(model.rows)).toEqual(
      sortProjectPortfolioRows(model.rows, 'attention-first'),
    );
  });
});
