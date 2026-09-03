import type { GeoJSONSourceSpecification, LayerSpecification } from 'maplibre-gl';
import { PLANNING_ZONES } from './planningZones';

/**
 * Map layers for `planningZones.ts` — fill + outline for the few real, sourced, approved-planning
 * zones. Off by default; a distinct purple so it never reads as one of the six illustrative
 * `planningThemes.ts` overlays (which it is deliberately unrelated to — see that file's header vs.
 * this one's). Bundled GeoJSON, no env/network dependency.
 */
export const PLANNING_ZONES_SOURCE_ID = 'planning-zones';
export const PLANNING_ZONES_FILL_LAYER_ID = 'planning-zones-fill';
export const PLANNING_ZONES_LINE_LAYER_ID = 'planning-zones-line';

const ZONE_COLOR = '#9a6bd6';

export function buildPlanningZonesSource(): GeoJSONSourceSpecification {
  return { type: 'geojson', data: PLANNING_ZONES };
}

export function buildPlanningZoneLayers(): LayerSpecification[] {
  return [
    {
      id: PLANNING_ZONES_FILL_LAYER_ID,
      type: 'fill',
      source: PLANNING_ZONES_SOURCE_ID,
      layout: { visibility: 'none' },
      paint: { 'fill-color': ZONE_COLOR, 'fill-opacity': 0.35 },
    },
    {
      id: PLANNING_ZONES_LINE_LAYER_ID,
      type: 'line',
      source: PLANNING_ZONES_SOURCE_ID,
      layout: { visibility: 'none' },
      paint: { 'line-color': ZONE_COLOR, 'line-width': 2, 'line-dasharray': [3, 1.5] },
    },
  ];
}

export const PLANNING_ZONE_LAYER_IDS = [PLANNING_ZONES_FILL_LAYER_ID, PLANNING_ZONES_LINE_LAYER_ID];
