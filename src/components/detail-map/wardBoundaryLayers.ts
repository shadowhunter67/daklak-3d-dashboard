import type { GeoJSONSourceSpecification, LayerSpecification } from 'maplibre-gl';
import wards from '../../assets/maps/daklak/daklak-wards-render.json';
import type { WardCollection } from '../../types/map';

/**
 * Single source of truth for the MapLibre ward-boundary source/layer ids, shared by
 * `detailMapStyle.ts` (which creates them) and `MapLibreProvider.ts` (which mutates their paint
 * properties/filters) — so the two cannot drift apart the way `setSelectedWard`/`resolveWardCodeAt`
 * previously did (they referenced `administrative-boundaries-fill`/`-selected`, ids that were never
 * actually added to the style; see detailMapStyle.ts's prior doc comment).
 *
 * Boundary geometry comes from the same bundled `daklak-wards-render.json` the 2D SVG map
 * (`AdministrativeMap2D.tsx`) already ships (554KB) — not the env-gated PMTiles source, so this
 * renders unconditionally regardless of `VITE_DETAIL_MAP_SOURCE_URL`.
 */
export const WARD_BOUNDARY_SOURCE_ID = 'ward-boundaries';
export const WARD_BOUNDARY_FILL_LAYER_ID = 'administrative-boundaries-fill';
export const WARD_BOUNDARY_LINE_LAYER_ID = 'administrative-boundaries-line';
export const WARD_SELECTED_FILL_LAYER_ID = 'administrative-boundaries-selected-fill';
/** Id kept from the pre-existing (previously dead) `MapLibreProvider.setSelectedWard` code. */
export const WARD_SELECTED_LINE_LAYER_ID = 'administrative-boundaries-selected';

const collection = wards as WardCollection;

export function buildWardBoundarySource(): GeoJSONSourceSpecification {
  return { type: 'geojson', data: collection };
}

/**
 * Base fill/line pair renders every ward, always visible by default (toggled via
 * `setAdministrativeBoundariesVisible`). The two "selected" layers render on top, starting inert
 * (`fill-opacity`/`line-opacity` 0, filter matching no code) — `MapLibreProvider.setSelectedWard`
 * sets the filter and then animates their paint properties in (see `wardHighlightAnimation.ts`).
 * Colors deliberately mirror `AdministrativeMap2D.tsx`'s CSS (`global.css`'s
 * `.map-2d-polygons path`/`.is-selected`/`.map-2d-highlight__*`) so both map surfaces read as one
 * product.
 */
export function buildWardBoundaryLayers(): LayerSpecification[] {
  return [
    {
      id: WARD_BOUNDARY_FILL_LAYER_ID,
      type: 'fill',
      source: WARD_BOUNDARY_SOURCE_ID,
      paint: { 'fill-color': '#173f38', 'fill-opacity': 0.55 },
    },
    {
      id: WARD_BOUNDARY_LINE_LAYER_ID,
      type: 'line',
      source: WARD_BOUNDARY_SOURCE_ID,
      paint: { 'line-color': '#a5c9bb', 'line-width': 0.7, 'line-opacity': 0.8 },
    },
    {
      id: WARD_SELECTED_FILL_LAYER_ID,
      type: 'fill',
      source: WARD_BOUNDARY_SOURCE_ID,
      filter: ['==', ['get', 'code'], ''],
      paint: { 'fill-color': '#b87a21', 'fill-opacity': 0 },
    },
    {
      id: WARD_SELECTED_LINE_LAYER_ID,
      type: 'line',
      source: WARD_BOUNDARY_SOURCE_ID,
      filter: ['==', ['get', 'code'], ''],
      paint: {
        'line-color': '#fff0a8',
        'line-width': 2.4,
        'line-opacity': 0,
        'line-blur': 0,
      },
    },
  ];
}
