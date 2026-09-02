import type { LayerSpecification, VectorSourceSpecification } from 'maplibre-gl';

/**
 * Real OpenStreetMap roads/place-labels vector source, single source of truth for the ids shared
 * between `detailMapStyle.ts` (creates the source/layers) and `MapLibreProvider.ts` (mutates
 * them) — same pattern as `wardBoundaryLayers.ts`. Built by the pipeline documented in
 * `docs/detail-map-integration.md`: Geofabrik Vietnam OSM extract -> osmium extract (clipped to
 * this project's own province outline) -> osmium tags-filter -> tippecanoe -> pmtiles convert,
 * committed to `public/maps/daklak.pmtiles`.
 *
 * `ROADS_LINE_LAYER_ID`/`ROAD_LABELS_LAYER_ID`/`PLACE_LABELS_LAYER_ID` keep the exact ids
 * `MapLibreProvider.ts`'s `setRoadsVisible`/`setRoadLabelsVisible`/`setPlaceLabelsVisible` already
 * referenced as dead code (no layer with these ids ever existed in the style before this) —
 * importing them here instead of leaving them as separate hardcoded string literals is what
 * prevents the two from drifting apart the way they already had once.
 *
 * `ROADS_SOURCE_LAYER`/`PLACES_SOURCE_LAYER` are a hard contract with the tippecanoe build: they
 * must exactly match that pipeline's `-l roads`/`-l places` layer names, or MapLibre silently
 * renders nothing (no error) because the referenced `source-layer` doesn't exist in the archive.
 */
export const OSM_VECTOR_SOURCE_ID = 'daklak-osm';
export const ROADS_SOURCE_LAYER = 'roads';
export const PLACES_SOURCE_LAYER = 'places';
export const ROADS_LINE_LAYER_ID = 'roads-line';
export const ROAD_LABELS_LAYER_ID = 'road-labels';
export const PLACE_LABELS_LAYER_ID = 'place-labels';

/** HTML attribution string for MapLibre's attribution control (a plain-text/HTML-link string is
 * what the control expects — distinct from the plain-text `map2d.osmAttribution` i18n key used
 * in the 2D SVG map's caption, a different surface/medium). */
export const OPENSTREETMAP_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';

export function buildOsmVectorSource(url: string): VectorSourceSpecification {
  return {
    type: 'vector',
    url: `pmtiles://${url}`,
    attribution: OPENSTREETMAP_ATTRIBUTION,
  };
}

const NATIONAL_HIGHWAYS = ['motorway', 'motorway_link', 'trunk', 'trunk_link'];
const PROVINCIAL_HIGHWAYS = ['primary', 'primary_link', 'secondary', 'secondary_link'];

/** Colors mirror `global.css`'s `.map-road--national`/`--provincial`/`--district` (the 2D SVG map
 * and RoadLayer3D's own national/provincial/district convention) so both map surfaces read as one
 * product. The vector tiles carry raw OSM `highway` values, not this project's derived
 * `roadClass` (see `build_daklak_roads.py`'s `classify()`, which also promotes by `ref` prefix
 * QL/DT) — this expression is the simpler `highway`-only equivalent; `ref` is present in the
 * tiles (see the tippecanoe export config's `include_tags`) if a future refinement wants it. */
export function buildRoadLineLayers(): LayerSpecification[] {
  return [
    {
      id: ROADS_LINE_LAYER_ID,
      type: 'line',
      source: OSM_VECTOR_SOURCE_ID,
      'source-layer': ROADS_SOURCE_LAYER,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': [
          'match',
          ['get', 'highway'],
          NATIONAL_HIGHWAYS,
          '#ffd166',
          PROVINCIAL_HIGHWAYS,
          '#f3a44a',
          '#d9e5df',
        ],
        'line-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          5,
          ['match', ['get', 'highway'], NATIONAL_HIGHWAYS, 0.6, 0],
          10,
          ['match', ['get', 'highway'], NATIONAL_HIGHWAYS, 1.6, PROVINCIAL_HIGHWAYS, 1.0, 0.4],
          15,
          ['match', ['get', 'highway'], NATIONAL_HIGHWAYS, 4, PROVINCIAL_HIGHWAYS, 2.6, 1.2],
        ],
        'line-opacity': 0.85,
      },
    },
  ];
}

/** Symbol layers (road names + place names). Requires a `glyphs` URL on the style — see
 * `detailMapStyle.ts` — self-hosted, never an external glyph server (this project's no-external-
 * map-API rule, SECURITY.md). Deliberately separate from `buildRoadLineLayers()`: labels draw
 * last (see `detailMapStyle.ts`'s layer-order doc comment), lines draw much earlier. */
export function buildLabelLayers(): LayerSpecification[] {
  return [
    {
      id: ROAD_LABELS_LAYER_ID,
      type: 'symbol',
      source: OSM_VECTOR_SOURCE_ID,
      'source-layer': ROADS_SOURCE_LAYER,
      minzoom: 12,
      filter: ['has', 'name'],
      layout: {
        'symbol-placement': 'line',
        'text-field': ['get', 'name'],
        'text-size': 11,
        'text-font': ['Noto Sans Regular'],
      },
      paint: {
        'text-color': '#ffe29a',
        'text-halo-color': '#071918',
        'text-halo-width': 1.2,
      },
    },
    {
      id: PLACE_LABELS_LAYER_ID,
      type: 'symbol',
      source: OSM_VECTOR_SOURCE_ID,
      'source-layer': PLACES_SOURCE_LAYER,
      minzoom: 8,
      filter: ['has', 'name'],
      layout: {
        'text-field': ['get', 'name'],
        'text-size': 12,
        'text-font': ['Noto Sans Regular'],
      },
      paint: {
        'text-color': '#fff1bd',
        'text-halo-color': '#071918',
        'text-halo-width': 1.2,
      },
    },
  ];
}
