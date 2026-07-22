/**
 * Layer registry: one MapLayerDescriptor per toggleable map layer this app has, covering both the
 * 3D/2D road layer and the six detail-map (MapLibre) layers. `MapLayerPanel.tsx` reads
 * title/group/legend copy from here; the actual toggle mechanics stay on the existing Zustand
 * store fields (`roadsVisible`, `detailMapLayers`) unchanged — see docs/data-platform-architecture.md
 * "migration" section for why.
 */
import { PmtilesSourceAdapter } from '../adapters/PmtilesSourceAdapter';
import type { MapLayerDescriptor } from '../schemas/layer';

function readEnv(name: string): string | undefined {
  const value: unknown = import.meta.env[name];
  return typeof value === 'string' ? value : undefined;
}

const detailMapRoadsSource = new PmtilesSourceAdapter({
  datasetId: 'road-network-detail-map-pmtiles',
  configuredUrl: readEnv('VITE_DETAIL_MAP_SOURCE_URL'),
  attribution: '© OpenStreetMap contributors (ODbL 1.0)',
}).describe();

function detailMapAvailability(): MapLayerDescriptor['availability'] {
  return detailMapRoadsSource.available ? 'available' : 'not-configured';
}

export const LAYER_REGISTRY: readonly MapLayerDescriptor[] = [
  {
    id: 'road-3d2d',
    title: 'Đường giao thông (3D/2D)',
    group: 'Bản đồ 3D / Danh sách 2D',
    datasetId: 'road-network-osm-3d2d',
    renderer: 'three',
    geometryType: 'line',
    defaultVisible: false,
    legend: {
      title: 'Cấp đường',
      entries: [
        { label: 'Quốc lộ', color: '#e2bb55' },
        { label: 'Tỉnh lộ', color: '#8fb7ff' },
        { label: 'Huyện lộ', color: '#9fd7a6' },
      ],
    },
    accessPolicyId: 'public-standard',
    availability: 'available',
  },
  {
    id: 'roadsVisible',
    title: 'Đường',
    group: 'Bản đồ chi tiết',
    datasetId: 'road-network-detail-map-pmtiles',
    renderer: 'maplibre',
    geometryType: 'line',
    defaultVisible: true,
    accessPolicyId: 'public-standard',
    availability: detailMapAvailability(),
  },
  {
    id: 'roadLabelsVisible',
    title: 'Tên đường',
    group: 'Bản đồ chi tiết',
    datasetId: 'road-network-detail-map-pmtiles',
    renderer: 'maplibre',
    geometryType: 'point',
    defaultVisible: true,
    accessPolicyId: 'public-standard',
    availability: detailMapAvailability(),
  },
  {
    id: 'placeLabelsVisible',
    title: 'Địa danh',
    group: 'Bản đồ chi tiết',
    datasetId: 'road-network-detail-map-pmtiles',
    renderer: 'maplibre',
    geometryType: 'point',
    defaultVisible: true,
    accessPolicyId: 'public-standard',
    availability: detailMapAvailability(),
  },
  {
    id: 'administrativeBoundariesVisible',
    title: 'Ranh giới hành chính',
    group: 'Bản đồ chi tiết',
    datasetId: 'administrative-units',
    renderer: 'maplibre',
    geometryType: 'polygon',
    defaultVisible: true,
    accessPolicyId: 'public-standard',
    availability: detailMapAvailability(),
  },
  {
    id: 'dashboardMetricsVisible',
    title: 'Chỉ số dashboard',
    group: 'Bản đồ chi tiết',
    datasetId: 'commune-demographic-illustrative',
    renderer: 'maplibre',
    geometryType: 'polygon',
    defaultVisible: false,
    accessPolicyId: 'public-standard',
    availability: detailMapAvailability(),
  },
  {
    id: 'heatmapVisible',
    title: 'Heatmap',
    group: 'Bản đồ chi tiết',
    datasetId: 'heatmap-illustrative',
    renderer: 'maplibre',
    geometryType: 'polygon',
    defaultVisible: false,
    accessPolicyId: 'public-standard',
    availability: detailMapAvailability(),
  },
];

export function getLayerDescriptor(id: string): MapLayerDescriptor | undefined {
  return LAYER_REGISTRY.find((layer) => layer.id === id);
}
