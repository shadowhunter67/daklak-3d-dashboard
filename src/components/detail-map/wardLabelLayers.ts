import type { GeoJSONSourceSpecification, LayerSpecification } from 'maplibre-gl';
import type { FeatureCollection, Point } from 'geojson';
import wardLabels from '../../assets/maps/daklak/daklak-labels.json';

/**
 * Ward/commune NAME labels for the detail map — the MapLibre counterpart of the 2D SVG map's
 * `administrativeLabelLayout.ts`. The detail map previously rendered ward *boundaries*
 * (`wardBoundaryLayers.ts`) but no ward names at all; only OSM road/place/hamlet names came
 * through (`roadLayers.ts`), so a selected ward showed a gold highlight with no label.
 *
 * Placement points + `priority` (1 = ward/urban centre, 2 = the rest) come from the same bundled
 * `daklak-labels.json` the 2D map and the local search index already ship (102 entries) — curated
 * label anchors, not polygon centroids, so a name never lands outside an awkwardly-shaped ward.
 * No network/env dependency, exactly like `wardBoundaryLayers.ts`.
 *
 * Two layers, mirroring the boundary layers' base/selected split:
 *  - `WARD_LABEL_LAYER_ID` — every ward, MapLibre's collision detection thins them at low zoom;
 *    `symbol-sort-key: ['get','priority']` makes priority-1 names win those collisions.
 *  - `WARD_SELECTED_LABEL_LAYER_ID` — starts filtered to no code; `MapLibreProvider.setSelectedWard`
 *    points its filter at the selected code. `text-allow-overlap`/`text-ignore-placement` keep the
 *    selected name visible no matter how crowded that spot is.
 *
 * Colors mirror `AdministrativeMap2D`'s CSS (`#f3f0d8` idle, `#ffe49a` selected) so both map
 * surfaces read as one product — same rationale as `wardBoundaryLayers.ts`.
 *
 * Requires a `glyphs` URL on the style (self-hosted `public/fonts/`, never a third-party glyph
 * server — SECURITY.md); `detailMapStyle.ts` only adds these layers when one is configured.
 */
export const WARD_LABEL_SOURCE_ID = 'ward-labels';
export const WARD_LABEL_LAYER_ID = 'ward-labels';
export const WARD_SELECTED_LABEL_LAYER_ID = 'ward-labels-selected';

interface WardLabelEntry {
  name: string;
  longitude: number;
  latitude: number;
  priority: number;
}

const entries = wardLabels as Record<string, WardLabelEntry>;

export function buildWardLabelSource(): GeoJSONSourceSpecification {
  const data: FeatureCollection<Point, { code: string; name: string; priority: number }> = {
    type: 'FeatureCollection',
    features: Object.entries(entries).map(([code, entry]) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [entry.longitude, entry.latitude] },
      properties: { code, name: entry.name.normalize('NFC'), priority: entry.priority },
    })),
  };
  return { type: 'geojson', data };
}

const TEXT_FONT = ['Noto Sans Regular'];
const IDLE_COLOR = '#f3f0d8';
const SELECTED_COLOR = '#ffe49a';
const HALO_COLOR = '#071918';

export function buildWardLabelLayers(): LayerSpecification[] {
  return [
    {
      id: WARD_LABEL_LAYER_ID,
      type: 'symbol',
      source: WARD_LABEL_SOURCE_ID,
      layout: {
        'text-field': ['get', 'name'],
        'text-font': TEXT_FONT,
        // Priority-1 names sit a touch larger and, via sort-key, win collisions at low zoom.
        'text-size': [
          'interpolate',
          ['linear'],
          ['zoom'],
          7,
          ['match', ['get', 'priority'], 1, 10, 8],
          11,
          ['match', ['get', 'priority'], 1, 13, 11],
          14,
          ['match', ['get', 'priority'], 1, 15, 13],
        ],
        'symbol-sort-key': ['get', 'priority'],
        'text-max-width': 8,
        'text-padding': 2,
      },
      paint: {
        'text-color': IDLE_COLOR,
        'text-halo-color': HALO_COLOR,
        'text-halo-width': 1.4,
        'text-halo-blur': 0.4,
      },
    },
    {
      id: WARD_SELECTED_LABEL_LAYER_ID,
      type: 'symbol',
      source: WARD_LABEL_SOURCE_ID,
      filter: ['==', ['get', 'code'], ''],
      layout: {
        'text-field': ['get', 'name'],
        'text-font': TEXT_FONT,
        'text-size': ['interpolate', ['linear'], ['zoom'], 7, 12, 11, 15, 14, 17],
        'text-allow-overlap': true,
        'text-ignore-placement': true,
        'text-max-width': 10,
      },
      paint: {
        'text-color': SELECTED_COLOR,
        'text-halo-color': HALO_COLOR,
        'text-halo-width': 2,
        'text-halo-blur': 0.5,
      },
    },
  ];
}
