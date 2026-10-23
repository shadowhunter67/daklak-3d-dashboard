/**
 * Hash route cho Project Portfolio / Project Detail — xem docs/adr/0002-static-host-routing.md cho
 * quyết định. Pure parse/serialize, không phụ thuộc React/DOM (đối xứng với `dashboardUrl.ts`),
 * tách biệt hoàn toàn với `?view=`/`?mode=`/`?ward=` — file đó không đổi.
 *
 * Route được biểu diễn trong `location.hash`:
 *   (trống)                          -> { kind: 'none' }
 *   #/projects                       -> { kind: 'portfolio', filters: {} }
 *   #/projects?status=delayed&...    -> { kind: 'portfolio', filters: {...} }
 *   #/projects/:id                   -> { kind: 'project-detail', projectId: id }
 *   #/data-readiness                 -> { kind: 'data-readiness' } (Phase 5 §C)
 *   #/investment-catalog           -> { kind: 'investment-catalog' } (danh mục thu hút đầu tư từ nguồn chính thức)
 *   #/diorama/:destinationId         -> { kind: 'diorama', destinationId } (illustrative destination diorama)
 *   bất kỳ giá trị nào khác          -> { kind: 'none' } (không crash trên hash lạ/hỏng)
 */

export type PortfolioSortKey =
  'name-asc' | 'disbursement-desc' | 'progress-asc' | 'freshness-desc' | 'attention-first';

export const PORTFOLIO_SORT_KEYS: readonly PortfolioSortKey[] = [
  'name-asc',
  'disbursement-desc',
  'progress-asc',
  'freshness-desc',
  'attention-first',
];

export interface PortfolioFilters {
  status?: string;
  sector?: string;
  area?: string;
  query?: string;
  sort?: PortfolioSortKey;
}

export type HashRoute =
  | { kind: 'none' }
  | { kind: 'portfolio'; filters: PortfolioFilters }
  | { kind: 'project-detail'; projectId: string }
  | { kind: 'data-readiness' }
  | { kind: 'reports' }
  | { kind: 'investment-catalog'; query?: string; area?: string }
  | { kind: 'unit'; code: string }
  | { kind: 'diorama'; destinationId: string };

function isPortfolioSortKey(value: string): value is PortfolioSortKey {
  return (PORTFOLIO_SORT_KEYS as readonly string[]).includes(value);
}

function parseFilters(search: string): PortfolioFilters {
  const params = new URLSearchParams(search);
  const filters: PortfolioFilters = {};
  const status = params.get('status');
  const sector = params.get('sector');
  const area = params.get('area');
  const query = params.get('q');
  const sort = params.get('sort');
  if (status) filters.status = status;
  if (sector) filters.sector = sector;
  if (area) filters.area = area;
  if (query) filters.query = query;
  if (sort && isPortfolioSortKey(sort)) filters.sort = sort;
  return filters;
}

function serializeFilters(filters: PortfolioFilters): string {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.sector) params.set('sector', filters.sector);
  if (filters.area) params.set('area', filters.area);
  if (filters.query) params.set('q', filters.query);
  if (filters.sort) params.set('sort', filters.sort);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/** `rawHash` is `location.hash`, including the leading `#` (or empty string). */
export function parseHashRoute(rawHash: string): HashRoute {
  if (!rawHash || rawHash === '#') return { kind: 'none' };
  // Strip leading '#', then an optional leading '/'.
  const withoutHash = rawHash.slice(1);
  const [pathPart, searchPart = ''] = withoutHash.split('?');
  const path = pathPart.startsWith('/') ? pathPart.slice(1) : pathPart;
  const segments = path.split('/').filter(Boolean);

  if (segments.length === 0) return { kind: 'none' };
  if (segments[0] === 'data-readiness') {
    return segments.length === 1 ? { kind: 'data-readiness' } : { kind: 'none' };
  }
  if (segments[0] === 'reports') {
    return segments.length === 1 ? { kind: 'reports' } : { kind: 'none' };
  }
  if (segments[0] === 'investment-catalog') {
    if (segments.length !== 1) return { kind: 'none' };
    const params = new URLSearchParams(searchPart);
    const query = params.get('q')?.trim();
    const area = params.get('area')?.trim();
    return {
      kind: 'investment-catalog',
      ...(query ? { query } : {}),
      ...(area ? { area } : {}),
    };
  }
  if (segments[0] === 'unit') {
    if (segments.length !== 2) return { kind: 'none' };
    const code = decodeURIComponent(segments[1]).trim();
    return code ? { kind: 'unit', code } : { kind: 'none' };
  }
  if (segments[0] === 'diorama') {
    if (segments.length !== 2) return { kind: 'none' };
    const destinationId = decodeURIComponent(segments[1]);
    return destinationId.trim() ? { kind: 'diorama', destinationId } : { kind: 'none' };
  }
  if (segments[0] !== 'projects') return { kind: 'none' };

  if (segments.length === 1) {
    return { kind: 'portfolio', filters: parseFilters(searchPart) };
  }

  if (segments.length === 2) {
    const projectId = decodeURIComponent(segments[1]);
    if (!projectId.trim()) return { kind: 'none' };
    return { kind: 'project-detail', projectId };
  }

  return { kind: 'none' };
}

export function serializePortfolioHash(filters: PortfolioFilters = {}): string {
  return `#/projects${serializeFilters(filters)}`;
}

export function serializeProjectDetailHash(projectId: string): string {
  return `#/projects/${encodeURIComponent(projectId)}`;
}

export function serializeDataReadinessHash(): string {
  return '#/data-readiness';
}

export function serializeReportsHash(): string {
  return '#/reports';
}

export function serializeInvestmentCatalogHash(query?: string, area?: string): string {
  const parts: string[] = [];
  if (query?.trim()) parts.push(`q=${encodeURIComponent(query.trim())}`);
  if (area?.trim()) parts.push(`area=${encodeURIComponent(area.trim())}`);
  return parts.length ? `#/investment-catalog?${parts.join('&')}` : '#/investment-catalog';
}

export function serializeUnitHash(code: string): string {
  return `#/unit/${encodeURIComponent(code)}`;
}

export function serializeDioramaHash(destinationId: string): string {
  return `#/diorama/${encodeURIComponent(destinationId)}`;
}
