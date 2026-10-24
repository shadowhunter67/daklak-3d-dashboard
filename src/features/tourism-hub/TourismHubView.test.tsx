import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithI18n } from '../../i18n/tests/renderWithI18n';
import { TourismHubView } from './TourismHubView';

afterEach(cleanup);

function renderHub() {
  const handlers = { onBack: vi.fn(), onOpenUnit: vi.fn(), onOpenDestination: vi.fn() };
  renderWithI18n(<TourismHubView {...handlers} />);
  return handlers;
}

describe('TourismHubView', () => {
  it('hiện KPI thật và nói thẳng chưa có dữ liệu lượt khách', () => {
    renderHub();
    expect(screen.getByRole('heading', { level: 1, name: 'Trung tâm du lịch' })).toBeTruthy();
    const kpis = screen.getByRole('list', { name: 'Chỉ số điểm đến du lịch' });
    expect(within(kpis).getByText('Lượt khách')).toBeTruthy();
    expect(within(kpis).getByText('Chưa có dữ liệu')).toBeTruthy();
  });

  it('liệt kê điểm đến, mỗi thẻ có link nguồn và xã/phường suy ra', () => {
    renderHub();
    const card = screen.getByRole('heading', { name: 'Hồ Lắk', level: 2 }).closest('li')!;
    expect(within(card).getByRole('link', { name: /Nguồn thông tin/ })).toHaveAttribute(
      'href',
      expect.stringContaining('wikipedia.org'),
    );
    expect(card).toHaveTextContent(/Liên Sơn Lắk/);
    expect(card).toHaveTextContent(/suy ra/);
  });

  it('lọc theo loại hình và tìm không dấu; báo khi không có kết quả', () => {
    renderHub();
    fireEvent.change(screen.getByLabelText('Tìm điểm đến'), { target: { value: 'ho lak' } });
    expect(screen.getByRole('heading', { name: 'Hồ Lắk', level: 2 })).toBeTruthy();
    expect(screen.getByText(/Hiển thị 1 \//)).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Tìm điểm đến'), { target: { value: 'zzzz' } });
    expect(screen.getByText('Không có điểm đến nào khớp bộ lọc.')).toBeTruthy();
  });

  it('điều hướng sang hồ sơ xã/phường và cảnh 3D minh họa', () => {
    const { onOpenUnit, onOpenDestination } = renderHub();
    const card = screen.getByRole('heading', { name: 'Hồ Lắk', level: 2 }).closest('li')!;
    fireEvent.click(within(card).getByRole('button', { name: /Hồ sơ xã\/phường/ }));
    expect(onOpenUnit).toHaveBeenCalledWith('24580');
    fireEvent.click(within(card).getByRole('button', { name: /Xem cảnh 3D minh họa/ }));
    expect(onOpenDestination).toHaveBeenCalledWith('ho-lak');
  });
});
