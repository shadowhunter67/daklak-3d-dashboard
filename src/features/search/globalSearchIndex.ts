import { normalizeSearchText } from '../../utils/search';

/**
 * Pure search index for the topbar: administrative units, projects and tourism places. Every entry
 * comes from real application data (ward labels, the project portfolio source, verified tourism
 * destinations); nothing here is invented. Results are grouped by kind so a keyboard or
 * screen-reader user knows what a result is before opening it.
 */
export type SearchResultKind = 'ward' | 'project' | 'opportunity' | 'place' | 'planning';

export interface WardSearchEntry {
  kind: 'ward';
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}
export interface ProjectSearchEntry {
  kind: 'project';
  id: string;
  name: string;
  /** Project code, searchable but not translated. */
  code: string;
}
/** Một dự án trong danh mục thu hút đầu tư (nguồn chính thức QĐ 1985/QĐ-UBND). */
export interface OpportunitySearchEntry {
  kind: 'opportunity';
  id: string;
  name: string;
}
export interface PlaceSearchEntry {
  kind: 'place';
  id: string;
  name: string;
}
/** Một văn bản quy hoạch được trích dẫn trong danh mục thu hút đầu tư (số hiệu là tên tìm kiếm). */
export interface PlanningSearchEntry {
  kind: 'planning';
  id: string;
  name: string;
}
export type SearchEntry =
  | WardSearchEntry
  | ProjectSearchEntry
  | OpportunitySearchEntry
  | PlaceSearchEntry
  | PlanningSearchEntry;

interface IndexedEntry {
  entry: SearchEntry;
  haystack: string;
}

export interface SearchIndex {
  entries: readonly IndexedEntry[];
}

export function buildSearchIndex(entries: readonly SearchEntry[]): SearchIndex {
  return {
    entries: entries.map((entry) => ({
      entry,
      haystack: normalizeSearchText(
        entry.kind === 'project' ? `${entry.name} ${entry.code}` : entry.name,
      ),
    })),
  };
}

export type GroupedSearchResults = Record<SearchResultKind, SearchEntry[]>;

/** Prefix matches rank above substring matches; ties keep the index order. */
export function searchAll(
  index: SearchIndex,
  query: string,
  limitPerKind = 6,
): GroupedSearchResults {
  const grouped: GroupedSearchResults = {
    ward: [],
    project: [],
    opportunity: [],
    place: [],
    planning: [],
  };
  const needle = normalizeSearchText(query);
  if (!needle) return grouped;
  const scored: Array<{ entry: SearchEntry; score: number }> = [];
  for (const { entry, haystack } of index.entries) {
    const position = haystack.indexOf(needle);
    if (position < 0) continue;
    const startsWord = position === 0 || haystack[position - 1] === ' ';
    scored.push({ entry, score: position === 0 ? 0 : startsWord ? 1 : 2 });
  }
  scored.sort((a, b) => a.score - b.score);
  for (const { entry } of scored) {
    if (grouped[entry.kind].length < limitPerKind) grouped[entry.kind].push(entry);
  }
  return grouped;
}

export const SEARCH_KIND_ORDER: readonly SearchResultKind[] = [
  'ward',
  'project',
  'opportunity',
  'place',
  'planning',
];

export function flattenResults(grouped: GroupedSearchResults): SearchEntry[] {
  return SEARCH_KIND_ORDER.flatMap((kind) => grouped[kind]);
}
