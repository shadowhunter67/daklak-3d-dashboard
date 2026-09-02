import type { LayerSpecification } from 'maplibre-gl';
import { OSM_VECTOR_SOURCE_ID } from './roadLayers';

/**
 * Real OpenStreetMap building-footprint layers on the same PMTiles archive `roadLayers.ts`
 * defines the source for (one archive, three source-layers: roads/buildings/places — see that
 * file's doc comment for the pipeline). No pre-existing dead code to match ids against (unlike
 * roads/labels), so this file's own naming is the only convention: `buildings-fill`/
 * `buildings-outline` mirror `wardBoundaryLayers.ts`'s `administrative-boundaries-fill`/`-line`
 * naming.
 *
 * Building footprints deliberately carry NO height/`building:levels` attribute — this layer
 * renders flat 2D fill polygons only. Height estimation exists in `build_daklak_buildings.py`
 * (the pilot Buôn Ma Thuột dataset feeding `?view=world`'s Three.js extrusion) — duplicating that
 * logic here would be pure tile-size cost for zero visual benefit on a flat MapLibre `fill` layer.
 *
 * `BUILDINGS_SOURCE_LAYER` is a hard contract with the tippecanoe build (`-l buildings`) — must
 * match exactly or MapLibre silently renders nothing.
 */
export const BUILDINGS_SOURCE_LAYER = 'buildings';
export const BUILDINGS_FILL_LAYER_ID = 'buildings-fill';
export const BUILDINGS_OUTLINE_LAYER_ID = 'buildings-outline';

/** Muted fill that sits on the existing `#0d211f` background / `#173f38` ward fill without
 * competing — buildings are a texture detail, not the focal layer. `minzoom` matches the tiles
 * (tippecanoe built buildings starting at z13 — see docs/detail-map-integration.md). */
export function buildBuildingLayers(): LayerSpecification[] {
  return [
    {
      id: BUILDINGS_FILL_LAYER_ID,
      type: 'fill',
      source: OSM_VECTOR_SOURCE_ID,
      'source-layer': BUILDINGS_SOURCE_LAYER,
      minzoom: 13,
      paint: { 'fill-color': '#2c4f47', 'fill-opacity': 0.75 },
    },
    {
      id: BUILDINGS_OUTLINE_LAYER_ID,
      type: 'line',
      source: OSM_VECTOR_SOURCE_ID,
      'source-layer': BUILDINGS_SOURCE_LAYER,
      minzoom: 15,
      paint: { 'line-color': '#4a6f66', 'line-width': 0.6, 'line-opacity': 0.7 },
    },
  ];
}
