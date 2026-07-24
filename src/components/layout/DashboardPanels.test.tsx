import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useMapStore } from '../../stores/mapStore';
import { renderWithI18n as render } from '../../i18n/tests/renderWithI18n';
import { DashboardPanels } from './DashboardPanels';

describe('DashboardPanels', () => {
  beforeEach(() => useMapStore.setState({ viewMode: 'table' }));
  it('renders the 2D administrative map and keeps the directory available', () => {
    render(<DashboardPanels />);
    expect(
      screen.getByRole('img', { name: /Bản đồ hành chính 2D gồm 102 đơn vị/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Danh sách xã, phường' })).toBeInTheDocument();
  });

  it('renders nothing for the detail-map experience, which owns its own panel', () => {
    useMapStore.setState({ viewMode: 'map' });
    const { container } = render(<DashboardPanels />);
    expect(container).toBeEmptyDOMElement();
  });
});
