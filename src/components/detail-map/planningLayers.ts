import type { FillLayerSpecification } from 'maplibre-gl';
import { WARD_BOUNDARY_SOURCE_ID } from './wardBoundaryLayers';
import { wardColorsForTheme, type PlanningThemeId } from './planningThemes';

/**
 * The single translucent `fill` layer that renders whichever illustrative planning theme is
 * active (`planningThemes.ts`). It reuses the real `ward-boundaries` GeoJSON source — no extra
 * geometry payload — and recolours per theme by swapping `fill-color` (a `match` on ward `code`).
 *
 * Starts inert: `fill-opacity` 0. `MapLibreProvider.setPlanningTheme` sets the colour expression
 * and fades opacity to `PLANNING_FILL_OPACITY` when a theme is picked, back to 0 for "Không".
 *
 * Draw slot: above the ward fill + OSM roads/buildings (so it reads as an overlay wash) but
 * below the ward outline, selection highlight and every label (so boundaries and names stay
 * legible on top) — see `detailMapStyle.ts`.
 */
export const PLANNING_FILL_LAYER_ID = 'planning-overlay-fill';
export const PLANNING_FILL_OPACITY = 0.55;

export function buildPlanningFillLayer(): FillLayerSpecification {
  return {
    id: PLANNING_FILL_LAYER_ID,
    type: 'fill',
    source: WARD_BOUNDARY_SOURCE_ID,
    paint: {
      'fill-color': '#45685f',
      'fill-opacity': 0,
      'fill-antialias': false,
    },
  };
}

/** `['match', ['get','code'], code, color, …, fallbackColor]` for the active theme. */
export function planningFillColorExpression(
  theme: PlanningThemeId,
): NonNullable<FillLayerSpecification['paint']>['fill-color'] {
  const pairs = wardColorsForTheme(theme);
  return [
    'match',
    ['get', 'code'],
    ...pairs.flatMap(([code, color]) => [code, color]),
    '#45685f',
  ] as unknown as NonNullable<FillLayerSpecification['paint']>['fill-color'];
}
