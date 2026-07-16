import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useMapStore } from '../../stores/mapStore';
import { DashboardPanels } from './DashboardPanels';

describe('DashboardPanels', () => {
  beforeEach(() => useMapStore.setState({ viewMode: 'table' }));
  it('renders the accessible directory without mounting the 3D panel path', () => {
    render(<DashboardPanels />);
    expect(screen.getByRole('heading', { name: 'Danh sách xã, phường' })).toBeInTheDocument();
  });
});
