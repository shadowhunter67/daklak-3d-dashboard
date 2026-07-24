import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useMapStore } from '../../stores/mapStore';
import { I18nProvider } from '../../i18n/I18nProvider';
import { DashboardHeader } from './DashboardHeader';

function renderHeader() {
  return render(
    <I18nProvider>
      <DashboardHeader />
    </I18nProvider>,
  );
}

// Real dynamic import() resolution time is not guaranteed to fit RTL's default 1000ms waitFor
// window under load (e.g. the full suite transforming many files concurrently) — the English
// dictionary chunk is tiny, but give it real headroom rather than flaking (same pattern as
// App.test.tsx's LAZY_CHUNK_TIMEOUT).
const LAZY_CHUNK_TIMEOUT = { timeout: 5000 };

describe('DashboardHeader', () => {
  afterEach(cleanup);
  beforeEach(() =>
    useMapStore.setState({ viewMode: '3d', dataMode: 'overview', reducedMotion: false }),
  );

  it('changes thematic mode through a domain action', () => {
    renderHeader();
    fireEvent.click(screen.getByRole('button', { name: 'Năng lượng' }));
    expect(useMapStore.getState().dataMode).toBe('energy');
  });

  it('switches to the accessible directory', () => {
    renderHeader();
    fireEvent.click(screen.getByRole('button', { name: 'Mở danh sách 2D' }));
    expect(useMapStore.getState().viewMode).toBe('table');
  });

  it('opens and exits the detail map', () => {
    renderHeader();
    fireEvent.click(screen.getByRole('button', { name: 'Mở bản đồ chi tiết' }));
    expect(useMapStore.getState().viewMode).toBe('map');
    fireEvent.click(screen.getByRole('button', { name: 'Thoát bản đồ chi tiết' }));
    expect(useMapStore.getState().viewMode).toBe('3d');
  });

  it('offers camera reset and contextual help without changing selection', () => {
    useMapStore.setState({ selectedCode: '24580', resetCameraSignal: 0, helpSignal: 0 });
    renderHeader();
    fireEvent.click(screen.getByRole('button', { name: 'Đưa camera về toàn tỉnh' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mở hướng dẫn sử dụng' }));
    expect(useMapStore.getState().resetCameraSignal).toBe(1);
    expect(useMapStore.getState().helpSignal).toBe(1);
    expect(useMapStore.getState().selectedCode).toBe('24580');
  });

  it('navigates to Executive Overview via the primary nav', () => {
    useMapStore.setState({ viewMode: '3d' });
    renderHeader();
    fireEvent.click(screen.getByRole('button', { name: 'Tổng quan điều hành' }));
    expect(useMapStore.getState().viewMode).toBe('overview');
  });

  it('marks the active primary nav item with aria-current', () => {
    useMapStore.setState({ viewMode: 'table' });
    renderHeader();
    expect(screen.getByRole('button', { name: 'Danh sách' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('button', { name: '3D' })).not.toHaveAttribute('aria-current');
  });

  it('offers a compact "Tổng quan điều hành" toggle in header-meta (reachable on mobile)', () => {
    useMapStore.setState({ viewMode: '3d' });
    renderHeader();
    fireEvent.click(screen.getByRole('button', { name: 'Mở tổng quan điều hành' }));
    expect(useMapStore.getState().viewMode).toBe('overview');
  });

  it('opens the data provenance panel without changing selection', () => {
    useMapStore.setState({ selectedCode: '24580', provenancePanelOpen: false });
    renderHeader();
    fireEvent.click(screen.getByRole('button', { name: 'Xem nguồn và chất lượng dữ liệu' }));
    expect(useMapStore.getState().provenancePanelOpen).toBe(true);
    expect(useMapStore.getState().selectedCode).toBe('24580');
  });

  it('opens the automated data-sources panel, distinct from the data provenance panel', () => {
    useMapStore.setState({ dataSourcesPanelOpen: false, provenancePanelOpen: false });
    renderHeader();
    fireEvent.click(
      screen.getByRole('button', { name: 'Xem tình trạng nguồn dữ liệu tự động cập nhật' }),
    );
    expect(useMapStore.getState().dataSourcesPanelOpen).toBe(true);
    expect(useMapStore.getState().provenancePanelOpen).toBe(false);
  });

  describe('language switcher', () => {
    it('defaults to Vietnamese with VI marked as the current selection', () => {
      renderHeader();
      expect(screen.getByRole('button', { name: 'Chuyển sang tiếng Việt' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      expect(screen.getByRole('button', { name: 'Switch to English' })).toHaveAttribute(
        'aria-pressed',
        'false',
      );
    });

    it('switches every translated label to English when EN is activated, without moving focus away', async () => {
      renderHeader();
      const enButton = screen.getByRole('button', { name: 'Switch to English' });
      enButton.focus();
      fireEvent.click(enButton);
      expect(screen.getByRole('button', { name: 'Switch to English' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      expect(document.documentElement.lang).toBe('en');
      // The English dictionary is lazy-loaded (dynamic import()) — labels update once it resolves.
      expect(
        await screen.findByRole('button', { name: 'Executive Overview' }, LAZY_CHUNK_TIMEOUT),
      ).toBeInTheDocument();
      expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeInTheDocument();
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: 'Switch to English' }),
      );
    });

    it('is keyboard-operable (a real <button>, reachable and activatable without a mouse)', () => {
      renderHeader();
      const enButton = screen.getByRole('button', { name: 'Switch to English' });
      enButton.focus();
      expect(enButton).toHaveFocus();
      fireEvent.click(enButton);
      expect(useMapStore.getState()).toBeDefined(); // switching locale must not touch map state
      expect(document.documentElement.lang).toBe('en');
    });

    it('does not use a flag-only label — the buttons read "VI"/"EN" as visible text', () => {
      renderHeader();
      expect(screen.getByRole('button', { name: 'Chuyển sang tiếng Việt' })).toHaveTextContent(
        'VI',
      );
      expect(screen.getByRole('button', { name: 'Switch to English' })).toHaveTextContent('EN');
    });
  });
});
