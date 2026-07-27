import { fireEvent, render as rtlRender, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useMapStore } from '../../stores/mapStore';
import { I18nProvider } from '../../i18n/I18nProvider';
import { AdministrativeMap2D } from './AdministrativeMap2D';

// `render`'s `wrapper` option (rather than `renderWithI18n`) so `rerender()` re-applies the same
// I18nProvider wrapper — renderWithI18n's plain JSX-wrapping approach doesn't survive a
// `rerender(<Child />)` call, which would otherwise re-render outside the provider.
function render(ui: ReactElement) {
  return rtlRender(ui, { wrapper: I18nProvider });
}

describe('AdministrativeMap2D', () => {
  beforeEach(() =>
    useMapStore.setState({
      viewMode: 'table',
      dataMode: 'overview',
      selectedCode: null,
      hoveredCode: null,
      labelsVisible: true,
    }),
  );

  it('renders all 102 administrative polygons and shares selection state', () => {
    const { container } = render(<AdministrativeMap2D />);
    const polygons = container.querySelectorAll('.map-2d-polygons path');
    expect(polygons).toHaveLength(102);
    const target = container.querySelector<SVGPathElement>('path[data-code="24580"]')!;
    fireEvent.click(target);
    expect(useMapStore.getState().selectedCode).toBe('24580');
    expect(target).toHaveClass('is-selected');
    expect(screen.getByText(/Đang chọn Liên Sơn Lắk/)).toBeInTheDocument();
  });

  it('updates hover and mode-specific styling without changing selection', () => {
    const { container, rerender } = render(<AdministrativeMap2D />);
    const target = container.querySelector<SVGPathElement>('path[data-code="24133"]')!;
    fireEvent.pointerEnter(target);
    expect(useMapStore.getState().hoveredCode).toBe('24133');
    useMapStore.getState().select('24580');
    useMapStore.getState().changeDataMode('heatmap');
    rerender(<AdministrativeMap2D />);
    expect(useMapStore.getState().selectedCode).toBe('24580');
    expect(container.querySelector('.map-2d-polygons--heatmap')).toBeInTheDocument();
  });
});
