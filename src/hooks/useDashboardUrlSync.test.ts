import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMapStore } from '../stores/mapStore';
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
});
