import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithI18n as render } from '../../i18n/tests/renderWithI18n';

const hasWebGLSupportMock = vi.fn(() => true);
vi.mock('../map/webglLifecycle', () => ({
  hasWebGLSupport: () => hasWebGLSupportMock(),
}));

import { useMapStore } from '../../stores/mapStore';
import { DetailMapViewport } from './DetailMapViewport';
import { FakeMapProvider } from './FakeMapProvider';
import { DEFAULT_DETAIL_MAP_CAMERA, DEFAULT_DETAIL_MAP_LAYER_STATE } from './detailMapTypes';

describe('DetailMapViewport', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_DETAIL_MAP_PROVIDER', 'fake');
    hasWebGLSupportMock.mockReturnValue(true);
    useMapStore.setState({
      detailMapLayers: DEFAULT_DETAIL_MAP_LAYER_STATE,
      detailMapCamera: DEFAULT_DETAIL_MAP_CAMERA,
      selectedCode: null,
      viewMode: 'map',
      reducedMotion: false,
    });
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('renders the fake provider placeholder once WebGL support is confirmed', async () => {
    render(<DetailMapViewport />);
    await waitFor(() => expect(screen.getByTestId('fake-map-provider')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Lớp bản đồ' })).toBeInTheDocument();
  });

  it('falls back to the WebGL-unavailable message and never mounts a provider when unsupported', async () => {
    hasWebGLSupportMock.mockReturnValue(false);
    render(<DetailMapViewport />);
    expect(
      await screen.findByText(/không hỗ trợ WebGL nên không thể mở bản đồ chi tiết/),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('fake-map-provider')).toBeNull();
  });

  it('shows the accessible ward/commune directory inline in the WebGL-unavailable fallback, without navigating away', async () => {
    hasWebGLSupportMock.mockReturnValue(false);
    render(<DetailMapViewport />);
    expect(
      await screen.findByRole('heading', { name: 'Danh sách xã, phường' }),
    ).toBeInTheDocument();
    expect(useMapStore.getState().viewMode).toBe('map');
  });

  it('opens the layer panel, toggles a layer, and syncs the change to the mounted provider', async () => {
    // Regression test: the layer panel used to update Zustand only — the mounted provider never
    // heard about the change at all, so a live map (once a real source is configured) would
    // silently ignore every layer-panel toggle.
    const heatmapSpy = vi.spyOn(FakeMapProvider.prototype, 'setHeatmapVisible');
    render(<DetailMapViewport />);
    await waitFor(() => expect(screen.getByTestId('fake-map-provider')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Lớp bản đồ' }));
    // Heatmap is an "Advanced" layer (progressive disclosure, spec §X) — hidden until switched.
    fireEvent.click(screen.getByRole('button', { name: 'Nâng cao' }));
    const heatmapCheckbox = screen.getByRole('checkbox', { name: 'Heatmap' });
    expect(heatmapCheckbox).not.toBeChecked();
    fireEvent.click(heatmapCheckbox);
    expect(useMapStore.getState().detailMapLayers.heatmapVisible).toBe(true);
    await waitFor(() => expect(heatmapSpy).toHaveBeenLastCalledWith(true));
  });

  it('syncs a roads-layer toggle to the mounted provider (not just Zustand)', async () => {
    const roadsSpy = vi.spyOn(FakeMapProvider.prototype, 'setRoadsVisible');
    render(<DetailMapViewport />);
    await waitFor(() => expect(screen.getByTestId('fake-map-provider')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Lớp bản đồ' }));
    const roadsCheckbox = screen.getByRole('checkbox', { name: 'Đường' });
    expect(roadsCheckbox).toBeChecked();
    fireEvent.click(roadsCheckbox);
    expect(useMapStore.getState().detailMapLayers.roadsVisible).toBe(false);
    await waitFor(() => expect(roadsSpy).toHaveBeenLastCalledWith(false));
  });

  it('syncs a base map change to the mounted provider (not just Zustand)', async () => {
    vi.stubEnv('VITE_TERRAIN_SOURCE_URL', 'https://example.test/terrain.json');
    const baseMapSpy = vi.spyOn(FakeMapProvider.prototype, 'setBaseMap');
    render(<DetailMapViewport />);
    await waitFor(() => expect(screen.getByTestId('fake-map-provider')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Lớp bản đồ' }));
    const terrainRadio = screen.getByRole('radio', { name: 'Địa hình' });
    fireEvent.click(terrainRadio);
    expect(useMapStore.getState().detailMapLayers.baseMap).toBe('terrain');
    await waitFor(() => expect(baseMapSpy).toHaveBeenLastCalledWith('terrain'));
  });

  it('shows an honest empty-state notice when no data source is configured', async () => {
    render(<DetailMapViewport />);
    await waitFor(() => expect(screen.getByTestId('fake-map-provider')).toBeInTheDocument());
    expect(screen.getByText('Chế độ chờ dữ liệu')).toBeInTheDocument();
  });

  it('hides the empty-state notice once a data source is configured', async () => {
    vi.stubEnv('VITE_DETAIL_MAP_SOURCE_URL', 'https://example.test/daklak.pmtiles');
    render(<DetailMapViewport />);
    await waitFor(() => expect(screen.getByTestId('fake-map-provider')).toBeInTheDocument());
    expect(screen.queryByText('Chế độ chờ dữ liệu')).toBeNull();
  });

  it('selects a ward on a fake provider ward click while in browse mode', async () => {
    const initializeSpy = vi.spyOn(FakeMapProvider.prototype, 'initialize');
    render(<DetailMapViewport />);
    await waitFor(() => expect(initializeSpy).toHaveBeenCalled());
    const instance = initializeSpy.mock.instances[0] as InstanceType<typeof FakeMapProvider>;
    await waitFor(() => expect(screen.getByTestId('fake-map-provider')).toBeInTheDocument());
    instance.simulateWardClick('24133');
    await waitFor(() => expect(useMapStore.getState().selectedCode).toBe('24133'));
  });

  it('flies to and highlights the selected ward (animated by default)', async () => {
    const initializeSpy = vi.spyOn(FakeMapProvider.prototype, 'initialize');
    render(<DetailMapViewport />);
    await waitFor(() => expect(initializeSpy).toHaveBeenCalled());
    const instance = initializeSpy.mock.instances[0] as InstanceType<typeof FakeMapProvider>;
    await waitFor(() => expect(screen.getByTestId('fake-map-provider')).toBeInTheDocument());

    useMapStore.getState().select('24133');

    await waitFor(() => {
      const debug = instance.getDebugState();
      expect(debug.selectedWard).toBe('24133');
      expect(debug.selectedWardAnimated).toBe(true);
      expect(debug.lastFitBounds).toBeTruthy();
      expect(debug.lastFitBoundsAnimated).toBe(true);
    });
  });

  it('with reducedMotion, snaps the selected ward without animating', async () => {
    useMapStore.setState({ reducedMotion: true });
    const initializeSpy = vi.spyOn(FakeMapProvider.prototype, 'initialize');
    render(<DetailMapViewport />);
    await waitFor(() => expect(initializeSpy).toHaveBeenCalled());
    const instance = initializeSpy.mock.instances[0] as InstanceType<typeof FakeMapProvider>;
    await waitFor(() => expect(screen.getByTestId('fake-map-provider')).toBeInTheDocument());

    useMapStore.getState().select('24133');

    await waitFor(() => {
      const debug = instance.getDebugState();
      expect(debug.selectedWard).toBe('24133');
      expect(debug.selectedWardAnimated).toBe(false);
      expect(debug.lastFitBoundsAnimated).toBe(false);
    });
  });

  it('frames and highlights a preselected ward (from the URL) once the map is ready', async () => {
    useMapStore.setState({ selectedCode: '24133' });
    const initializeSpy = vi.spyOn(FakeMapProvider.prototype, 'initialize');
    render(<DetailMapViewport />);
    await waitFor(() => expect(initializeSpy).toHaveBeenCalled());
    const instance = initializeSpy.mock.instances[0] as InstanceType<typeof FakeMapProvider>;
    await waitFor(() => expect(screen.getByTestId('fake-map-provider')).toBeInTheDocument());

    await waitFor(() => {
      const debug = instance.getDebugState();
      expect(debug.selectedWard).toBe('24133');
      expect(debug.lastFitBounds).toBeTruthy();
    });
  });
});
