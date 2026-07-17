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
});
