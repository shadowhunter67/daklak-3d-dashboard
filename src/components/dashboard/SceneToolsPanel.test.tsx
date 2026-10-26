import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useMapStore } from '../../stores/mapStore';
import { I18nProvider } from '../../i18n/I18nProvider';
import { SceneToolsPanel } from './SceneToolsPanel';

function renderPanel() {
  return render(
    <I18nProvider>
      <SceneToolsPanel />
    </I18nProvider>,
  );
}

describe('SceneToolsPanel', () => {
  afterEach(cleanup);
  beforeEach(() =>
    useMapStore.setState({
      viewMode: '3d',
      reducedMotion: false,
      autoRotate: false,
      roadsVisible: false,
      labelsVisible: true,
    }),
  );

  it('renders the four scene controls that used to live in the header', () => {
    renderPanel();
    expect(screen.getByRole('button', { name: /^Xoay 360°/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Hiện đường/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Ẩn nhãn trung tâm/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Toàn tỉnh/ })).toBeInTheDocument();
  });

  it('renders nothing outside the 3D view', () => {
    for (const viewMode of ['overview', 'map', 'world'] as const) {
      useMapStore.setState({ viewMode });
      const { unmount } = renderPanel();
      expect(screen.queryByRole('button', { name: /^Xoay 360°/ })).not.toBeInTheDocument();
      unmount();
    }
  });

  it('toggles the road and centre-label layers through the store', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: /^Hiện đường/ }));
    expect(useMapStore.getState().roadsVisible).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /^Ẩn nhãn trung tâm/ }));
    expect(useMapStore.getState().labelsVisible).toBe(false);
  });

  it('requests a camera reset without changing the selection', () => {
    useMapStore.setState({ selectedCode: '24580', resetCameraSignal: 0 });
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: /^Toàn tỉnh/ }));
    expect(useMapStore.getState().resetCameraSignal).toBe(1);
    expect(useMapStore.getState().selectedCode).toBe('24580');
  });

  it('reports each toggle state with aria-pressed, not colour alone', () => {
    useMapStore.setState({ roadsVisible: true, labelsVisible: false, autoRotate: true });
    renderPanel();
    expect(screen.getByRole('button', { name: /^Ẩn đường/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: /^Hiện nhãn trung tâm/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByRole('button', { name: /^Dừng xoay/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('disables auto-rotate under a reduced-motion preference, and says why', () => {
    useMapStore.setState({ reducedMotion: true });
    renderPanel();
    const rotate = screen.getByRole('button', { name: /^Đã giảm chuyển động/ });
    expect(rotate).toBeDisabled();
    expect(rotate).toHaveAttribute('title', 'Đã tắt do tùy chọn giảm chuyển động');
  });
});
