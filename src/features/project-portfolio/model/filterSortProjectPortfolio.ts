/**
 * Local search/filter/sort trong Project Portfolio — hoạt động HOÀN TOÀN trong danh sách đã tải
 * (`ProjectPortfolioModel.rows`), không phải "global search" cross-entity (Phase 2B2, ngoài phạm
 * vi Phase 2B1). Pure functions, không đọc URL/DOM trực tiếp — `ProjectPortfolioView.tsx` là nơi
 * duy nhất nối filter này với `useHashRoute`.
 */
import type { PortfolioFilters, PortfolioSortKey } from '../../../routing/hashRoute';
import { REASON_RANK } from '../../../entities/project/attentionReason';
import type { ProjectPortfolioRow } from './projectPortfolioTypes';

const COMBINING_DIACRITICAL_MARKS = /[̀-ͯ]/g;

function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(COMBINING_DIACRITICAL_MARKS, '');
}

export function matchesQuery(row: ProjectPortfolioRow, query: string): boolean {
  if (!query.trim()) return true;
  const needle = normalize(query.trim());
  return normalize(row.name).includes(needle) || normalize(row.code).includes(needle);
}

export function filterProjectPortfolioRows(
  rows: readonly ProjectPortfolioRow[],
  filters: PortfolioFilters,
): ProjectPortfolioRow[] {
  return rows.filter((row) => {
    if (filters.status && row.status !== filters.status) return false;
    if (filters.sector && row.sector !== filters.sector) return false;
    if (filters.area && !row.administrativeAreaCodes.includes(filters.area)) return false;
    if (filters.query && !matchesQuery(row, filters.query)) return false;
    return true;
  });
}

function compareByReason(a: ProjectPortfolioRow, b: ProjectPortfolioRow): number {
  const aRank = a.reasonCategory ? REASON_RANK[a.reasonCategory] : Number.MAX_SAFE_INTEGER;
  const bRank = b.reasonCategory ? REASON_RANK[b.reasonCategory] : Number.MAX_SAFE_INTEGER;
  if (aRank !== bRank) return aRank - bRank;
  return a.name.localeCompare(b.name, 'vi');
}

/** `null` (unavailable KPI) sorts last regardless of direction — a missing value is never "the
 * smallest" or "the largest", it's simply excluded from the ordered comparison. */
function compareByKpiValue(
  a: ProjectPortfolioRow,
  b: ProjectPortfolioRow,
  pick: (row: ProjectPortfolioRow) => number | null,
  direction: 'asc' | 'desc',
): number {
  const aValue = pick(a);
  const bValue = pick(b);
  if (aValue === null && bValue === null) return a.name.localeCompare(b.name, 'vi');
  if (aValue === null) return 1;
  if (bValue === null) return -1;
  return direction === 'asc' ? aValue - bValue : bValue - aValue;
}

export function sortProjectPortfolioRows(
  rows: readonly ProjectPortfolioRow[],
  sort: PortfolioSortKey = 'attention-first',
): ProjectPortfolioRow[] {
  const copy = [...rows];
  switch (sort) {
    case 'name-asc':
      return copy.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    case 'disbursement-desc':
      return copy.sort((a, b) => compareByKpiValue(a, b, (r) => r.disbursementRate.value, 'desc'));
    case 'progress-asc':
      return copy.sort((a, b) => a.overallProgress - b.overallProgress);
    case 'freshness-desc':
      return copy.sort((a, b) => compareByKpiValue(a, b, (r) => r.dataFreshnessDays.value, 'desc'));
    case 'attention-first':
    default:
      return copy.sort(compareByReason);
  }
}
