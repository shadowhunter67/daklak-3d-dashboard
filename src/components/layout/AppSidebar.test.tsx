import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMapStore } from '../../stores/mapStore';
import { I18nProvider } from '../../i18n/I18nProvider';
import { AppSidebar } from './AppSidebar';

function renderSidebar(route: Parameters<typeof AppSidebar>[0]['route'] = { kind: 'none' }) {
  const navigate = vi.fn();
  render(
    <I18nProvider>
      <AppSidebar route={route} navigate={navigate} mobileOpen={false} onClose={() => {}} />
    </I18nProvider>,
  );
  return navigate;
}

describe('AppSidebar', () => {
  afterEach(cleanup);
  beforeEach(() =>
    useMapStore.setState({
      viewMode: 'overview',
      detailMapLayers: { ...useMapStore.getState().detailMapLayers, planningOverlay: 'none' },
    }),
  );

  it('marks the current view with aria-current', () => {
    renderSidebar();
    expect(screen.getByRole('button', { name: 'Tổng quan' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('button', { name: 'Bản đồ' })).not.toHaveAttribute('aria-current');
  });

  it('switches to the map and 3D views through the store', () => {
    renderSidebar();
    fireEvent.click(screen.getByRole('button', { name: 'Bản đồ' }));
    expect(useMapStore.getState().viewMode).toBe('map');
    fireEvent.click(screen.getByRole('button', { name: 'Bản đồ 3D' }));
    expect(useMapStore.getState().viewMode).toBe('3d');
  });

  it('Quy hoạch opens the map with a planning overlay on', () => {
    renderSidebar();
    fireEvent.click(screen.getByRole('button', { name: 'Quy hoạch' }));
    expect(useMapStore.getState().viewMode).toBe('map');
    expect(useMapStore.getState().detailMapLayers.planningOverlay).not.toBe('none');
  });

  it('routes Dự án, Dữ liệu & nguồn and Báo cáo to their hash routes', () => {
    const navigate = renderSidebar();
    fireEvent.click(screen.getByRole('button', { name: 'Dự án' }));
    expect(navigate).toHaveBeenLastCalledWith('#/projects');
    fireEvent.click(screen.getByRole('button', { name: 'Dữ liệu & nguồn' }));
    expect(navigate).toHaveBeenLastCalledWith('#/data-readiness');
    fireEvent.click(screen.getByRole('button', { name: 'Báo cáo' }));
    expect(navigate).toHaveBeenLastCalledWith('#/reports');
  });

  it('highlights the hash-route entry when a hash route is open', () => {
    renderSidebar({ kind: 'reports' });
    expect(screen.getByRole('button', { name: 'Báo cáo' })).toHaveAttribute('aria-current', 'page');
  });

  it('highlights "Dự án" (not "Tổng quan") on the investment-attraction catalog route', () => {
    renderSidebar({ kind: 'investment-catalog' });
    expect(screen.getByRole('button', { name: 'Dự án' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Tổng quan' })).not.toHaveAttribute('aria-current');
  });
});
