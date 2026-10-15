import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMapStore } from '../../stores/mapStore';
import { I18nProvider } from '../../i18n/I18nProvider';
import { DashboardHeader } from './DashboardHeader';

function renderHeader(props: Partial<Parameters<typeof DashboardHeader>[0]> = {}) {
  return render(
    <I18nProvider>
      <DashboardHeader onOpenMenu={() => {}} onSelectPlace={() => {}} {...props} />
    </I18nProvider>,
  );
}

describe('DashboardHeader (topbar)', () => {
  afterEach(cleanup);
  beforeEach(() =>
    useMapStore.setState({ viewMode: '3d', dataMode: 'overview', reducedMotion: false }),
  );

  it('changes thematic mode through a domain action', () => {
    renderHeader();
    fireEvent.click(screen.getByRole('button', { name: 'Năng lượng' }));
    expect(useMapStore.getState().dataMode).toBe('energy');
  });

  it('offers contextual help without changing selection', () => {
    useMapStore.setState({ selectedCode: '24580', helpSignal: 0 });
    renderHeader();
    fireEvent.click(screen.getByRole('button', { name: 'Mở hướng dẫn sử dụng' }));
    expect(useMapStore.getState().helpSignal).toBe(1);
    expect(useMapStore.getState().selectedCode).toBe('24580');
  });

  it('shows the thematic mode tabs only in the 3D view', () => {
    renderHeader();
    expect(screen.getByRole('navigation', { name: 'Chế độ dữ liệu' })).toBeInTheDocument();
    cleanup();
    useMapStore.setState({ viewMode: 'overview' });
    renderHeader();
    expect(screen.queryByRole('navigation', { name: 'Chế độ dữ liệu' })).not.toBeInTheDocument();
  });

  it('"Về toàn tỉnh" clears the selected ward and requests a camera reset', () => {
    useMapStore.setState({ selectedCode: '24580', resetCameraSignal: 0 });
    renderHeader();
    fireEvent.click(screen.getByRole('button', { name: 'Đưa camera về toàn tỉnh' }));
    expect(useMapStore.getState().selectedCode).toBeNull();
    expect(useMapStore.getState().resetCameraSignal).toBe(1);
  });

  it('opens the mobile menu via the menu button', () => {
    const onOpenMenu = vi.fn();
    renderHeader({ onOpenMenu });
    fireEvent.click(screen.getByRole('button', { name: 'Mở menu điều hướng' }));
    expect(onOpenMenu).toHaveBeenCalledTimes(1);
  });

  it('searches wards locally and reports the chosen place', () => {
    const onSelectPlace = vi.fn();
    renderHeader({ onSelectPlace });
    const input = screen.getByRole('combobox', { name: 'Tìm kiếm xã, phường, địa danh' });
    fireEvent.change(input, { target: { value: 'Buôn Ma Thuột' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSelectPlace).toHaveBeenCalledWith(expect.objectContaining({ name: 'Buôn Ma Thuột' }));
  });

  it('shows an empty-state row when nothing matches', () => {
    renderHeader();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'zzzzqq' } });
    expect(screen.getByText('Không có kết quả phù hợp')).toBeInTheDocument();
  });

  it('switches theme with aria-pressed buttons and sets data-theme', () => {
    renderHeader();
    fireEvent.click(screen.getByRole('button', { name: 'Chuyển sang giao diện sáng' }));
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(screen.getByRole('button', { name: 'Chuyển sang giao diện sáng' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
