import { beforeEach, describe, expect, it } from 'vitest';
import { createMapStore, getInitialDashboardUrlState, useMapStore } from './mapStore';
import {
  DEFAULT_DETAIL_MAP_CAMERA,
  DEFAULT_DETAIL_MAP_LAYER_STATE,
} from '../components/detail-map/detailMapTypes';

describe('createMapStore', () => {
  it('initializes with the default state when given the default URL state', () => {
    const store = createMapStore({ viewMode: '3d', dataMode: 'overview', selectedCode: null });
    const state = store.getState();
    expect(state.viewMode).toBe('3d');
    expect(state.dataMode).toBe('overview');
    expect(state.selectedCode).toBeNull();
    expect(state.labelsVisible).toBe(true);
    expect(state.roadsVisible).toBe(false);
    expect(state.autoRotate).toBe(false);
    expect(state.reducedMotion).toBe(false);
    expect(state.resetCameraSignal).toBe(0);
    expect(state.helpSignal).toBe(0);
    expect(state.insetsChangeSignal).toBe(0);
    // detail-map fields still fall back to their own defaults when the caller omits them —
    // existing call sites like this one, written before detail-map URL hydration existed, must
    // keep working unchanged.
    expect(state.detailMapLayers).toEqual(DEFAULT_DETAIL_MAP_LAYER_STATE);
    expect(state.detailMapCamera).toEqual(DEFAULT_DETAIL_MAP_CAMERA);
  });

  it('hydrates detailMapLayers/detailMapCamera directly from an explicit initial state (regression: these used to be silently dropped in favor of hardcoded defaults)', () => {
    const layers = {
      ...DEFAULT_DETAIL_MAP_LAYER_STATE,
      baseMap: 'terrain' as const,
      roadsVisible: false,
    };
    const camera = { ...DEFAULT_DETAIL_MAP_CAMERA, zoom: 13.5 };
    const store = createMapStore({
      viewMode: 'map',
      dataMode: 'overview',
      selectedCode: null,
      detailMapLayers: layers,
      detailMapCamera: camera,
    });
    const state = store.getState();
    expect(state.detailMapLayers).toEqual(layers);
    expect(state.detailMapCamera).toEqual(camera);
  });

  it('initializes directly from an explicit URL state, without touching window.location', () => {
    const store = createMapStore({ viewMode: 'table', dataMode: 'energy', selectedCode: '24133' });
    const state = store.getState();
    expect(state.viewMode).toBe('table');
    expect(state.dataMode).toBe('energy');
    expect(state.selectedCode).toBe('24133');
  });

  it('produces isolated store instances: mutating one does not affect another', () => {
    const first = createMapStore({ viewMode: '3d', dataMode: 'overview', selectedCode: null });
    const second = createMapStore({ viewMode: '3d', dataMode: 'overview', selectedCode: null });
    first.getState().toggleLabels();
    expect(first.getState().labelsVisible).toBe(false);
    expect(second.getState().labelsVisible).toBe(true);
  });

  it('still rejects an unknown administrative code passed to select() on a fresh store', () => {
    const store = createMapStore({ viewMode: '3d', dataMode: 'overview', selectedCode: null });
    store.getState().select('not-a-real-code');
    expect(store.getState().selectedCode).toBeNull();
  });
});

describe('getInitialDashboardUrlState', () => {
  it('reads the default state from an empty URL', () => {
    window.history.replaceState(null, '', '/');
    expect(getInitialDashboardUrlState()).toEqual({
      viewMode: '3d',
      dataMode: 'overview',
      selectedCode: null,
      detailMapLayers: DEFAULT_DETAIL_MAP_LAYER_STATE,
      detailMapCamera: DEFAULT_DETAIL_MAP_CAMERA,
    });
  });

  it('reads a valid state from the current URL', () => {
    window.history.replaceState(null, '', '/?view=2d&mode=energy&ward=24133');
    expect(getInitialDashboardUrlState()).toEqual({
      viewMode: 'table',
      dataMode: 'energy',
      selectedCode: '24133',
      detailMapLayers: DEFAULT_DETAIL_MAP_LAYER_STATE,
      detailMapCamera: DEFAULT_DETAIL_MAP_CAMERA,
    });
    window.history.replaceState(null, '', '/');
  });

  // Regression test: before this fix, detailMapLayers/detailMapCamera silently kept their
  // hardcoded defaults at store-creation time no matter what the URL said, so a shared
  // ?view=map&...&roads=0&... link lost its camera/layers on first load (they were only ever
  // restored later, on popstate). See useDashboardUrlSync's mount effect for the other half of
  // this bug: it canonicalizes the URL from whatever the store's initial state is.
  it('reads detail-map camera and layer params from a view=map URL', () => {
    window.history.replaceState(
      null,
      '',
      '/?view=map&mode=overview&basemap=terrain&roads=0&labels=1&boundaries=1&heatmap=1&lat=12.9&lng=108.2&zoom=13.5&bearing=0&pitch=0',
    );
    const state = getInitialDashboardUrlState();
    expect(state.viewMode).toBe('map');
    expect(state.detailMapLayers).toEqual({
      baseMap: 'terrain',
      roadsVisible: false,
      roadLabelsVisible: true,
      placeLabelsVisible: true,
      administrativeBoundariesVisible: true,
      dashboardMetricsVisible: false,
      heatmapVisible: true,
      terrainVisible: true,
      satelliteVisible: false,
    });
    expect(state.detailMapCamera).toEqual({
      latitude: 12.9,
      longitude: 108.2,
      zoom: 13.5,
      bearing: 0,
      pitch: 0,
    });
    window.history.replaceState(null, '', '/');
  });
});

describe('map interaction state', () => {
  beforeEach(() =>
    useMapStore.setState({
      hoveredCode: null,
      selectedCode: null,
      labelsVisible: true,
      autoRotate: false,
      reducedMotion: false,
      dataMode: 'overview',
      viewMode: '3d',
    }),
  );
  it('selects by stable code', () => {
    useMapStore.getState().select('22015');
    expect(useMapStore.getState().selectedCode).toBe('22015');
  });
  it('rejects unknown administrative codes', () => {
    useMapStore.getState().select('invalid');
    expect(useMapStore.getState().selectedCode).toBeNull();
  });
  it('toggles labels', () => {
    useMapStore.getState().toggleLabels();
    expect(useMapStore.getState().labelsVisible).toBe(false);
  });
  it('toggles 360 degree auto rotation', () => {
    useMapStore.getState().toggleAutoRotate();
    expect(useMapStore.getState().autoRotate).toBe(true);
  });
  it('switches thematic data mode', () => {
    useMapStore.getState().changeDataMode('energy');
    expect(useMapStore.getState().dataMode).toBe('energy');
  });
  it('preserves selection but clears transient hover when mode changes', () => {
    useMapStore.setState({ selectedCode: '22015', hoveredCode: '22045' });
    useMapStore.getState().changeDataMode('heatmap');
    expect(useMapStore.getState().selectedCode).toBe('22015');
    expect(useMapStore.getState().hoveredCode).toBeNull();
  });
  it('stops animation when switching to the accessible table', () => {
    useMapStore.setState({ autoRotate: true });
    useMapStore.getState().setViewMode('table');
    expect(useMapStore.getState().viewMode).toBe('table');
    expect(useMapStore.getState().autoRotate).toBe(false);
  });
  it('enforces reduced motion inside the domain action', () => {
    useMapStore.setState({ autoRotate: true });
    useMapStore.getState().setReducedMotion(true);
    expect(useMapStore.getState().autoRotate).toBe(false);
    useMapStore.getState().toggleAutoRotate();
    expect(useMapStore.getState().autoRotate).toBe(false);
  });
  it('increments the camera reset signal on each request', () => {
    useMapStore.setState({ resetCameraSignal: 0 });
    useMapStore.getState().requestCameraReset();
    expect(useMapStore.getState().resetCameraSignal).toBe(1);
    useMapStore.getState().requestCameraReset();
    expect(useMapStore.getState().resetCameraSignal).toBe(2);
  });
  it('increments the help signal on each request', () => {
    useMapStore.setState({ helpSignal: 0 });
    useMapStore.getState().requestHelp();
    expect(useMapStore.getState().helpSignal).toBe(1);
  });
  it('increments the insets-change signal on each notification', () => {
    useMapStore.setState({ insetsChangeSignal: 0 });
    useMapStore.getState().notifyInsetsChanged();
    expect(useMapStore.getState().insetsChangeSignal).toBe(1);
  });
});

describe('detail-map layer and camera state', () => {
  beforeEach(() =>
    useMapStore.setState({
      detailMapLayers: DEFAULT_DETAIL_MAP_LAYER_STATE,
      detailMapCamera: DEFAULT_DETAIL_MAP_CAMERA,
    }),
  );

  it('selects a base map and derives terrain/satellite visibility from it', () => {
    useMapStore.getState().setDetailMapBaseMap('terrain');
    const layers = useMapStore.getState().detailMapLayers;
    expect(layers.baseMap).toBe('terrain');
    expect(layers.terrainVisible).toBe(true);
    expect(layers.satelliteVisible).toBe(false);
  });

  it('switching base map away from terrain clears terrainVisible', () => {
    useMapStore.getState().setDetailMapBaseMap('terrain');
    useMapStore.getState().setDetailMapBaseMap('satellite');
    const layers = useMapStore.getState().detailMapLayers;
    expect(layers.terrainVisible).toBe(false);
    expect(layers.satelliteVisible).toBe(true);
  });

  it('toggles a layer without affecting the others', () => {
    useMapStore.getState().toggleDetailMapLayer('heatmapVisible');
    expect(useMapStore.getState().detailMapLayers.heatmapVisible).toBe(true);
    expect(useMapStore.getState().detailMapLayers.roadsVisible).toBe(
      DEFAULT_DETAIL_MAP_LAYER_STATE.roadsVisible,
    );
  });

  it('updates the camera when it actually changes', () => {
    const next = { ...DEFAULT_DETAIL_MAP_CAMERA, zoom: 12 };
    useMapStore.getState().setDetailMapCamera(next);
    expect(useMapStore.getState().detailMapCamera.zoom).toBe(12);
  });

  it('ignores a camera update within epsilon of the current camera', () => {
    const before = useMapStore.getState().detailMapCamera;
    useMapStore.getState().setDetailMapCamera({ ...before, latitude: before.latitude + 1e-9 });
    // Same object reference: set() was never called, so no re-render is triggered either.
    expect(useMapStore.getState().detailMapCamera).toBe(before);
  });

  it('restores both layers and camera from a parsed URL state', () => {
    const layers = { ...DEFAULT_DETAIL_MAP_LAYER_STATE, heatmapVisible: true };
    const camera = { ...DEFAULT_DETAIL_MAP_CAMERA, zoom: 15 };
    useMapStore.getState().applyDetailMapUrlState({ layers, camera });
    expect(useMapStore.getState().detailMapLayers).toEqual(layers);
    expect(useMapStore.getState().detailMapCamera).toEqual(camera);
  });
});
