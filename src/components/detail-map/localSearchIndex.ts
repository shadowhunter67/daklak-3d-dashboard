import { normalizeSearchText } from '../../utils/search';

export interface LocalSearchEntry {
  code: string;
  name: string;
  normalizedName: string;
  latitude: number;
  longitude: number;
}

type LabelSource = Record<string, { name: string; longitude: number; latitude: number }>;

export function buildLocalSearchIndex(labels: LabelSource): LocalSearchEntry[] {
  return Object.entries(labels).map(([code, label]) => ({
    code,
    name: label.name,
    normalizedName: normalizeSearchText(label.name),
    latitude: label.latitude,
    longitude: label.longitude,
  }));
}

export function searchLocalIndex(
  index: readonly LocalSearchEntry[],
  query: string,
  limit = 8,
): LocalSearchEntry[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [];
  return index.filter((entry) => entry.normalizedName.includes(normalizedQuery)).slice(0, limit);
}
