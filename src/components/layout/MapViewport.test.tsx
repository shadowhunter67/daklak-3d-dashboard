import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const hasWebGLSupportMock = vi.fn();
vi.mock('../map/webglLifecycle', () => ({
  hasWebGLSupport: () => hasWebGLSupportMock(),
}));

const administrativeMapMock = vi.fn(() => <div data-testid="administrative-map-stub" />);
vi.mock('../map/AdministrativeMap', () => ({
  AdministrativeMap: () => administrativeMapMock(),
}));

import { useMapStore } from '../../stores/mapStore';
import { MapViewport } from './MapViewport';

describe('MapViewport', () => {
  beforeEach(() => {
    useMapStore.setState({ viewMode: '3d' });
  });
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    useMapStore.setState({ viewMode: '3d' });
  });

  it('mounts the heavy 3D component when WebGL is supported', async () => {
    hasWebGLSupportMock.mockReturnValue(true);
    render(<MapViewport />);
    await waitFor(() => expect(screen.getByTestId('administrative-map-stub')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Mở danh sách 2D' })).not.toBeInTheDocument();
  });

  it('never mounts the heavy 3D component when WebGL is unsupported', async () => {
    hasWebGLSupportMock.mockReturnValue(false);
    render(<MapViewport />);
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: 'Không thể hiển thị bản đồ 3D' }),
      ).toBeInTheDocument(),
    );
    expect(screen.queryByTestId('administrative-map-stub')).not.toBeInTheDocument();
    expect(administrativeMapMock).not.toHaveBeenCalled();
  });

  it('falls back to the 2D directory from the WebGL-unsupported retry action', async () => {
    hasWebGLSupportMock.mockReturnValue(false);
    render(<MapViewport />);
    const retry = await screen.findByRole('button', { name: 'Mở danh sách 2D' });
    retry.click();
    expect(useMapStore.getState().viewMode).toBe('table');
  });
});
