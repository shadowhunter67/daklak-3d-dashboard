import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeMapProvider } from './FakeMapProvider';
import { DEFAULT_DETAIL_MAP_CAMERA, DEFAULT_DETAIL_MAP_LAYER_STATE } from './detailMapTypes';

describe('FakeMapProvider', () => {
  let container: HTMLDivElement;
  let provider: FakeMapProvider;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    provider = new FakeMapProvider();
  });

  afterEach(() => {
    provider.destroy();
    container.remove();
  });

  it('initializes exactly once per call and mounts a deterministic placeholder', async () => {
    await provider.initialize(container, {
      camera: DEFAULT_DETAIL_MAP_CAMERA,
      layers: DEFAULT_DETAIL_MAP_LAYER_STATE,
      sourceAvailability: {
        roads: false,
        administrativeBoundaries: false,
        terrain: false,
        satellite: false,
      },
    });
    const placeholder = container.querySelector('[data-testid="fake-map-provider"]');
    expect(placeholder).not.toBeNull();
    expect(placeholder).toHaveAttribute('role', 'img');
    expect(provider.getDebugState().initializeCallCount).toBe(1);
  });

  it('reflects layer toggles in the placeholder dataset', async () => {
    await provider.initialize(container, {
      camera: DEFAULT_DETAIL_MAP_CAMERA,
      layers: DEFAULT_DETAIL_MAP_LAYER_STATE,
      sourceAvailability: {
        roads: false,
        administrativeBoundaries: false,
        terrain: false,
        satellite: false,
      },
    });
    provider.setRoadsVisible(false);
    provider.setHeatmapVisible(true);
    const placeholder = container.querySelector<HTMLElement>('[data-testid="fake-map-provider"]')!;
    expect(placeholder.dataset.roadsVisible).toBe('false');
    expect(placeholder.dataset.heatmapVisible).toBe('true');
  });

  it('notifies registered ward-click handlers and supports unsubscribe', async () => {
    await provider.initialize(container, {
      camera: DEFAULT_DETAIL_MAP_CAMERA,
      layers: DEFAULT_DETAIL_MAP_LAYER_STATE,
      sourceAvailability: {
        roads: false,
        administrativeBoundaries: false,
        terrain: false,
        satellite: false,
      },
    });
    const handler = vi.fn();
    const unsubscribe = provider.onWardClick(handler);
    provider.simulateWardClick('24133');
    expect(handler).toHaveBeenCalledWith('24133');
    unsubscribe();
    provider.simulateWardClick('22015');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('notifies registered camera-change handlers', async () => {
    await provider.initialize(container, {
      camera: DEFAULT_DETAIL_MAP_CAMERA,
      layers: DEFAULT_DETAIL_MAP_LAYER_STATE,
      sourceAvailability: {
        roads: false,
        administrativeBoundaries: false,
        terrain: false,
        satellite: false,
      },
    });
    const handler = vi.fn();
    provider.onCameraChange(handler);
    const nextCamera = { ...DEFAULT_DETAIL_MAP_CAMERA, zoom: 12 };
    provider.simulateCameraChange(nextCamera);
    expect(handler).toHaveBeenCalledWith(nextCamera);
  });

  it('removes the placeholder and clears handlers on destroy', async () => {
    await provider.initialize(container, {
      camera: DEFAULT_DETAIL_MAP_CAMERA,
      layers: DEFAULT_DETAIL_MAP_LAYER_STATE,
      sourceAvailability: {
        roads: false,
        administrativeBoundaries: false,
        terrain: false,
        satellite: false,
      },
    });
    provider.destroy();
    expect(container.querySelector('[data-testid="fake-map-provider"]')).toBeNull();
    expect(provider.getDebugState().destroyed).toBe(true);
  });
});
