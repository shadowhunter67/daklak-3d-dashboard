import type {
  ErrorEvent as MapLibreErrorEvent,
  FilterSpecification,
  Map as MapLibreMap,
  MapGeoJSONFeature,
  Popup as MapLibrePopup,
} from 'maplibre-gl';
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
import {
  WARD_BOUNDARY_FILL_LAYER_ID,
  WARD_BOUNDARY_LINE_LAYER_ID,
  WARD_SELECTED_FILL_LAYER_ID,
  WARD_SELECTED_LINE_LAYER_ID,
} from './wardBoundaryLayers';
import { WARD_LABEL_LAYER_ID, WARD_SELECTED_LABEL_LAYER_ID } from './wardLabelLayers';
import {
  PLANNING_FILL_LAYER_ID,
  PLANNING_FILL_OPACITY,
  planningFillColorExpression,
} from './planningLayers';
import {
  KEY_PROJECTS_LINE_LAYER_ID,
  KEY_PROJECTS_LINE_TARGET_OPACITY,
  KEY_PROJECTS_POINT_LAYER_ID,
  KEY_PROJECTS_POINT_TARGET_OPACITY,
  KEY_PROJECTS_SOURCE_ID,
  KEY_PROJECT_LAYER_IDS,
} from './keyProjectLayers';
import { keyProjectPopupHtml } from './keyProjectPopup';
import { KEY_PROJECTS } from './keyProjects';
import { LINE_DRAW_DURATION_MS, sliceFeatureCollectionLines } from './lineDrawAnimation';
import {
  PLANNING_ZONES_FILL_LAYER_ID,
  PLANNING_ZONES_LINE_LAYER_ID,
  PLANNING_ZONES_REVEAL_TARGETS,
  PLANNING_ZONE_LAYER_IDS,
} from './planningZoneLayers';
import { planningZonePopupHtml } from './planningZonePopup';
import {
  REVEAL_DURATION_MS,
  revealFrameAt,
  revealSettledFrame,
  type RevealFrame,
} from './revealAnimation';
import {
  HAMLET_LABELS_LAYER_ID,
  PLACE_LABELS_LAYER_ID,
  ROADS_LINE_LAYER_ID,
  ROAD_LABELS_LAYER_ID,
} from './roadLayers';
import { BUILDINGS_FILL_LAYER_ID, BUILDINGS_OUTLINE_LAYER_ID } from './buildingLayers';
import {
  WARD_FLY_DURATION_MS,
  WARD_HIGHLIGHT_DURATION_MS,
  WARD_HIGHLIGHT_HIDDEN,
  WARD_HIGHLIGHT_SETTLED,
  wardHighlightFrameAt,
  type WardHighlightFrame,
} from './wardHighlightAnimation';

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
  // Tracks the in-flight ward-highlight rAF loop (setSelectedWard) so destroy() can cancel it —
  // the first tracked rAF handle in this class. Without cancelling, a pending frame would call
  // map.setPaintProperty() on a map that's already been removed and throw.
  private highlightRaf: number | null = null;
  // Same idea as highlightRaf, for the "vẽ đường"/"khoanh vùng" reveal animations.
  private keyProjectsRaf: number | null = null;
  private planningZonesRaf: number | null = null;
  // Kept so a key-project click can build a MapLibre Popup without re-importing the module.
  private maplibregl: Awaited<ReturnType<typeof loadMapLibreModules>>['maplibregl'] | null = null;
  private keyProjectPopup: MapLibrePopup | null = null;

  async initialize(container: HTMLElement, options: DetailMapInitOptions): Promise<void> {
    const { maplibregl, pmtiles } = await loadMapLibreModules();
    this.maplibregl = maplibregl;
    if (!pmtilesProtocolRegistered) {
      const protocol = new pmtiles.Protocol();
      maplibregl.addProtocol('pmtiles', protocol.tile);
      pmtilesProtocolRegistered = true;
    }
    this.layers = options.layers;
    this.sourceAvailability = options.sourceAvailability;
    // Self-hosted glyphs (never a live third-party glyph server — SECURITY.md), served from the
    // same public/fonts/ path in both dev (Vite serves public/ verbatim at BASE_URL) and
    // production. Computed unconditionally: ward-name labels (bundled data) need glyphs even when
    // no PMTiles road source is configured. buildDetailMapStyle() still skips every label layer if
    // this were ever omitted (documented budget fallback).
    const glyphsUrl = `${import.meta.env.BASE_URL}fonts/{fontstack}/{range}.pbf`;
    const map = new maplibregl.Map({
      container,
      style: buildDetailMapStyle(options.sourceAvailability, options.sourceUrl, glyphsUrl),
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
      // A click on a visible key-project feature opens its info popup and does NOT also select the
      // ward beneath it (which would fly the camera away from the thing the user just clicked).
      if (this.openKeyProjectPopupAt(event.point)) return;
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
    if (!this.map?.getLayer(WARD_BOUNDARY_FILL_LAYER_ID)) return null;
    const features = this.map.queryRenderedFeatures([point.x, point.y], {
      layers: [WARD_BOUNDARY_FILL_LAYER_ID],
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

  fitBounds(bounds: DetailBounds, options?: { animate?: boolean; durationMs?: number }): void {
    if (!this.map) return;
    const camera = this.map.cameraForBounds(
      [
        [bounds.west, bounds.south],
        [bounds.east, bounds.north],
      ],
      { padding: 48, maxZoom: 13 },
    );
    if (!camera) return;
    if (options?.animate === false) {
      this.map.jumpTo(camera);
      return;
    }
    // flyTo (arced zoom-out-then-in), not the linear pan easeTo/fitBounds({animate:true}) would
    // give — a constant-zoom pan across the whole province reads as "dragging the map", not the
    // mapeffect.app-style "flying into a place" this feature is going for. essential:true keeps
    // the browser's own reduced-motion setting from silently degrading this to a jump — our own
    // state.reducedMotion gate (via options.animate) is what decides that here, deliberately.
    this.map.flyTo({
      ...camera,
      duration: options?.durationMs ?? WARD_FLY_DURATION_MS,
      curve: 1.42,
      essential: true,
    });
  }

  private setLayerVisibility(layerId: string, visible: boolean) {
    if (!this.map?.getLayer(layerId)) return;
    this.map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
  }

  setLayers(layers: DetailMapLayerState, options?: { reducedMotion?: boolean }): void {
    // Captured BEFORE reassigning `this.layers` below, so the two off→on checks a few lines down
    // see the state as it was on the PREVIOUS call — on the very first call (from initialize(),
    // which pre-assigns `this.layers = options.layers` itself before ever calling setLayers) this
    // is reference-equal to `layers`, so both checks correctly see "no change" and never animate
    // on initial load, however layers happen to be already-on from the URL.
    const previous = this.layers;
    this.layers = layers;
    this.setBaseMap(layers.baseMap);
    this.setRoadsVisible(layers.roadsVisible);
    this.setRoadLabelsVisible(layers.roadLabelsVisible);
    this.setPlaceLabelsVisible(layers.placeLabelsVisible);
    this.setAdministrativeBoundariesVisible(layers.administrativeBoundariesVisible);
    this.setWardLabelsVisible(layers.wardLabelsVisible);
    this.setPlanningOverlay(layers.planningOverlay);
    const canAnimate = !options?.reducedMotion;
    this.setKeyProjectsVisible(layers.keyProjectsVisible, {
      animate: canAnimate && layers.keyProjectsVisible && !previous?.keyProjectsVisible,
    });
    this.setPlanningZonesVisible(layers.planningZonesVisible, {
      animate: canAnimate && layers.planningZonesVisible && !previous?.planningZonesVisible,
    });
    this.setBuildingsVisible(layers.buildingsVisible);
    this.setDashboardMetricsVisible(layers.dashboardMetricsVisible);
    this.setHeatmapVisible(layers.heatmapVisible);
  }

  setRoadsVisible(visible: boolean): void {
    if (!this.sourceAvailability?.roads) return;
    this.setLayerVisibility(ROADS_LINE_LAYER_ID, visible);
  }

  setRoadLabelsVisible(visible: boolean): void {
    if (!this.sourceAvailability?.roads) return;
    this.setLayerVisibility(ROAD_LABELS_LAYER_ID, visible);
  }

  setPlaceLabelsVisible(visible: boolean): void {
    if (!this.sourceAvailability?.roads) return;
    this.setLayerVisibility(PLACE_LABELS_LAYER_ID, visible);
    this.setLayerVisibility(HAMLET_LABELS_LAYER_ID, visible);
  }

  setAdministrativeBoundariesVisible(visible: boolean): void {
    // Boundaries are bundled/always-available now (see wardBoundaryLayers.ts) — no availability
    // guard. Hiding them also hides the highlight, so the selected layers toggle too.
    this.setLayerVisibility(WARD_BOUNDARY_LINE_LAYER_ID, visible);
    this.setLayerVisibility(WARD_BOUNDARY_FILL_LAYER_ID, visible);
    this.setLayerVisibility(WARD_SELECTED_FILL_LAYER_ID, visible);
    this.setLayerVisibility(WARD_SELECTED_LINE_LAYER_ID, visible);
  }

  setWardLabelsVisible(visible: boolean): void {
    // Bundled/always-available (daklak-labels.json) — no availability guard, same as the ward
    // boundaries. The layers only exist in the style when a glyphs URL is configured; the
    // getLayer() guard in setLayerVisibility() makes this a safe no-op otherwise.
    //
    // Only the base (all-102) layer follows this toggle. The selected-ward name stays visible even
    // with the toggle off — turning off "ward names" shouldn't strip the identity of the ward the
    // user explicitly selected; its own code filter gates whether it shows anything.
    this.setLayerVisibility(WARD_LABEL_LAYER_ID, visible);
  }

  setPlanningOverlay(overlay: DetailMapLayerState['planningOverlay']): void {
    if (!this.map?.getLayer(PLANNING_FILL_LAYER_ID)) return;
    if (overlay === 'none') {
      this.map.setPaintProperty(PLANNING_FILL_LAYER_ID, 'fill-opacity', 0);
      return;
    }
    this.map.setPaintProperty(
      PLANNING_FILL_LAYER_ID,
      'fill-color',
      planningFillColorExpression(overlay),
    );
    this.map.setPaintProperty(PLANNING_FILL_LAYER_ID, 'fill-opacity', PLANNING_FILL_OPACITY);
  }

  setKeyProjectsVisible(visible: boolean, options?: { animate?: boolean }): void {
    this.cancelKeyProjectsAnimation();
    if (!visible) {
      for (const id of KEY_PROJECT_LAYER_IDS) this.setLayerVisibility(id, false);
      this.keyProjectPopup?.remove();
      this.keyProjectPopup = null;
      return;
    }
    for (const id of KEY_PROJECT_LAYER_IDS) this.setLayerVisibility(id, true);
    if (!options?.animate) {
      this.applyKeyProjectsRevealFrame(1);
      return;
    }
    // "Vẽ đường" (mapeffect.app capability 2): the corridor lines grow from their start point
    // while the project points/labels fade in, instead of the whole layer just popping into view.
    const started = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - started) / LINE_DRAW_DURATION_MS, 1);
      this.applyKeyProjectsRevealFrame(t);
      this.keyProjectsRaf = t < 1 ? requestAnimationFrame(step) : null;
    };
    this.keyProjectsRaf = requestAnimationFrame(step);
  }

  private applyKeyProjectsRevealFrame(rawRatio: number): void {
    if (!this.map) return;
    // Clamp defensively: a rAF callback's timestamp can land a hair before the `performance.now()`
    // captured just before `requestAnimationFrame()` was called (observed live — a ~-0.01 ratio on
    // the very first frame), and MapLibre rejects/logs an error for any negative opacity.
    const ratio = Math.min(Math.max(rawRatio, 0), 1);
    const source = this.map.getSource(KEY_PROJECTS_SOURCE_ID);
    // GeoJSONSource; typed loosely here since maplibre-gl's Source union doesn't narrow on id.
    (source as { setData?: (data: unknown) => void } | undefined)?.setData?.(
      ratio >= 1 ? KEY_PROJECTS : sliceFeatureCollectionLines(KEY_PROJECTS, ratio),
    );
    if (this.map.getLayer(KEY_PROJECTS_LINE_LAYER_ID)) {
      this.map.setPaintProperty(
        KEY_PROJECTS_LINE_LAYER_ID,
        'line-opacity',
        KEY_PROJECTS_LINE_TARGET_OPACITY * ratio,
      );
    }
    if (this.map.getLayer(KEY_PROJECTS_POINT_LAYER_ID)) {
      this.map.setPaintProperty(
        KEY_PROJECTS_POINT_LAYER_ID,
        'circle-opacity',
        KEY_PROJECTS_POINT_TARGET_OPACITY * ratio,
      );
      this.map.setPaintProperty(
        KEY_PROJECTS_POINT_LAYER_ID,
        'circle-stroke-opacity',
        KEY_PROJECTS_POINT_TARGET_OPACITY * ratio,
      );
    }
  }

  private cancelKeyProjectsAnimation(): void {
    if (this.keyProjectsRaf !== null) {
      cancelAnimationFrame(this.keyProjectsRaf);
      this.keyProjectsRaf = null;
    }
  }

  setPlanningZonesVisible(visible: boolean, options?: { animate?: boolean }): void {
    this.cancelPlanningZonesAnimation();
    if (!visible) {
      for (const id of PLANNING_ZONE_LAYER_IDS) this.setLayerVisibility(id, false);
      this.keyProjectPopup?.remove();
      this.keyProjectPopup = null;
      return;
    }
    for (const id of PLANNING_ZONE_LAYER_IDS) this.setLayerVisibility(id, true);
    if (!options?.animate) {
      this.applyPlanningZoneFrame(revealSettledFrame(PLANNING_ZONES_REVEAL_TARGETS));
      return;
    }
    // "Khoanh vùng" (mapeffect.app capability 1): a glow-reveal, the same idea as the ward-
    // selection highlight (`wardHighlightAnimation.ts`) but generalized (`revealAnimation.ts`) to
    // the approved-planning-zone polygons' own target opacity/width.
    const started = performance.now();
    const step = (now: number) => {
      const t = (now - started) / REVEAL_DURATION_MS;
      this.applyPlanningZoneFrame(revealFrameAt(t, PLANNING_ZONES_REVEAL_TARGETS));
      this.planningZonesRaf = t < 1 ? requestAnimationFrame(step) : null;
    };
    this.planningZonesRaf = requestAnimationFrame(step);
  }

  private applyPlanningZoneFrame(frame: RevealFrame): void {
    if (this.map?.getLayer(PLANNING_ZONES_FILL_LAYER_ID)) {
      this.map.setPaintProperty(PLANNING_ZONES_FILL_LAYER_ID, 'fill-opacity', frame.fillOpacity);
    }
    if (this.map?.getLayer(PLANNING_ZONES_LINE_LAYER_ID)) {
      this.map.setPaintProperty(PLANNING_ZONES_LINE_LAYER_ID, 'line-opacity', frame.lineOpacity);
      this.map.setPaintProperty(PLANNING_ZONES_LINE_LAYER_ID, 'line-width', frame.lineWidth);
      this.map.setPaintProperty(PLANNING_ZONES_LINE_LAYER_ID, 'line-blur', frame.lineBlur);
    }
  }

  private cancelPlanningZonesAnimation(): void {
    if (this.planningZonesRaf !== null) {
      cancelAnimationFrame(this.planningZonesRaf);
      this.planningZonesRaf = null;
    }
  }

  /** Returns true if a key-project feature was under the point and a popup was opened. */
  private openKeyProjectPopupAt(point: { x: number; y: number }): boolean {
    if (!this.map || !this.maplibregl) return false;
    const hitLayers = [KEY_PROJECTS_POINT_LAYER_ID, KEY_PROJECTS_LINE_LAYER_ID].filter((id) =>
      this.map?.getLayer(id),
    );
    if (hitLayers.length) {
      const features = this.map.queryRenderedFeatures([point.x, point.y], { layers: hitLayers });
      const feature = features[0] as MapGeoJSONFeature | undefined;
      if (feature) {
        // Anchor at the click for a line, or the point's own coordinate for a point.
        const anchor =
          feature.geometry.type === 'Point'
            ? (feature.geometry.coordinates as [number, number])
            : this.map.unproject([point.x, point.y]);
        this.showReferencePopup(anchor, keyProjectPopupHtml(feature.properties ?? {}));
        return true;
      }
    }
    return this.openPlanningZonePopupAt(point);
  }

  /** Returns true if a planning-zone polygon was under the point and a popup was opened. */
  private openPlanningZonePopupAt(point: { x: number; y: number }): boolean {
    if (!this.map?.getLayer(PLANNING_ZONES_FILL_LAYER_ID)) return false;
    const features = this.map.queryRenderedFeatures([point.x, point.y], {
      layers: [PLANNING_ZONES_FILL_LAYER_ID],
    });
    const feature = features[0] as MapGeoJSONFeature | undefined;
    if (!feature) return false;
    this.showReferencePopup(
      this.map.unproject([point.x, point.y]),
      planningZonePopupHtml(feature.properties ?? {}),
    );
    return true;
  }

  /** One popup at a time for both reference layers (key projects + planning zones). */
  private showReferencePopup(
    anchor: [number, number] | { lng: number; lat: number },
    html: string,
  ) {
    if (!this.map || !this.maplibregl) return;
    this.keyProjectPopup?.remove();
    this.keyProjectPopup = new this.maplibregl.Popup({ closeButton: true, maxWidth: '280px' })
      .setLngLat(anchor)
      .setHTML(html)
      .addTo(this.map);
  }

  setBuildingsVisible(visible: boolean): void {
    if (!this.sourceAvailability?.roads) return;
    this.setLayerVisibility(BUILDINGS_FILL_LAYER_ID, visible);
    this.setLayerVisibility(BUILDINGS_OUTLINE_LAYER_ID, visible);
  }

  setDashboardMetricsVisible(visible: boolean): void {
    if (!this.sourceAvailability?.dashboardOverlays) return;
    this.setLayerVisibility('dashboard-metrics-fill', visible);
  }

  setHeatmapVisible(visible: boolean): void {
    if (!this.sourceAvailability?.dashboardOverlays) return;
    this.setLayerVisibility('dashboard-heatmap', visible);
  }

  private applyHighlightFrame(frame: WardHighlightFrame): void {
    if (this.map?.getLayer(WARD_SELECTED_FILL_LAYER_ID)) {
      this.map.setPaintProperty(WARD_SELECTED_FILL_LAYER_ID, 'fill-opacity', frame.fillOpacity);
    }
    if (this.map?.getLayer(WARD_SELECTED_LINE_LAYER_ID)) {
      this.map.setPaintProperty(WARD_SELECTED_LINE_LAYER_ID, 'line-opacity', frame.lineOpacity);
      this.map.setPaintProperty(WARD_SELECTED_LINE_LAYER_ID, 'line-width', frame.lineWidth);
      this.map.setPaintProperty(WARD_SELECTED_LINE_LAYER_ID, 'line-blur', frame.lineBlur);
    }
  }

  private cancelHighlightAnimation(): void {
    if (this.highlightRaf !== null) {
      cancelAnimationFrame(this.highlightRaf);
      this.highlightRaf = null;
    }
  }

  setSelectedWard(code: string | null, options?: { animate?: boolean }): void {
    this.cancelHighlightAnimation();
    const codeFilter: FilterSpecification = ['==', ['get', 'code'], code ?? ''];
    if (this.map?.getLayer(WARD_SELECTED_FILL_LAYER_ID)) {
      this.map.setFilter(WARD_SELECTED_FILL_LAYER_ID, codeFilter);
    }
    if (this.map?.getLayer(WARD_SELECTED_LINE_LAYER_ID)) {
      this.map.setFilter(WARD_SELECTED_LINE_LAYER_ID, codeFilter);
    }
    // The always-visible name label for the selected ward (text-allow-overlap) — follows the same
    // code filter so it appears/moves with the highlight.
    if (this.map?.getLayer(WARD_SELECTED_LABEL_LAYER_ID)) {
      this.map.setFilter(WARD_SELECTED_LABEL_LAYER_ID, codeFilter);
    }

    if (!code) {
      this.applyHighlightFrame(WARD_HIGHLIGHT_HIDDEN);
      return;
    }
    if (options?.animate === false) {
      this.applyHighlightFrame(WARD_HIGHLIGHT_SETTLED);
      return;
    }

    const started = performance.now();
    const step = (now: number) => {
      const t = (now - started) / WARD_HIGHLIGHT_DURATION_MS;
      this.applyHighlightFrame(wardHighlightFrameAt(t));
      this.highlightRaf = t < 1 ? requestAnimationFrame(step) : null;
    };
    this.highlightRaf = requestAnimationFrame(step);
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
    this.cancelHighlightAnimation();
    this.cancelKeyProjectsAnimation();
    this.cancelPlanningZonesAnimation();
    this.keyProjectPopup?.remove();
    this.keyProjectPopup = null;
    this.wardClickHandlers.clear();
    this.mapClickHandlers.clear();
    this.cameraChangeHandlers.clear();
    this.map?.remove();
    this.map = null;
  }
}
