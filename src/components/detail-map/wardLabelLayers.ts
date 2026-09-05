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
 * Hard product requirement: all 102 names stay visible, always — never hidden by zoom-level
 * thinning or MapLibre's own collision culling. Two layers, mirroring the boundary layers'
 * base/selected split:
 *  - `WARD_LABEL_LAYER_ID` — every ward. `text-allow-overlap`/`text-ignore-placement` are the
 *    correctness floor (no label is ever dropped); `MapLibreProvider`'s ward-label placement pass
 *    (`wardLabelPlacement.ts`) then nudges colliding labels apart via the per-feature `textOffset`
 *    property this layer reads (`['get','textOffset']`, ems, `[0,0]` until the first pass runs) —
 *    see that module's docstring for the algorithm. `symbol-sort-key: ['get','priority']` still
 *    keeps priority-1 (urban centre) names drawn on top when two labels do end up overlapping
 *    despite displacement (e.g. an unavoidably dense cluster).
 *  - `WARD_SELECTED_LABEL_LAYER_ID` — starts filtered to no code; `MapLibreProvider.setSelectedWard`
 *    points its filter at the selected code. Always at its true anchor (no displacement) since it's
 *    the one label the user just asked to see.
 *  - `WARD_LABEL_LEADER_LAYER_ID` — thin line back to a label's true geographic point, drawn only
 *    for labels the placement pass displaced far enough to need one (see
 *    `LEADER_LINE_MIN_DISPLACEMENT_PX`). Starts empty; `MapLibreProvider` populates it alongside
 *    the label offsets.
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
export const WARD_LABEL_LEADER_SOURCE_ID = 'ward-label-leaders';
export const WARD_LABEL_LEADER_LAYER_ID = 'ward-label-leaders';

export interface WardLabelEntry {
  name: string;
  longitude: number;
  latitude: number;
  priority: number;
}

const entries = wardLabels as Record<string, WardLabelEntry>;

/** Exposed so `MapLibreProvider`'s placement pass can iterate the same 102 entries without a
 * second import of the raw JSON asset (single source of truth for "what the 102 are"). */
export function getWardLabelEntries(): ReadonlyArray<readonly [string, WardLabelEntry]> {
  return Object.entries(entries);
}

export function buildWardLabelSource(): GeoJSONSourceSpecification {
  const data: FeatureCollection<
    Point,
    { code: string; name: string; priority: number; textOffset: [number, number] }
  > = {
    type: 'FeatureCollection',
    features: Object.entries(entries).map(([code, entry]) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [entry.longitude, entry.latitude] },
      properties: {
        code,
        name: entry.name.normalize('NFC'),
        priority: entry.priority,
        // [0, 0] until MapLibreProvider's first placement pass runs (on style load) — no visual
        // jump, since an untouched label is already exactly where it should be.
        textOffset: [0, 0],
      },
    })),
  };
  return { type: 'geojson', data };
}

/** Empty until `MapLibreProvider` recomputes label placement; a leader line only exists for labels
 * displaced past `LEADER_LINE_MIN_DISPLACEMENT_PX`. */
export function buildWardLabelLeaderSource(): GeoJSONSourceSpecification {
  return {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  };
}

const TEXT_FONT = ['Noto Sans Regular'];
const IDLE_COLOR = '#f3f0d8';
const SELECTED_COLOR = '#ffe49a';
const HALO_COLOR = '#071918';

/** Zoom breakpoints for `text-size`, by priority — the single source of truth for both the
 * MapLibre `interpolate` expression below and `wardLabelFontSizePx()` (a plain-JS re-implementation
 * `MapLibreProvider`'s placement pass uses to estimate label box sizes; it has no access to
 * MapLibre's internal expression evaluator, so it must replicate this exact curve rather than
 * approximate it — a second copy that could drift, guarded by `wardLabelLayers.test.ts` asserting
 * both agree at each breakpoint). */
export const WARD_LABEL_TEXT_SIZE_STOPS: ReadonlyArray<{
  zoom: number;
  priority1: number;
  priority2: number;
}> = [
  { zoom: 7, priority1: 10, priority2: 8 },
  { zoom: 11, priority1: 13, priority2: 11 },
  { zoom: 14, priority1: 15, priority2: 13 },
];

/** Plain-JS mirror of the `text-size` MapLibre expression below, linearly interpolated the same
 * way `["interpolate",["linear"],...]` does — see `WARD_LABEL_TEXT_SIZE_STOPS`'s docstring. */
export function wardLabelFontSizePx(zoom: number, priority: number): number {
  const key = priority === 1 ? 'priority1' : 'priority2';
  const stops = WARD_LABEL_TEXT_SIZE_STOPS;
  if (zoom <= stops[0].zoom) return stops[0][key];
  if (zoom >= stops[stops.length - 1].zoom) return stops[stops.length - 1][key];
  for (let i = 0; i < stops.length - 1; i += 1) {
    const a = stops[i];
    const b = stops[i + 1];
    if (zoom >= a.zoom && zoom <= b.zoom) {
      const t = (zoom - a.zoom) / (b.zoom - a.zoom);
      return a[key] + (b[key] - a[key]) * t;
    }
  }
  return stops[stops.length - 1][key];
}

export function buildWardLabelLayers(): LayerSpecification[] {
  return [
    {
      id: WARD_LABEL_LAYER_ID,
      type: 'symbol',
      source: WARD_LABEL_SOURCE_ID,
      layout: {
        'text-field': ['get', 'name'],
        'text-font': TEXT_FONT,
        // Priority-1 names sit a touch larger and, via sort-key, draw on top when two labels do
        // overlap despite the placement pass's displacement.
        'text-size': [
          'interpolate',
          ['linear'],
          ['zoom'],
          WARD_LABEL_TEXT_SIZE_STOPS[0].zoom,
          [
            'match',
            ['get', 'priority'],
            1,
            WARD_LABEL_TEXT_SIZE_STOPS[0].priority1,
            WARD_LABEL_TEXT_SIZE_STOPS[0].priority2,
          ],
          WARD_LABEL_TEXT_SIZE_STOPS[1].zoom,
          [
            'match',
            ['get', 'priority'],
            1,
            WARD_LABEL_TEXT_SIZE_STOPS[1].priority1,
            WARD_LABEL_TEXT_SIZE_STOPS[1].priority2,
          ],
          WARD_LABEL_TEXT_SIZE_STOPS[2].zoom,
          [
            'match',
            ['get', 'priority'],
            1,
            WARD_LABEL_TEXT_SIZE_STOPS[2].priority1,
            WARD_LABEL_TEXT_SIZE_STOPS[2].priority2,
          ],
        ],
        'symbol-sort-key': ['get', 'priority'],
        'text-max-width': 8,
        'text-padding': 2,
        // Correctness floor for the "always show all 102" requirement: never let MapLibre's own
        // collision detection hide a label. `wardLabelPlacement.ts` (run from
        // `MapLibreProvider.recomputeWardLabelPlacement`) pushes colliding labels apart instead via
        // this per-feature offset (ems — divided by the current font size at write time).
        'text-allow-overlap': true,
        'text-ignore-placement': true,
        'text-offset': ['get', 'textOffset'],
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

/** Thin line from a displaced label back to its true geographic point — see this file's top
 * docstring and `wardLabelPlacement.ts`. Deliberately faint/thin: it's a quiet accessibility aid,
 * not a new visual focal point. Drawn as its own layer so it sits reliably below the text (draw
 * order in `detailMapStyle.ts` inserts this immediately before the label layers). */
export function buildWardLabelLeaderLayer(): LayerSpecification {
  return {
    id: WARD_LABEL_LEADER_LAYER_ID,
    type: 'line',
    source: WARD_LABEL_LEADER_SOURCE_ID,
    layout: { 'line-cap': 'round' },
    paint: {
      'line-color': IDLE_COLOR,
      'line-width': 1,
      'line-opacity': 0.45,
    },
  };
}
