import type { StyleSpecification } from 'maplibre-gl';
import type { DetailMapSourceAvailability } from './detailMapTypes';

/**
 * A deliberately minimal, self-authored style — not a copy of Google Maps' or any other
 * provider's visual design. When no vector source is configured (the default in this repo until
 * a real PMTiles file is built and published, see docs/detail-map-integration.md), this resolves
 * to just a background color and the required attribution — an honest "empty/local style"
 * rather than a fake road network.
 */
export function buildDetailMapStyle(
  sourceAvailability: DetailMapSourceAvailability,
): StyleSpecification {
  const style: StyleSpecification = {
    version: 8,
    name: 'Đắk Lắk Detail Map',
    sources: {},
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: { 'background-color': '#0d211f' },
      },
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
