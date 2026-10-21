/**
 * Shared types for the detail-map experience (MapLibre GL JS + self-hosted vector/PMTiles
 * sources). See docs/detail-map-integration.md for the architecture this backs.
 */

import type { DetailMapTheme } from './detailMapTheme';
import type { PlanningThemeId } from './planningThemes';

export type MapExperience = 'overview-3d' | 'detail-map';

export type DetailBaseMap = 'default' | 'terrain' | 'satellite';

/** Active illustrative planning overlay, or `'none'`. One at a time (radio) — see planningThemes.ts. */
export type PlanningOverlay = PlanningThemeId | 'none';

export interface DetailMapLayerState {
  baseMap: DetailBaseMap;
  roadsVisible: boolean;
  roadLabelsVisible: boolean;
  placeLabelsVisible: boolean;
  administrativeBoundariesVisible: boolean;
  /** Ward/commune NAME labels (`wardLabelLayers.ts`) — bundled data, own toggle, independent of
   * the `administrativeBoundariesVisible` polygon/outline toggle. */
  wardLabelsVisible: boolean;
  buildingsVisible: boolean;
  /** Public-service POI layer (bệnh viện/trường học/cơ quan nhà nước) — `serviceLayers.ts`, a
   * separate PMTiles archive from roads/buildings/places. Off by default (advanced tier), same
   * "not blindly on" convention as `keyProjectsVisible`/`planningZonesVisible`. */
  servicesVisible: boolean;
  dashboardMetricsVisible: boolean;
  heatmapVisible: boolean;
  terrainVisible: boolean;
  satelliteVisible: boolean;
  /** Illustrative planning overlay (radio, not a boolean toggle) — `'none'` by default. */
  planningOverlay: PlanningOverlay;
  /** Externally-sourced "key projects" reference overlay (`keyProjects.ts`) — off by default. */
  keyProjectsVisible: boolean;
  /** Approved-planning-zone reference overlay (`planningZones.ts`) — off by default. */
  planningZonesVisible: boolean;
}

export interface DetailMapCameraState {
  latitude: number;
  longitude: number;
  zoom: number;
  bearing: number;
  pitch: number;
}

/** Options for `fitBounds`. `paddingPx` reserves room for UI that overlays the canvas (footer bar,
 * floating buttons); default is 48 px on every side. */
export interface DetailFitOptions {
  animate?: boolean;
  durationMs?: number;
  paddingPx?: { top: number; right: number; bottom: number; left: number };
}

export interface DetailBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export type MapInteractionMode = 'browse' | 'measure' | 'radius';

/** Which detail-map sources are actually configured for this deployment (env-driven), with one
 * exception: `administrativeBoundaries` is always `true` — see `wardBoundaryLayers.ts`'s doc
 * comment (bundled local GeoJSON, not env-gated). `dashboardOverlays` is split out from
 * `administrativeBoundaries` deliberately: `dashboardMetricsVisible`/`heatmapVisible` still gate
 * on the env-configured PMTiles source (their layers don't exist in the style yet), so folding
 * them into the now-always-true `administrativeBoundaries` flag would make the layer panel claim
 * they're available when they aren't. */
export interface DetailMapSourceAvailability {
  roads: boolean;
  /** VITE_DETAIL_MAP_SERVICES_URL — a separate PMTiles archive from `roads` (see
   * `serviceLayers.ts`'s doc comment for why it isn't folded into the same source). */
  services: boolean;
  administrativeBoundaries: boolean;
  dashboardOverlays: boolean;
  terrain: boolean;
  satellite: boolean;
}

export interface DetailMapInitOptions {
  camera: DetailMapCameraState;
  layers: DetailMapLayerState;
  /** Which base style/source URLs are configured for this deployment; see env vars in .env.example. */
  sourceAvailability: DetailMapSourceAvailability;
  /** The real PMTiles/vector source URL (VITE_DETAIL_MAP_SOURCE_URL), when `sourceAvailability.roads`
   * is true — `sourceAvailability` alone is a boolean, not enough to actually build the style's
   * vector source. Undefined when no source is configured. */
  sourceUrl?: string;
  /** Same as `sourceUrl` but for the separate services PMTiles archive
   * (VITE_DETAIL_MAP_SERVICES_URL / `sourceAvailability.services`) — see `serviceLayers.ts`. */
  servicesSourceUrl?: string;
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
  /** `animate: false` (default `true`) jumps instantly instead of easing/flying — used when
   * `state.reducedMotion` is set. `durationMs` only applies when animating. */
  fitBounds(bounds: DetailBounds, options?: DetailFitOptions): void;

  /**
   * Applies a full layer state at once. `detailMapLayers` in the store is always replaced as a
   * whole object (see mapStore.ts), so the provider is always given the complete state rather
   * than one changed field at a time — used both to sync live layer-panel changes and to apply
   * the initial URL-derived state once the map/style is ready (see MapLibreProvider.initialize()).
   * `reducedMotion` gates the "khoanh vùng"/"vẽ đường" reveal animations below — `true` applies
   * the settled end-state directly, same convention as `setSelectedWard`'s `animate` option.
   */
  setLayers(layers: DetailMapLayerState, options?: { reducedMotion?: boolean }): void;

  setRoadsVisible(visible: boolean): void;
  setRoadLabelsVisible(visible: boolean): void;
  setPlaceLabelsVisible(visible: boolean): void;
  setAdministrativeBoundariesVisible(visible: boolean): void;
  setWardLabelsVisible(visible: boolean): void;
  setPlanningOverlay(overlay: PlanningOverlay): void;
  /** `animate` (default `false`) plays the "vẽ đường" line draw-on + point fade-in when the layer
   * transitions off→on; `MapLibreProvider` only ever passes `true` for an actual user-driven
   * transition (never on initial load, never under reduced motion) — see `setLayers`. */
  setKeyProjectsVisible(visible: boolean, options?: { animate?: boolean }): void;
  /** `animate` (default `false`) plays the "khoanh vùng" glow-reveal when the layer transitions
   * off→on — same convention as `setKeyProjectsVisible`. */
  setPlanningZonesVisible(visible: boolean, options?: { animate?: boolean }): void;
  setBuildingsVisible(visible: boolean): void;
  setServicesVisible(visible: boolean): void;
  setDashboardMetricsVisible(visible: boolean): void;
  setHeatmapVisible(visible: boolean): void;
  /** Re-colours the base layers (ground, wards, ward names) for the app theme without reloading the style. */
  setTheme(theme: DetailMapTheme): void;
  /** Re-measures the container (call when the stage size changes). */
  resize(): void;

  /** Highlights a ward polygon by administrative code without necessarily moving the camera.
   * `options.animate` (default `true`) plays the glow-reveal transition; `false` (used when
   * `state.reducedMotion` is set) snaps straight to the settled/hidden highlight state. */
  setSelectedWard(code: string | null, options?: { animate?: boolean }): void;

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

export type { DetailMapTheme } from './detailMapTheme';

export const DEFAULT_DETAIL_MAP_LAYER_STATE: DetailMapLayerState = {
  baseMap: 'default',
  roadsVisible: true,
  roadLabelsVisible: true,
  placeLabelsVisible: true,
  administrativeBoundariesVisible: true,
  wardLabelsVisible: true,
  buildingsVisible: true,
  servicesVisible: false,
  dashboardMetricsVisible: false,
  heatmapVisible: false,
  terrainVisible: false,
  satelliteVisible: false,
  planningOverlay: 'none',
  keyProjectsVisible: false,
  planningZonesVisible: false,
};

/** Centered on the province's real bounding box (lng 107.484–109.459, lat 12.161–13.695). The old
 * centre sat ~0.2° west of it, which pushed the eastern coast (Hòa Hiệp, Đông Hòa) off the right
 * edge of an 864 px canvas at zoom 8. Zoom stays 8: road layers have `minzoom: 8`. */
export const DEFAULT_DETAIL_MAP_CAMERA: DetailMapCameraState = {
  latitude: 12.9279,
  longitude: 108.4715,
  zoom: 8,
  bearing: 0,
  pitch: 0,
};

/** True while the camera is still the untouched default (nobody panned/zoomed or deep-linked). */
export function isDefaultDetailMapCamera(camera: DetailMapCameraState): boolean {
  const d = DEFAULT_DETAIL_MAP_CAMERA;
  return (
    Math.abs(camera.latitude - d.latitude) < 1e-4 &&
    Math.abs(camera.longitude - d.longitude) < 1e-4 &&
    Math.abs(camera.zoom - d.zoom) < 1e-2 &&
    Math.abs(camera.bearing - d.bearing) < 1e-2 &&
    Math.abs(camera.pitch - d.pitch) < 1e-2
  );
}

export const mapExperienceFromViewMode = (viewMode: '3d' | 'map'): MapExperience =>
  viewMode === 'map' ? 'detail-map' : 'overview-3d';

export const viewModeFromMapExperience = (experience: MapExperience): '3d' | 'map' =>
  experience === 'detail-map' ? 'map' : '3d';
