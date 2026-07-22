import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useMapStore } from '../../stores/mapStore';
import { DashboardHeader } from './DashboardHeader';

describe('DashboardHeader', () => {
  afterEach(cleanup);
  beforeEach(() =>
    useMapStore.setState({ viewMode: '3d', dataMode: 'overview', reducedMotion: false }),
  );

  it('changes thematic mode through a domain action', () => {
    render(<DashboardHeader />);
    fireEvent.click(screen.getByRole('button', { name: 'Năng lượng' }));
    expect(useMapStore.getState().dataMode).toBe('energy');
  });

  it('switches to the accessible directory', () => {
    render(<DashboardHeader />);
    fireEvent.click(screen.getByRole('button', { name: 'Mở danh sách 2D' }));
    expect(useMapStore.getState().viewMode).toBe('table');
  });

  it('opens and exits the detail map', () => {
    render(<DashboardHeader />);
    fireEvent.click(screen.getByRole('button', { name: 'Mở bản đồ chi tiết' }));
    expect(useMapStore.getState().viewMode).toBe('map');
    fireEvent.click(screen.getByRole('button', { name: 'Thoát bản đồ chi tiết' }));
    expect(useMapStore.getState().viewMode).toBe('3d');
  });

  it('offers camera reset and contextual help without changing selection', () => {
    useMapStore.setState({ selectedCode: '24580', resetCameraSignal: 0, helpSignal: 0 });
    render(<DashboardHeader />);
    fireEvent.click(screen.getByRole('button', { name: 'Đưa camera về toàn tỉnh' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mở hướng dẫn sử dụng' }));
    expect(useMapStore.getState().resetCameraSignal).toBe(1);
    expect(useMapStore.getState().helpSignal).toBe(1);
    expect(useMapStore.getState().selectedCode).toBe('24580');
  });

  it('opens the data provenance panel without changing selection', () => {
    useMapStore.setState({ selectedCode: '24580', provenancePanelOpen: false });
    render(<DashboardHeader />);
    fireEvent.click(screen.getByRole('button', { name: 'Xem nguồn và chất lượng dữ liệu' }));
    expect(useMapStore.getState().provenancePanelOpen).toBe(true);
    expect(useMapStore.getState().selectedCode).toBe('24580');
  });
});
