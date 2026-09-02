import type {
  DetailBaseMap,
  DetailBounds,
  DetailMapCameraState,
  DetailMapInitOptions,
  DetailMapLayerState,
  DetailedMapProvider,
} from './detailMapTypes';

/**
 * Deterministic stand-in for MapLibreProvider: no network, no WebGL/canvas, no timers. Used by
 * unit tests, Playwright E2E (via VITE_DETAIL_MAP_PROVIDER=fake), and local development without
 * a configured tile source. Renders a plain, inspectable placeholder element instead of a real
 * map so tests can assert on `data-*` attributes rather than pixels.
 */
export class FakeMapProvider implements DetailedMapProvider {
  private placeholder: HTMLDivElement | null = null;
  private camera: DetailMapCameraState | null = null;
  private layers: DetailMapLayerState | null = null;
  private selectedWard: string | null = null;
  private selectedWardAnimated = true;
  private lastFitBoundsAnimated = true;
  private readonly wardClickHandlers = new Set<(code: string | null) => void>();
  private readonly mapClickHandlers = new Set<
    (point: { latitude: number; longitude: number }) => void
  >();
  private readonly cameraChangeHandlers = new Set<(camera: DetailMapCameraState) => void>();
  private initializeCallCount = 0;
  private destroyed = false;

  async initialize(container: HTMLElement, options: DetailMapInitOptions): Promise<void> {
    this.initializeCallCount += 1;
    this.camera = options.camera;
    this.layers = options.layers;
    this.destroyed = false;
    this.placeholder = document.createElement('div');
    this.placeholder.setAttribute('data-testid', 'fake-map-provider');
    this.placeholder.setAttribute('role', 'img');
    this.placeholder.setAttribute(
      'aria-label',
      'Bản đồ chi tiết (giả lập, dùng cho phát triển/kiểm thử)',
    );
    this.updatePlaceholderDataset();
    container.appendChild(this.placeholder);
  }

  private updatePlaceholderDataset() {
    if (!this.placeholder || !this.camera || !this.layers) return;
    this.placeholder.dataset.baseMap = this.layers.baseMap;
    this.placeholder.dataset.roadsVisible = String(this.layers.roadsVisible);
    this.placeholder.dataset.roadLabelsVisible = String(this.layers.roadLabelsVisible);
    this.placeholder.dataset.placeLabelsVisible = String(this.layers.placeLabelsVisible);
    this.placeholder.dataset.administrativeBoundariesVisible = String(
      this.layers.administrativeBoundariesVisible,
    );
    this.placeholder.dataset.buildingsVisible = String(this.layers.buildingsVisible);
    this.placeholder.dataset.dashboardMetricsVisible = String(this.layers.dashboardMetricsVisible);
    this.placeholder.dataset.heatmapVisible = String(this.layers.heatmapVisible);
    this.placeholder.dataset.zoom = this.camera.zoom.toFixed(2);
    this.placeholder.dataset.selectedWard = this.selectedWard ?? '';
    this.placeholder.dataset.selectedWardAnimated = String(this.selectedWardAnimated);
    this.placeholder.dataset.lastFitBoundsAnimated = String(this.lastFitBoundsAnimated);
  }

  setBaseMap(type: DetailBaseMap): void {
    if (!this.layers) return;
    this.layers = { ...this.layers, baseMap: type };
    this.updatePlaceholderDataset();
  }

  setCamera(camera: DetailMapCameraState): void {
    this.camera = camera;
    this.updatePlaceholderDataset();
  }

  fitBounds(bounds: DetailBounds, options?: { animate?: boolean; durationMs?: number }): void {
    if (!this.placeholder) return;
    this.lastFitBoundsAnimated = options?.animate !== false;
    // Assertable via the dataset in tests, e.g. "12.1,108.2,13.7,109.5" (south,west,north,east).
    this.placeholder.dataset.lastFitBounds = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;
    this.updatePlaceholderDataset();
  }

  setLayers(layers: DetailMapLayerState): void {
    this.setBaseMap(layers.baseMap);
    this.setRoadsVisible(layers.roadsVisible);
    this.setRoadLabelsVisible(layers.roadLabelsVisible);
    this.setPlaceLabelsVisible(layers.placeLabelsVisible);
    this.setAdministrativeBoundariesVisible(layers.administrativeBoundariesVisible);
    this.setBuildingsVisible(layers.buildingsVisible);
    this.setDashboardMetricsVisible(layers.dashboardMetricsVisible);
    this.setHeatmapVisible(layers.heatmapVisible);
  }

  setRoadsVisible(visible: boolean): void {
    this.setLayerFlag('roadsVisible', visible);
  }

  setRoadLabelsVisible(visible: boolean): void {
    this.setLayerFlag('roadLabelsVisible', visible);
  }

  setPlaceLabelsVisible(visible: boolean): void {
    this.setLayerFlag('placeLabelsVisible', visible);
  }

  setAdministrativeBoundariesVisible(visible: boolean): void {
    this.setLayerFlag('administrativeBoundariesVisible', visible);
  }

  setBuildingsVisible(visible: boolean): void {
    this.setLayerFlag('buildingsVisible', visible);
  }

  setDashboardMetricsVisible(visible: boolean): void {
    this.setLayerFlag('dashboardMetricsVisible', visible);
  }

  setHeatmapVisible(visible: boolean): void {
    this.setLayerFlag('heatmapVisible', visible);
  }

  private setLayerFlag(key: keyof DetailMapLayerState, value: boolean) {
    if (!this.layers) return;
    this.layers = { ...this.layers, [key]: value };
    this.updatePlaceholderDataset();
  }

  setSelectedWard(code: string | null, options?: { animate?: boolean }): void {
    this.selectedWard = code;
    this.selectedWardAnimated = options?.animate !== false;
    this.updatePlaceholderDataset();
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
    this.placeholder?.remove();
    this.placeholder = null;
    this.wardClickHandlers.clear();
    this.mapClickHandlers.clear();
    this.cameraChangeHandlers.clear();
    this.destroyed = true;
  }

  // --- Test-only helpers (not part of DetailedMapProvider) ---

  simulateWardClick(code: string | null): void {
    this.wardClickHandlers.forEach((handler) => handler(code));
  }

  simulateMapClick(point: { latitude: number; longitude: number }): void {
    this.mapClickHandlers.forEach((handler) => handler(point));
  }

  simulateCameraChange(camera: DetailMapCameraState): void {
    this.cameraChangeHandlers.forEach((handler) => handler(camera));
  }

  getDebugState() {
    return {
      initializeCallCount: this.initializeCallCount,
      destroyed: this.destroyed,
      camera: this.camera,
      layers: this.layers,
      selectedWard: this.selectedWard,
      selectedWardAnimated: this.selectedWardAnimated,
      lastFitBounds: this.placeholder?.dataset.lastFitBounds ?? null,
      lastFitBoundsAnimated: this.lastFitBoundsAnimated,
    };
  }
}
