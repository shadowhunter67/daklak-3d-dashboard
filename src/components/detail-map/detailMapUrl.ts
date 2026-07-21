import {
  DEFAULT_DETAIL_MAP_CAMERA,
  DEFAULT_DETAIL_MAP_LAYER_STATE,
  type DetailBaseMap,
  type DetailMapCameraState,
  type DetailMapLayerState,
} from './detailMapTypes';

const baseMaps = new Set<DetailBaseMap>(['default', 'terrain', 'satellite']);
const CAMERA_EPSILON = 1e-5;

export function clampLatitude(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_DETAIL_MAP_CAMERA.latitude;
  return Math.min(90, Math.max(-90, value));
}

export function clampLongitude(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_DETAIL_MAP_CAMERA.longitude;
  return Math.min(180, Math.max(-180, value));
}

export function clampZoom(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_DETAIL_MAP_CAMERA.zoom;
  return Math.min(22, Math.max(0, value));
}

export function clampBearing(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_DETAIL_MAP_CAMERA.bearing;
  const wrapped = value % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
}

export function clampPitch(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_DETAIL_MAP_CAMERA.pitch;
  // MapLibre's own hard ceiling for camera pitch.
  return Math.min(85, Math.max(0, value));
}

function parseNumberParam(params: URLSearchParams, key: string, fallback: number): number {
  const raw = params.get(key);
  if (raw === null) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBooleanParam(params: URLSearchParams, key: string, fallback: boolean): boolean {
  const raw = params.get(key);
  if (raw === null) return fallback;
  return raw === '1' || raw === 'true';
}

export function parseDetailMapCamera(search: string): DetailMapCameraState {
  const params = new URLSearchParams(search);
  return {
    latitude: clampLatitude(parseNumberParam(params, 'lat', DEFAULT_DETAIL_MAP_CAMERA.latitude)),
    longitude: clampLongitude(parseNumberParam(params, 'lng', DEFAULT_DETAIL_MAP_CAMERA.longitude)),
    zoom: clampZoom(parseNumberParam(params, 'zoom', DEFAULT_DETAIL_MAP_CAMERA.zoom)),
    bearing: clampBearing(parseNumberParam(params, 'bearing', DEFAULT_DETAIL_MAP_CAMERA.bearing)),
    pitch: clampPitch(parseNumberParam(params, 'pitch', DEFAULT_DETAIL_MAP_CAMERA.pitch)),
  };
}

export function parseDetailMapLayers(search: string): DetailMapLayerState {
  const params = new URLSearchParams(search);
  const basemapParam = params.get('basemap') as DetailBaseMap | null;
  const baseMap =
    basemapParam && baseMaps.has(basemapParam)
      ? basemapParam
      : DEFAULT_DETAIL_MAP_LAYER_STATE.baseMap;
  // A single `labels` URL param drives both road and place labels together — the layer panel
  // still exposes them as separate checkboxes internally, but collapsing them in the URL keeps
  // the shareable scheme short. See docs/detail-map-integration.md.
  const labelsVisible = parseBooleanParam(
    params,
    'labels',
    DEFAULT_DETAIL_MAP_LAYER_STATE.roadLabelsVisible,
  );
  return {
    baseMap,
    roadsVisible: parseBooleanParam(params, 'roads', DEFAULT_DETAIL_MAP_LAYER_STATE.roadsVisible),
    roadLabelsVisible: labelsVisible,
    placeLabelsVisible: labelsVisible,
    administrativeBoundariesVisible: parseBooleanParam(
      params,
      'boundaries',
      DEFAULT_DETAIL_MAP_LAYER_STATE.administrativeBoundariesVisible,
    ),
    dashboardMetricsVisible: parseBooleanParam(
      params,
      'metrics',
      DEFAULT_DETAIL_MAP_LAYER_STATE.dashboardMetricsVisible,
    ),
    heatmapVisible: parseBooleanParam(
      params,
      'heatmap',
      DEFAULT_DETAIL_MAP_LAYER_STATE.heatmapVisible,
    ),
    terrainVisible: baseMap === 'terrain',
    satelliteVisible: baseMap === 'satellite',
  };
}

export function serializeDetailMapParams(
  camera: DetailMapCameraState,
  layers: DetailMapLayerState,
): URLSearchParams {
  const params = new URLSearchParams();
  params.set('basemap', layers.baseMap);
  params.set('roads', layers.roadsVisible ? '1' : '0');
  params.set('labels', layers.roadLabelsVisible || layers.placeLabelsVisible ? '1' : '0');
  params.set('boundaries', layers.administrativeBoundariesVisible ? '1' : '0');
  params.set('metrics', layers.dashboardMetricsVisible ? '1' : '0');
  params.set('heatmap', layers.heatmapVisible ? '1' : '0');
  params.set('lat', camera.latitude.toFixed(7));
  params.set('lng', camera.longitude.toFixed(7));
  params.set('zoom', camera.zoom.toFixed(2));
  params.set('bearing', camera.bearing.toFixed(1));
  params.set('pitch', camera.pitch.toFixed(1));
  return params;
}

export function camerasApproximatelyEqual(
  a: DetailMapCameraState,
  b: DetailMapCameraState,
  epsilon: number = CAMERA_EPSILON,
): boolean {
  return (
    Math.abs(a.latitude - b.latitude) < epsilon &&
    Math.abs(a.longitude - b.longitude) < epsilon &&
    Math.abs(a.zoom - b.zoom) < epsilon &&
    Math.abs(a.bearing - b.bearing) < epsilon &&
    Math.abs(a.pitch - b.pitch) < epsilon
  );
}

export function layerStatesEqual(a: DetailMapLayerState, b: DetailMapLayerState): boolean {
  return (
    a.baseMap === b.baseMap &&
    a.roadsVisible === b.roadsVisible &&
    a.roadLabelsVisible === b.roadLabelsVisible &&
    a.placeLabelsVisible === b.placeLabelsVisible &&
    a.administrativeBoundariesVisible === b.administrativeBoundariesVisible &&
    a.dashboardMetricsVisible === b.dashboardMetricsVisible &&
    a.heatmapVisible === b.heatmapVisible
  );
}
