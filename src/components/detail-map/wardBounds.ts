import { geoBounds } from 'd3-geo';
import wards from '../../assets/maps/daklak/daklak-wards-render.json';
import type { WardCollection } from '../../types/map';
import type { DetailBounds } from './detailMapTypes';

const collection = wards as WardCollection;
const cache = new Map<string, DetailBounds | null>();

/**
 * Real lon/lat bounds for a ward, for `MapLibreProvider.fitBounds` to frame on selection —
 * the MapLibre analogue of `AdministrativeMap2D.tsx`'s `path.bounds(feature)` (which returns
 * already-projected SVG pixels; this returns real geographic bounds instead, via d3-geo's
 * `geoBounds`, since MapLibre's camera works in lon/lat, not the SVG's own projection).
 * Memoized per code — the ward collection never changes at runtime.
 */
export function getWardBounds(code: string): DetailBounds | null {
  if (cache.has(code)) return cache.get(code)!;
  const feature = collection.features.find((candidate) => candidate.properties.code === code);
  if (!feature) {
    cache.set(code, null);
    return null;
  }
  const [[west, south], [east, north]] = geoBounds(feature);
  const bounds: DetailBounds = { north, south, east, west };
  cache.set(code, bounds);
  return bounds;
}
