import type { GeoJSONSourceSpecification, LayerSpecification } from 'maplibre-gl';
import { verifiedTourismDestinations } from '../../entities/tourism/verifiedTourismDestinations';

/**
 * Lớp điểm đến du lịch (đã xác minh nguồn) trên bản đồ chi tiết. Dữ liệu đóng gói sẵn như ranh giới
 * hành chính nên không phụ thuộc mạng. Tắt mặc định; `MapLibreProvider.setTourismVisible` bật/tắt
 * cả điểm và nhãn cùng lúc và nối sự kiện click → popup.
 */
export const TOURISM_SOURCE_ID = 'tourism-destinations';
export const TOURISM_POINT_LAYER_ID = 'tourism-destinations-point';
export const TOURISM_LABEL_LAYER_ID = 'tourism-destinations-label';
export const TOURISM_LAYER_IDS = [TOURISM_POINT_LAYER_ID, TOURISM_LABEL_LAYER_ID];

const TOURISM_COLOR = '#2aa876';

export function buildTourismSource(): GeoJSONSourceSpecification {
  return {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: verifiedTourismDestinations.map((d) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: d.coordinates },
        properties: { id: d.id, name: d.name, category: d.category, sourceUrl: d.sourceUrl },
      })),
    },
  };
}

export function buildTourismLayers(withLabels: boolean): LayerSpecification[] {
  const layers: LayerSpecification[] = [
    {
      id: TOURISM_POINT_LAYER_ID,
      type: 'circle',
      source: TOURISM_SOURCE_ID,
      layout: { visibility: 'none' },
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 7, 5, 12, 9],
        'circle-color': TOURISM_COLOR,
        'circle-stroke-color': '#0b1f1c',
        'circle-stroke-width': 1.5,
      },
    },
  ];
  if (withLabels) {
    layers.push({
      id: TOURISM_LABEL_LAYER_ID,
      type: 'symbol',
      source: TOURISM_SOURCE_ID,
      minzoom: 9,
      layout: {
        visibility: 'none',
        'text-field': ['get', 'name'],
        'text-font': ['Noto Sans Regular'],
        'text-size': 11,
        'text-anchor': 'top',
        'text-offset': [0, 0.9],
        'text-max-width': 9,
      },
      paint: { 'text-color': '#f4ead2', 'text-halo-color': '#0b1f1c', 'text-halo-width': 1.6 },
    });
  }
  return layers;
}
