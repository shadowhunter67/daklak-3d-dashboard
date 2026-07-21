import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMapStore } from '../stores/mapStore';
import {
  DEFAULT_DETAIL_MAP_CAMERA,
  DEFAULT_DETAIL_MAP_LAYER_STATE,
} from '../components/detail-map/detailMapTypes';
import { useDashboardUrlSync } from './useDashboardUrlSync';

function resetLocation() {
  window.history.replaceState(null, '', '/');
}

describe('useDashboardUrlSync', () => {
  beforeEach(() => {
    resetLocation();
    useMapStore.setState({
      viewMode: '3d',
      dataMode: 'overview',
      selectedCode: null,
      hoveredCode: null,
      autoRotate: false,
    });
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('replaces history for consecutive ward selections instead of pushing new entries', () => {
    const pushSpy = vi.spyOn(window.history, 'pushState');
    const replaceSpy = vi.spyOn(window.history, 'replaceState');
    renderHook(() => useDashboardUrlSync());
    replaceSpy.mockClear(); // ignore the initial canonicalization replace on mount

    useMapStore.getState().select('24133');
    useMapStore.getState().select('22015');

    expect(pushSpy).not.toHaveBeenCalled();
    expect(replaceSpy).toHaveBeenCalledTimes(2);
    expect(replaceSpy.mock.calls.at(-1)?.[2]).toContain('ward=22015');
  });

  it('pushes a history entry when the view mode changes', () => {
    const pushSpy = vi.spyOn(window.history, 'pushState');
    renderHook(() => useDashboardUrlSync());

    useMapStore.getState().setViewMode('table');

    expect(pushSpy).toHaveBeenCalledTimes(1);
    expect(pushSpy.mock.calls[0][2]).toContain('view=2d');
  });

  it('pushes a history entry when the data mode changes', () => {
    const pushSpy = vi.spyOn(window.history, 'pushState');
    renderHook(() => useDashboardUrlSync());

    useMapStore.getState().changeDataMode('energy');

    expect(pushSpy).toHaveBeenCalledTimes(1);
    expect(pushSpy.mock.calls[0][2]).toContain('mode=energy');
  });

  it('restores view mode, data mode, and selected ward on popstate', () => {
    renderHook(() => useDashboardUrlSync());

    window.history.pushState(null, '', '?view=2d&mode=energy&ward=24133');
    window.dispatchEvent(new PopStateEvent('popstate'));

    const state = useMapStore.getState();
    expect(state.viewMode).toBe('table');
    expect(state.dataMode).toBe('energy');
    expect(state.selectedCode).toBe('24133');
  });

  it('normalizes an invalid administrative code from the URL to no selection on popstate', () => {
    renderHook(() => useDashboardUrlSync());

    window.history.pushState(null, '', '?view=3d&mode=overview&ward=not-a-real-code');
    window.dispatchEvent(new PopStateEvent('popstate'));

    expect(useMapStore.getState().selectedCode).toBeNull();
  });

  describe('detail-map (view=map) extra params', () => {
    beforeEach(() => {
      useMapStore.setState({
        viewMode: 'map',
        detailMapLayers: DEFAULT_DETAIL_MAP_LAYER_STATE,
        detailMapCamera: DEFAULT_DETAIL_MAP_CAMERA,
      });
    });

    it('replaces (never pushes) on a layer toggle', () => {
      const pushSpy = vi.spyOn(window.history, 'pushState');
      const replaceSpy = vi.spyOn(window.history, 'replaceState');
      renderHook(() => useDashboardUrlSync());
      replaceSpy.mockClear();

      useMapStore.getState().toggleDetailMapLayer('heatmapVisible');

      expect(pushSpy).not.toHaveBeenCalled();
      expect(replaceSpy).toHaveBeenCalledTimes(1);
      expect(replaceSpy.mock.calls[0][2]).toContain('heatmap=1');
    });

    it('replaces (never pushes) on a camera-only change', () => {
      const pushSpy = vi.spyOn(window.history, 'pushState');
      const replaceSpy = vi.spyOn(window.history, 'replaceState');
      renderHook(() => useDashboardUrlSync());
      replaceSpy.mockClear();

      useMapStore.getState().setDetailMapCamera({ ...DEFAULT_DETAIL_MAP_CAMERA, zoom: 14 });

      expect(pushSpy).not.toHaveBeenCalled();
      expect(replaceSpy).toHaveBeenCalledTimes(1);
      expect(replaceSpy.mock.calls[0][2]).toContain('zoom=14.00');
    });

    it('does not write history for a camera update within epsilon (no-op)', () => {
      const replaceSpy = vi.spyOn(window.history, 'replaceState');
      renderHook(() => useDashboardUrlSync());
      replaceSpy.mockClear();

      useMapStore.getState().setDetailMapCamera({
        ...DEFAULT_DETAIL_MAP_CAMERA,
        latitude: DEFAULT_DETAIL_MAP_CAMERA.latitude + 1e-9,
      });

      expect(replaceSpy).not.toHaveBeenCalled();
    });

    it('pushes when switching away from the detail map even if layers also differ', () => {
      const pushSpy = vi.spyOn(window.history, 'pushState');
      renderHook(() => useDashboardUrlSync());

      useMapStore.getState().setViewMode('3d');

      expect(pushSpy).toHaveBeenCalledTimes(1);
    });

    it('restores layers and camera from the URL on popstate', () => {
      renderHook(() => useDashboardUrlSync());

      window.history.pushState(
        null,
        '',
        '?view=map&mode=overview&basemap=terrain&roads=0&labels=1&boundaries=1&heatmap=1&lat=12.9&lng=108.2&zoom=13.5&bearing=0&pitch=0',
      );
      window.dispatchEvent(new PopStateEvent('popstate'));

      const state = useMapStore.getState();
      expect(state.detailMapLayers.baseMap).toBe('terrain');
      expect(state.detailMapLayers.roadsVisible).toBe(false);
      expect(state.detailMapLayers.heatmapVisible).toBe(true);
      expect(state.detailMapCamera.zoom).toBe(13.5);
    });
  });
});
