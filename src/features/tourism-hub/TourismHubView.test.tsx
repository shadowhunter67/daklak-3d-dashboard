import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ResearchedDataset } from '../../entities/researched-project/types';
import { renderWithI18n } from '../../i18n/tests/renderWithI18n';

const obs = <T,>(value: T) => ({
  value,
  sourceId: 's1',
  observedAt: '2026-06-24T00:00:00.000Z',
  confidence: 'high' as const,
  status: 'official' as const,
});
const dataset: ResearchedDataset = {
  schemaVersion: 1,
  generatedAt: '2026-09-29T00:00:00.000Z',
  sources: [
    {
      id: 's1',
      title: 'QĐ 1985',
      organization: 'UBND',
      url: 'https://example.vn',
      documentNumber: '1985/QĐ-UBND',
      sourceType: 'official-legal-document',
      retrievedAt: '2026-09-29T00:00:00.000Z',
    },
  ],
  projects: [
    {
      id: 'qd1985-pl6-001',
      name: 'Khu du lịch hồ thử nghiệm',
      lifecycle: obs('investment-attraction' as const),
      sector: 'tourism',
      administrativeAreaCodes: ['24580'],
      fields: { totalInvestment: [obs(500_000_000_000)] },
      verification: 'partial',
    },
  ],
};
// Hàm thường (không phải vi.fn): vi.fn bọc promise bị reject và tạo unhandled rejection giả.
const loader = vi.hoisted(() => ({ load: (): Promise<unknown> => Promise.resolve() }));
vi.mock('../../data/loadResearchedProjects', () => ({
  loadResearchedProjects: () => loader.load(),
}));

import { TourismHubView } from './TourismHubView';

afterEach(cleanup);

function renderHub() {
  loader.load = () => Promise.resolve(dataset);
  const handlers = {
    onBack: vi.fn(),
    onOpenUnit: vi.fn(),
    onOpenDestination: vi.fn(),
    onOpenCatalog: vi.fn(),
    onOpenPlanning: vi.fn(),
  };
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

  it('chuỗi liên kết: địa bàn → dự án → hạ tầng (chưa có) → quy hoạch → cơ hội đầu tư', async () => {
    const { onOpenCatalog } = renderHub();
    const card = screen.getByRole('heading', { name: 'Hồ Lắk', level: 2 }).closest('li')!;
    await screen.findByText(/1 dự án \(1 lĩnh vực du lịch\)/);
    expect(within(card).getByText('Hạ tầng tiếp cận').nextElementSibling).toHaveTextContent(
      'Chưa có dữ liệu',
    );
    expect(card).toHaveTextContent('500 tỷ đồng');
    fireEvent.click(within(card).getByRole('button', { name: /Xem dự án/ }));
    expect(onOpenCatalog).toHaveBeenCalledWith('24580');
  });

  it('khi chưa tải được danh mục: mọi mục chuỗi ghi Chưa có dữ liệu, không bịa số', () => {
    loader.load = () =>
      new Promise((_, reject) => setTimeout(() => reject(new Error('offline')), 0));
    renderWithI18n(
      <TourismHubView
        onBack={vi.fn()}
        onOpenUnit={vi.fn()}
        onOpenDestination={vi.fn()}
        onOpenCatalog={vi.fn()}
        onOpenPlanning={vi.fn()}
      />,
    );
    const card = screen.getByRole('heading', { name: 'Hồ Lắk', level: 2 }).closest('li')!;
    expect(
      within(card).getByText('Dự án thu hút đầu tư trong địa bàn').nextElementSibling,
    ).toHaveTextContent('Chưa có dữ liệu');
  });
});
