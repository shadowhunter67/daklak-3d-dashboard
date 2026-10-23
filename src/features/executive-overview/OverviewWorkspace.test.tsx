import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useMapStore } from '../../stores/mapStore';
import { I18nProvider } from '../../i18n/I18nProvider';
import { OverviewWorkspace } from './OverviewWorkspace';

function renderWorkspace() {
  render(
    <I18nProvider>
      <OverviewWorkspace projectCountByAdministrativeArea={{}} />
    </I18nProvider>,
  );
}

describe('OverviewWorkspace', () => {
  afterEach(cleanup);
  beforeEach(() => useMapStore.setState({ selectedCode: null, viewMode: 'overview' }));

  it('lists every unit and filters by type', () => {
    renderWorkspace();
    const all = screen.getByRole('button', { name: /^Tất cả \(\d+\)$/ });
    const total = Number(/\((\d+)\)/.exec(all.textContent ?? '')?.[1]);
    expect(total).toBeGreaterThan(0);
    const list = document.querySelector('.overview-workspace__directory-list') as HTMLElement;
    expect(within(list).getAllByRole('button')).toHaveLength(total);
    fireEvent.click(screen.getByRole('button', { name: /^Phường \(\d+\)$/ }));
    expect(within(list).getAllByRole('button').length).toBeLessThan(total);
  });

  it('selecting a unit fills the quick-info panel and enables "Xem trên bản đồ"', () => {
    render(
      <I18nProvider>
        <OverviewWorkspace projectCountByAdministrativeArea={{}} />
      </I18nProvider>,
    );
    expect(screen.getByText(/Chọn một xã, phường trong danh sách/)).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Tìm xã, phường…' }), {
      target: { value: 'Buôn Ma Thuột' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Buôn Ma Thuột/ }));
    expect(useMapStore.getState().selectedCode).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Xem trên bản đồ' }));
    expect(useMapStore.getState().viewMode).toBe('map');
  });

  it('exposes the map as a labelled image with a keyboard-reachable list alternative', () => {
    renderWorkspace();
    expect(screen.getByRole('img', { name: /Bản đồ ranh giới/ })).toBeInTheDocument();
  });

  it('có nút "Xem hồ sơ đơn vị" dẫn tới #/unit/<mã> khi đã chọn một đơn vị', () => {
    window.location.hash = '';
    useMapStore.setState({ selectedCode: '24133' });
    renderWorkspace();
    fireEvent.click(screen.getByRole('button', { name: 'Xem hồ sơ đơn vị' }));
    expect(window.location.hash).toBe('#/unit/24133');
  });
});
