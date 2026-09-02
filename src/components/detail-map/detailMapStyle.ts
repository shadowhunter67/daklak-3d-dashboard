import type { LayerSpecification, StyleSpecification } from 'maplibre-gl';
import {
  buildWardBoundaryLayers,
  buildWardBoundarySource,
  WARD_BOUNDARY_SOURCE_ID,
} from './wardBoundaryLayers';
import { buildBuildingLayers } from './buildingLayers';
import {
  buildLabelLayers,
  buildOsmVectorSource,
  buildRoadLineLayers,
  OSM_VECTOR_SOURCE_ID,
} from './roadLayers';
import {
  buildWardLabelLayers,
  buildWardLabelSource,
  WARD_LABEL_SOURCE_ID,
} from './wardLabelLayers';
import type { DetailMapSourceAvailability } from './detailMapTypes';

/**
 * A deliberately minimal, self-authored style — not a copy of Google Maps' or any other
 * provider's visual design. Administrative ward boundaries render unconditionally, from the same
 * bundled `daklak-wards-render.json` the 2D SVG map already ships (no network/env dependency —
 * see `wardBoundaryLayers.ts`). Roads/buildings/labels only exist once a real PMTiles/vector
 * source is configured (`sourceAvailability.roads` + `sourceUrl`, see docs/detail-map-integration.md
 * for the full OSM build pipeline) — an honest "no fake road network" stance, unaffected by this
 * change. Terrain/satellite basemaps stay unimplemented seams (out of scope here).
 *
 * Deliberately pure (no `import.meta.env` read here) — every argument comes from the caller
 * (`DetailMapViewport.tsx`'s `readSourceAvailability()`/`readSourceUrl()`/`readGlyphsUrl()`),
 * which keeps this function's own unit tests (`detailMapStyle.test.ts`) env-independent. `glyphsUrl`
 * omitted entirely (rather than defaulted here) skips the two label layers without a style error —
 * the documented fallback if the glyph PBFs ever need to be dropped for budget reasons; see
 * `scripts/check_build_budget.mjs`.
 *
 * Layer draw order (style `layers` array index 0 = bottom = drawn first) is deliberate, not
 * incidental: `background` → ward fill → buildings → roads → ward outline/highlight → ward-name
 * labels → OSM road/place labels. Roads/buildings must sit ABOVE the ward fill (a 55%-opaque wash
 * would nearly hide them underneath) but BELOW the ward outline/selected-highlight layers added by
 * the ward-selection feature (so a selected ward's glow always reads on top, never occluded by
 * road/building detail). Labels draw last; ward-name labels sit just before the OSM label layers
 * so commune names win collisions over hamlet-tier clutter at province-wide zoom.
 *
 * Ward-name labels (`wardLabelLayers.ts`) render whenever a `glyphsUrl` is configured — they need
 * glyphs but NOT the env-gated PMTiles source, since their geometry is bundled like the ward
 * boundaries. So a deployment with self-hosted fonts but no OSM tiles still shows ward names.
 */
export function buildDetailMapStyle(
  sourceAvailability: DetailMapSourceAvailability,
  sourceUrl?: string,
  glyphsUrl?: string,
): StyleSpecification {
  const wardLayers = buildWardBoundaryLayers();
  const [wardFillLayer, ...wardRemainingLayers] = wardLayers;
  // Ward-name labels need glyphs (self-hosted) but not the PMTiles source — their points are
  // bundled (daklak-labels.json), same as the ward boundaries above.
  const wardLabelLayers = glyphsUrl ? buildWardLabelLayers() : [];

  const style: StyleSpecification = {
    version: 8,
    name: 'Đắk Lắk Detail Map',
    sources: {
      [WARD_BOUNDARY_SOURCE_ID]: buildWardBoundarySource(),
      ...(glyphsUrl ? { [WARD_LABEL_SOURCE_ID]: buildWardLabelSource() } : {}),
    },
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: { 'background-color': '#0d211f' },
      },
      wardFillLayer,
      ...wardRemainingLayers,
      ...wardLabelLayers,
    ],
  };
  if (glyphsUrl) style.glyphs = glyphsUrl;

  // `sourceAvailability.roads` and `sourceUrl` are both derived from VITE_DETAIL_MAP_SOURCE_URL,
  // but the type doesn't enforce that they agree — guard against emitting a source/layer set that
  // points at `pmtiles://undefined` if they ever disagree.
  if (sourceAvailability.roads && sourceUrl) {
    style.sources[OSM_VECTOR_SOURCE_ID] = buildOsmVectorSource(sourceUrl);

    const wardOutlineIndex = style.layers.findIndex((layer) => layer === wardRemainingLayers[0]);
    const osmDrawLayers: LayerSpecification[] = [
      ...buildBuildingLayers(),
      ...buildRoadLineLayers(),
    ];
    style.layers.splice(wardOutlineIndex, 0, ...osmDrawLayers);
    // OSM road/place labels draw after the ward-name labels already appended above (`style.glyphs`
    // is set once, unconditionally, when `glyphsUrl` is present — see above).
    if (glyphsUrl) style.layers.push(...buildLabelLayers());
  }

  return style;
}

export { OPENSTREETMAP_ATTRIBUTION } from './roadLayers';
