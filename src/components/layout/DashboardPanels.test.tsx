import { beforeEach, describe, expect, it } from 'vitest';
import { useMapStore } from '../../stores/mapStore';
import { renderWithI18n as render } from '../../i18n/tests/renderWithI18n';
import { DashboardPanels } from './DashboardPanels';

describe('DashboardPanels', () => {
  beforeEach(() => useMapStore.setState({ viewMode: 'map' }));

  // 'map' now folds in the former standalone 'table' view (directory sidebar lives inside
  // DetailMapViewport itself, see DetailMapViewport.tsx) — DashboardPanels renders nothing for it,
  // same as before the merge.
  it('renders nothing for the detail-map experience, which owns its own panel', () => {
    const { container } = render(<DashboardPanels />);
    expect(container).toBeEmptyDOMElement();
  });
});
