import type { ErrorEvent as MapLibreErrorEvent, Map as MapLibreMap } from 'maplibre-gl';
import { buildDetailMapStyle } from './detailMapStyle';
import type {
  DetailBaseMap,
  DetailBounds,
  DetailMapCameraState,
  DetailMapInitOptions,
  DetailMapLayerState,
  DetailedMapProvider,
} from './detailMapTypes';
import { loadMapLibreModules } from './MapLibreLoader';

// MapLibre's protocol registry is a module-global side effect, not per-Map-instance — registering
// twice would be harmless but wasteful and, per the task's explicit requirement, must not happen.
let pmtilesProtocolRegistered = false;

/**
 * Real provider: wraps a maplibre-gl `Map` instance. The store and the rest of the app never see
 * this class or import maplibre-gl directly — see detailMapTypes.ts's DetailedMapProvider.
 *
 * Road/administrative-boundary/heatmap/metric layers are only added when the corresponding
 * `sourceAvailability` flag is true (i.e. a real source URL is configured via env vars — see
 * .env.example and docs/detail-map-integration.md). With no source configured, the matching
 * setXVisible() calls are safe no-ops: there is deliberately no fake/placeholder geodata baked
 * into this provider.
 */
export class MapLibreProvider implements DetailedMapProvider {
  private map: MapLibreMap | null = null;
  private layers: DetailMapLayerState | null = null;
  private sourceAvailability: DetailMapInitOptions['sourceAvailability'] | null = null;
  private readonly wardClickHandlers = new Set<(code: string | null) => void>();
  private readonly mapClickHandlers = new Set<
    (point: { latitude: number; longitude: number }) => void
  >();
  private readonly cameraChangeHandlers = new Set<(camera: DetailMapCameraState) => void>();
  // Lets destroy() unstick the "wait for load" promise in initialize() if destroy() runs first.
  // Without this, that promise would hang forever: MapLibre's Map.remove() doesn't fire `load`
  // or `error`, so nothing would ever settle it on its own.
  private settlePendingLoad: (() => void) | null = null;

  async initialize(container: HTMLElement, options: DetailMapInitOptions): Promise<void> {
    const { maplibregl, pmtiles } = await loadMapLibreModules();
    if (!pmtilesProtocolRegistered) {
      const protocol = new pmtiles.Protocol();
      maplibregl.addProtocol('pmtiles', protocol.tile);
      pmtilesProtocolRegistered = true;
    }
    this.layers = options.layers;
    this.sourceAvailability = options.sourceAvailability;
    const map = new maplibregl.Map({
      container,
      style: buildDetailMapStyle(options.sourceAvailability),
      center: [options.camera.longitude, options.camera.latitude],
      zoom: options.camera.zoom,
      bearing: options.camera.bearing,
      pitch: options.camera.pitch,
      attributionControl: { compact: false },
    });
    this.map = map;

    // Resolve only once MapLibre has actually finished loading the style — before that, layers
    // referenced by id (setLayoutProperty/getLayer) don't exist yet, so a caller that treats
    // initialize() as "done" too early would have its layer-visibility calls silently no-op.
    await new Promise<void>((resolve, reject) => {
      const onLoad = () => {
        map.off('error', onError);
        this.settlePendingLoad = null;
        resolve();
      };
      const onError = (event: MapLibreErrorEvent) => {
        map.off('load', onLoad);
        this.settlePendingLoad = null;
        // A tile-load error firing *after* `load` never reaches this handler at all (it's
        // detached the moment `load` settles this promise, in onLoad above) — so this only ever
        // rejects for a genuine failure to complete the map's first load, not a later recoverable
        // per-tile error, which is the distinction docs/detail-map-integration.md asks for.
        reject(new Error(event.error.message || 'MapLibre không thể tải bản đồ chi tiết'));
      };
      this.settlePendingLoad = () => {
        map.off('load', onLoad);
        map.off('error', onError);
        resolve();
      };
      map.once('load', onLoad);
      map.once('error', onError);
    });

    if (this.map !== map) return; // destroy() ran while we were waiting; nothing left to wire up

    map.on('moveend', () => this.emitCameraChange());
    map.on('click', (event) => {
      const code = this.resolveWardCodeAt(event.point);
      this.wardClickHandlers.forEach((handler) => handler(code));
      this.mapClickHandlers.forEach((handler) =>
        handler({ latitude: event.lngLat.lat, longitude: event.lngLat.lng }),
      );
    });
    // Apply the initial layer/basemap state now that the style can actually accept it — the
    // style built in buildDetailMapStyle() only reflects sourceAvailability, never the caller's
    // requested visibility (e.g. a shared URL with roads=0&heatmap=1&basemap=terrain).
    this.setLayers(options.layers);
  }

  private emitCameraChange() {
    if (!this.map) return;
    const center = this.map.getCenter();
    const camera: DetailMapCameraState = {
      latitude: center.lat,
      longitude: center.lng,
      zoom: this.map.getZoom(),
      bearing: this.map.getBearing(),
      pitch: this.map.getPitch(),
    };
    this.cameraChangeHandlers.forEach((handler) => handler(camera));
  }

  private resolveWardCodeAt(point: { x: number; y: number }): string | null {
    if (!this.map || !this.sourceAvailability?.administrativeBoundaries) return null;
    const features = this.map.queryRenderedFeatures([point.x, point.y], {
      layers: ['administrative-boundaries-fill'],
    });
    const code = features[0]?.properties?.code;
    return typeof code === 'string' ? code : null;
  }

  setBaseMap(type: DetailBaseMap): void {
    if (!this.map || !this.layers) return;
    this.layers = { ...this.layers, baseMap: type };
    // Terrain/satellite rendering only activates once a real source is configured; see
    // docs/detail-map-integration.md for the (currently unmet) prerequisites.
    if (type === 'terrain' && this.sourceAvailability?.terrain) {
      this.map.setTerrain({ source: 'terrain-dem', exaggeration: 1.2 });
    } else {
      this.map.setTerrain(null);
    }
  }

  setCamera(camera: DetailMapCameraState): void {
    this.map?.jumpTo({
      center: [camera.longitude, camera.latitude],
      zoom: camera.zoom,
      bearing: camera.bearing,
      pitch: camera.pitch,
    });
  }

  fitBounds(bounds: DetailBounds): void {
    this.map?.fitBounds(
      [
        [bounds.west, bounds.south],
        [bounds.east, bounds.north],
      ],
      { padding: 48, animate: true },
    );
  }

  private setLayerVisibility(layerId: string, visible: boolean) {
    if (!this.map?.getLayer(layerId)) return;
    this.map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
  }

  setLayers(layers: DetailMapLayerState): void {
    this.layers = layers;
    this.setBaseMap(layers.baseMap);
    this.setRoadsVisible(layers.roadsVisible);
    this.setRoadLabelsVisible(layers.roadLabelsVisible);
    this.setPlaceLabelsVisible(layers.placeLabelsVisible);
    this.setAdministrativeBoundariesVisible(layers.administrativeBoundariesVisible);
    this.setDashboardMetricsVisible(layers.dashboardMetricsVisible);
    this.setHeatmapVisible(layers.heatmapVisible);
  }

  setRoadsVisible(visible: boolean): void {
    if (!this.sourceAvailability?.roads) return;
    this.setLayerVisibility('roads-line', visible);
  }

  setRoadLabelsVisible(visible: boolean): void {
    if (!this.sourceAvailability?.roads) return;
    this.setLayerVisibility('road-labels', visible);
  }

  setPlaceLabelsVisible(visible: boolean): void {
    if (!this.sourceAvailability?.roads) return;
    this.setLayerVisibility('place-labels', visible);
  }

  setAdministrativeBoundariesVisible(visible: boolean): void {
    if (!this.sourceAvailability?.administrativeBoundaries) return;
    this.setLayerVisibility('administrative-boundaries-line', visible);
    this.setLayerVisibility('administrative-boundaries-fill', visible);
  }

  setDashboardMetricsVisible(visible: boolean): void {
    if (!this.sourceAvailability?.administrativeBoundaries) return;
    this.setLayerVisibility('dashboard-metrics-fill', visible);
  }

  setHeatmapVisible(visible: boolean): void {
    if (!this.sourceAvailability?.administrativeBoundaries) return;
    this.setLayerVisibility('dashboard-heatmap', visible);
  }

  setSelectedWard(code: string | null): void {
    if (!this.map?.getLayer('administrative-boundaries-selected')) return;
    this.map.setFilter('administrative-boundaries-selected', ['==', ['get', 'code'], code ?? '']);
  }

  onWardClick(handler: (code: string | null) => void): () => void {
    this.wardClickHandlers.add(handler);
    return () => this.wardClickHandlers.delete(handler);
  }

  onMapClick(handler: (point: { latitude: number; longitude: number }) => void): () => void {
    this.mapClickHandlers.add(handler);
    return () => this.mapClickHandlers.delete(handler);
  }

  onCameraChange(handler: (camera: DetailMapCameraState) => void): () => void {
    this.cameraChangeHandlers.add(handler);
    return () => this.cameraChangeHandlers.delete(handler);
  }

  destroy(): void {
    this.settlePendingLoad?.();
    this.wardClickHandlers.clear();
    this.mapClickHandlers.clear();
    this.cameraChangeHandlers.clear();
    this.map?.remove();
    this.map = null;
  }
}
