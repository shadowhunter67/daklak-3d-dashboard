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

  it('offers camera reset and contextual help without changing selection', () => {
    const events: string[] = [];
    const onReset = () => events.push('reset');
    const onHelp = () => events.push('help');
    window.addEventListener('dashboard-reset-camera', onReset);
    window.addEventListener('dashboard-show-help', onHelp);
    useMapStore.setState({ selectedCode: '24580' });
    render(<DashboardHeader />);
    fireEvent.click(screen.getByRole('button', { name: 'Đưa camera về toàn tỉnh' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mở hướng dẫn sử dụng' }));
    expect(events).toEqual(['reset', 'help']);
    expect(useMapStore.getState().selectedCode).toBe('24580');
    window.removeEventListener('dashboard-reset-camera', onReset);
    window.removeEventListener('dashboard-show-help', onHelp);
  });
});
