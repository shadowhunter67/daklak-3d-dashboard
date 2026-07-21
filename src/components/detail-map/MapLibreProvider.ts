import type { Map as MapLibreMap } from 'maplibre-gl';
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

  async initialize(container: HTMLElement, options: DetailMapInitOptions): Promise<void> {
    const { maplibregl, pmtiles } = await loadMapLibreModules();
    if (!pmtilesProtocolRegistered) {
      const protocol = new pmtiles.Protocol();
      maplibregl.addProtocol('pmtiles', protocol.tile);
      pmtilesProtocolRegistered = true;
    }
    this.layers = options.layers;
    this.sourceAvailability = options.sourceAvailability;
    this.map = new maplibregl.Map({
      container,
      style: buildDetailMapStyle(options.sourceAvailability),
      center: [options.camera.longitude, options.camera.latitude],
      zoom: options.camera.zoom,
      bearing: options.camera.bearing,
      pitch: options.camera.pitch,
      attributionControl: { compact: false },
    });
    this.map.on('moveend', () => this.emitCameraChange());
    this.map.on('click', (event) => {
      const code = this.resolveWardCodeAt(event.point);
      this.wardClickHandlers.forEach((handler) => handler(code));
      this.mapClickHandlers.forEach((handler) =>
        handler({ latitude: event.lngLat.lat, longitude: event.lngLat.lng }),
      );
    });
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
    this.wardClickHandlers.clear();
    this.mapClickHandlers.clear();
    this.cameraChangeHandlers.clear();
    this.map?.remove();
    this.map = null;
  }
}
