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

/** Settled (fully revealed) targets — the "khoanh vùng" glow-reveal animation in
 * `MapLibreProvider.setPlanningZonesVisible` (`revealAnimation.ts`) animates from 0 up to these. */
export const PLANNING_ZONES_REVEAL_TARGETS = { fillOpacity: 0.35, lineOpacity: 1, lineWidth: 2 };

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
      paint: {
        'fill-color': ZONE_COLOR,
        'fill-opacity': PLANNING_ZONES_REVEAL_TARGETS.fillOpacity,
      },
    },
    {
      id: PLANNING_ZONES_LINE_LAYER_ID,
      type: 'line',
      source: PLANNING_ZONES_SOURCE_ID,
      layout: { visibility: 'none' },
      paint: {
        'line-color': ZONE_COLOR,
        'line-width': PLANNING_ZONES_REVEAL_TARGETS.lineWidth,
        'line-opacity': PLANNING_ZONES_REVEAL_TARGETS.lineOpacity,
        'line-dasharray': [3, 1.5],
      },
    },
  ];
}

export const PLANNING_ZONE_LAYER_IDS = [PLANNING_ZONES_FILL_LAYER_ID, PLANNING_ZONES_LINE_LAYER_ID];
