/**
 * Shared types for the detail-map experience (MapLibre GL JS + self-hosted vector/PMTiles
 * sources). See docs/detail-map-integration.md for the architecture this backs.
 */

export type MapExperience = 'overview-3d' | 'detail-map' | 'directory';

export type DetailBaseMap = 'default' | 'terrain' | 'satellite';

export interface DetailMapLayerState {
  baseMap: DetailBaseMap;
  roadsVisible: boolean;
  roadLabelsVisible: boolean;
  placeLabelsVisible: boolean;
  administrativeBoundariesVisible: boolean;
  dashboardMetricsVisible: boolean;
  heatmapVisible: boolean;
  terrainVisible: boolean;
  satelliteVisible: boolean;
}

export interface DetailMapCameraState {
  latitude: number;
  longitude: number;
  zoom: number;
  bearing: number;
  pitch: number;
}

export interface DetailBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export type MapInteractionMode = 'browse' | 'measure';

/** Which detail-map sources are actually configured for this deployment (env-driven). */
export interface DetailMapSourceAvailability {
  roads: boolean;
  administrativeBoundaries: boolean;
  terrain: boolean;
  satellite: boolean;
}

export interface DetailMapInitOptions {
  camera: DetailMapCameraState;
  layers: DetailMapLayerState;
  /** Which base style/source URLs are configured for this deployment; see env vars in .env.example. */
  sourceAvailability: DetailMapSourceAvailability;
}

export interface GeocodingResult {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  /** Bounds to fit instead of a bare point pan, when the result represents an area. */
  bounds?: DetailBounds;
}

/** Default is always a local, in-repo provider — no external network call. */
export interface GeocoderProvider {
  search(query: string): Promise<GeocodingResult[]>;
}

/** A future paid/optional raster basemap (e.g. licensed satellite imagery). Not used by default. */
export interface RasterBasemapSource {
  id: string;
  tiles: string[];
  attribution: string;
  minZoom: number;
  maxZoom: number;
}

/**
 * The provider abstraction: the store and business logic never touch a MapLibre `Map` instance
 * or class directly. `MapLibreProvider` is the real implementation; `FakeMapProvider` is a
 * deterministic stand-in for unit/E2E tests and local development without a network tile source.
 */
export interface DetailedMapProvider {
  initialize(container: HTMLElement, options: DetailMapInitOptions): Promise<void>;

  setBaseMap(type: DetailBaseMap): void;
  setCamera(camera: DetailMapCameraState): void;
  fitBounds(bounds: DetailBounds): void;

  /**
   * Applies a full layer state at once. `detailMapLayers` in the store is always replaced as a
   * whole object (see mapStore.ts), so the provider is always given the complete state rather
   * than one changed field at a time — used both to sync live layer-panel changes and to apply
   * the initial URL-derived state once the map/style is ready (see MapLibreProvider.initialize()).
   */
  setLayers(layers: DetailMapLayerState): void;

  setRoadsVisible(visible: boolean): void;
  setRoadLabelsVisible(visible: boolean): void;
  setPlaceLabelsVisible(visible: boolean): void;
  setAdministrativeBoundariesVisible(visible: boolean): void;
  setDashboardMetricsVisible(visible: boolean): void;
  setHeatmapVisible(visible: boolean): void;

  /** Highlights a ward polygon by administrative code without necessarily moving the camera. */
  setSelectedWard(code: string | null): void;

  /** Registers a callback for user clicks resolving to an administrative code (or null for empty space). */
  onWardClick(handler: (code: string | null) => void): () => void;
  /**
   * Registers a callback for the raw click coordinate. Distance measurement needs the actual
   * point clicked, which onWardClick alone (ward code or null) cannot provide — this is the
   * minimal necessary addition beyond the task's baseline interface sketch.
   */
  onMapClick(handler: (point: { latitude: number; longitude: number }) => void): () => void;
  /** Registers a callback fired on every camera settle (debounced by the caller, not here). */
  onCameraChange(handler: (camera: DetailMapCameraState) => void): () => void;

  destroy(): void;
}

export const DEFAULT_DETAIL_MAP_LAYER_STATE: DetailMapLayerState = {
  baseMap: 'default',
  roadsVisible: true,
  roadLabelsVisible: true,
  placeLabelsVisible: true,
  administrativeBoundariesVisible: true,
  dashboardMetricsVisible: false,
  heatmapVisible: false,
  terrainVisible: false,
  satelliteVisible: false,
};

/** Centered roughly over Đắk Lắk province; matches the 3D overview's default framing. */
export const DEFAULT_DETAIL_MAP_CAMERA: DetailMapCameraState = {
  latitude: 12.9063239,
  longitude: 108.2686205,
  zoom: 8,
  bearing: 0,
  pitch: 0,
};

export const mapExperienceFromViewMode = (viewMode: '3d' | 'table' | 'map'): MapExperience =>
  viewMode === 'table' ? 'directory' : viewMode === 'map' ? 'detail-map' : 'overview-3d';

export const viewModeFromMapExperience = (experience: MapExperience): '3d' | 'table' | 'map' =>
  experience === 'directory' ? 'table' : experience === 'detail-map' ? 'map' : '3d';
