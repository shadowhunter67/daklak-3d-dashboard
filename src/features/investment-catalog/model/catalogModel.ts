import { resolveField } from '../../../entities/researched-project/resolveField';
import type {
  LocationAccuracy,
  ResearchedDataset,
  ResearchedSector,
} from '../../../entities/researched-project/types';

export interface CatalogRow {
  id: string;
  name: string;
  sector: ResearchedSector;
  areaCodes: string[];
  /** VND; `undefined` nghĩa là nguồn không có — không phải 0. */
  capitalVnd: number | undefined;
  locationAccuracy: LocationAccuracy | undefined;
  hasLocation: boolean;
  notes: string[];
  documentNumber: string | undefined;
  publishedAt: string | undefined;
  sourceUrl: string | undefined;
}

export interface CatalogFilters {
  query?: string;
  sector?: string;
  area?: string;
}

export type CatalogSortKey = 'capital-desc' | 'name-asc';

export function buildCatalogRows(dataset: ResearchedDataset): CatalogRow[] {
  const sources = new Map(dataset.sources.map((s) => [s.id, s]));
  return dataset.projects.map((p) => {
    const capital = resolveField(p.fields.totalInvestment ?? []).resolved;
    const source = sources.get(capital?.sourceId ?? p.lifecycle.sourceId);
    return {
      id: p.id,
      name: p.name,
      sector: p.sector,
      areaCodes: p.administrativeAreaCodes,
      capitalVnd: capital?.value,
      locationAccuracy: p.location?.accuracy,
      hasLocation: p.location !== undefined,
      notes: p.notes ?? [],
      documentNumber: source?.documentNumber,
      publishedAt: source?.publishedAt,
      sourceUrl: source?.url,
    };
  });
}

const fold = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();

export function filterCatalogRows(rows: readonly CatalogRow[], filters: CatalogFilters) {
  const query = filters.query ? fold(filters.query.trim()) : '';
  return rows.filter(
    (row) =>
      (!query || fold(row.name).includes(query)) &&
      (!filters.sector || row.sector === filters.sector) &&
      (!filters.area || row.areaCodes.includes(filters.area)),
  );
}

export function sortCatalogRows(rows: readonly CatalogRow[], key: CatalogSortKey) {
  const byName = (a: CatalogRow, b: CatalogRow) => a.name.localeCompare(b.name, 'vi');
  return [...rows].sort((a, b) => {
    if (key === 'name-asc') return byName(a, b);
    const ca = a.capitalVnd ?? -1;
    const cb = b.capitalVnd ?? -1;
    return cb - ca || byName(a, b);
  });
}

/** VND → số "tỷ đồng" đã định dạng theo locale (không kèm đơn vị; đơn vị nằm trong chuỗi i18n). */
export function formatCapitalBillions(vnd: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'vi-VN', {
    maximumFractionDigits: vnd >= 1e12 ? 0 : 2,
  }).format(vnd / 1e9);
}
