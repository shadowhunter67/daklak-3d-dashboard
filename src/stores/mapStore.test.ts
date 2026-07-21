import { beforeEach, describe, expect, it } from 'vitest';
import { createMapStore, getInitialDashboardUrlState, useMapStore } from './mapStore';

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
    });
  });

  it('reads a valid state from the current URL', () => {
    window.history.replaceState(null, '', '/?view=2d&mode=energy&ward=24133');
    expect(getInitialDashboardUrlState()).toEqual({
      viewMode: 'table',
      dataMode: 'energy',
      selectedCode: '24133',
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
