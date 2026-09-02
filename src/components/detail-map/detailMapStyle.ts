import type { StyleSpecification } from 'maplibre-gl';
import {
  buildWardBoundaryLayers,
  buildWardBoundarySource,
  WARD_BOUNDARY_SOURCE_ID,
} from './wardBoundaryLayers';
import type { DetailMapSourceAvailability } from './detailMapTypes';

/**
 * A deliberately minimal, self-authored style — not a copy of Google Maps' or any other
 * provider's visual design. Administrative ward boundaries render unconditionally, from the same
 * bundled `daklak-wards-render.json` the 2D SVG map already ships (no network/env dependency —
 * see `wardBoundaryLayers.ts`). Road/terrain/satellite layers, in contrast, only exist once a
 * real PMTiles/vector source is configured via env vars (see docs/detail-map-integration.md) —
 * an honest "no fake road network" stance, unaffected by this change.
 */
export function buildDetailMapStyle(
  sourceAvailability: DetailMapSourceAvailability,
): StyleSpecification {
  const style: StyleSpecification = {
    version: 8,
    name: 'Đắk Lắk Detail Map',
    sources: {
      [WARD_BOUNDARY_SOURCE_ID]: buildWardBoundarySource(),
    },
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: { 'background-color': '#0d211f' },
      },
      ...buildWardBoundaryLayers(),
    ],
  };

  if (sourceAvailability.roads) {
    // Populated once a real PMTiles/vector source is configured — see RoadLayer.ts. Left as a
    // deliberate seam rather than wired to a placeholder source, per the decision to only ship
    // fake/placeholder rendering until real data exists.
  }

  return style;
}

export const OPENSTREETMAP_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';
