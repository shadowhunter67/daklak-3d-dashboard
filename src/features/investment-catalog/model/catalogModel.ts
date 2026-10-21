import { resolveField } from '../../../entities/researched-project/resolveField';
import type {
  EvidenceLevel,
  FieldObservation,
  LocationAccuracy,
  ResearchedDataset,
  ResearchedSector,
  SourceRecord,
} from '../../../entities/researched-project/types';
import type { DataConfidence } from '../../../entities/project/types';

export type EvidenceField = 'lifecycle' | 'totalInvestment';

/** Một quan sát (giá trị + nguồn + ngày + mức bằng chứng) của một trường. */
export interface EvidenceObservation {
  value: string | number;
  status: EvidenceLevel;
  confidence: DataConfidence;
  observedAt: string;
  documentNumber: string | undefined;
  sourceUrl: string | undefined;
}

/** Bằng chứng của một trường: giá trị hiện hành + các quan sát cũ/khác (không bị ghi đè). */
export interface CatalogEvidence extends EvidenceObservation {
  field: EvidenceField;
  history: EvidenceObservation[];
}

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
  /** Chỉ gồm các trường thật sự có quan sát — thiếu dữ liệu thì không có dòng. */
  evidence: CatalogEvidence[];
}

export interface CatalogFilters {
  query?: string;
  sector?: string;
  area?: string;
}

export type CatalogSortKey = 'capital-desc' | 'name-asc';

function toObservation(
  o: FieldObservation<string | number>,
  sources: ReadonlyMap<string, SourceRecord>,
): EvidenceObservation {
  const source = sources.get(o.sourceId);
  return {
    value: o.value,
    status: o.status,
    confidence: o.confidence,
    observedAt: o.observedAt,
    documentNumber: source?.documentNumber,
    sourceUrl: source?.url,
  };
}

function buildEvidence(
  field: EvidenceField,
  history: readonly FieldObservation<string | number>[],
  sources: ReadonlyMap<string, SourceRecord>,
): CatalogEvidence[] {
  const { resolved } = resolveField(history);
  if (!resolved) return [];
  const others = history.filter((o) => o !== resolved);
  return [
    {
      field,
      ...toObservation(resolved, sources),
      history: others.map((o) => toObservation(o, sources)),
    },
  ];
}

export function buildCatalogRows(dataset: ResearchedDataset): CatalogRow[] {
  const sources = new Map(dataset.sources.map((s) => [s.id, s]));
  // Danh mục này chỉ gồm dự án ở giai đoạn thu hút đầu tư — nhãn/tiêu đề của trang nói đúng điều đó.
  return dataset.projects
    .filter((p) => p.lifecycle.value === 'investment-attraction')
    .map((p) => {
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
        evidence: [
          ...buildEvidence('lifecycle', [p.lifecycle], sources),
          ...buildEvidence('totalInvestment', p.fields.totalInvestment ?? [], sources),
        ],
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
