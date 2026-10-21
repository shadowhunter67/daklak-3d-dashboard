import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
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
      organization: 'UBND tỉnh Đắk Lắk',
      url: 'https://example.vn/1985',
      documentNumber: '1985/QĐ-UBND',
      sourceType: 'official-legal-document',
      publishedAt: '2026-06-24T00:00:00.000Z',
      retrievedAt: '2026-09-29T00:00:00.000Z',
    },
  ],
  projects: [
    {
      id: 'a',
      name: 'Nhà máy điện gió thử nghiệm',
      lifecycle: obs('investment-attraction' as const),
      sector: 'energy',
      administrativeAreaCodes: ['24211'],
      fields: {
        totalInvestment: [
          { ...obs(3_000_000_000_000), observedAt: '2026-01-10T00:00:00.000Z' },
          obs(3_400_000_000_000),
        ],
      },
      verification: 'partial',
      location: {
        coordinates: [107.891268, 13.061861],
        accuracy: 'administrative-centroid',
        sourceId: 's1',
        verificationMethods: ['administrative-centroid'],
      },
    },
    {
      id: 'b',
      name: 'Khu du lịch thử nghiệm',
      lifecycle: obs('investment-attraction' as const),
      sector: 'tourism',
      administrativeAreaCodes: [],
      fields: {},
      verification: 'incomplete',
      notes: ['Địa danh chưa khớp: Ea Bar'],
    },
  ],
};

vi.mock('../../data/loadResearchedProjects', () => ({
  loadResearchedProjects: () => Promise.resolve(dataset),
}));

import { InvestmentCatalogView } from './InvestmentCatalogView';

afterEach(cleanup);

async function renderView(initialQuery?: string) {
  const onBack = vi.fn();
  renderWithI18n(<InvestmentCatalogView onBackToPortfolio={onBack} initialQuery={initialQuery} />);
  await screen.findByRole('heading', { level: 1 });
  return onBack;
}

describe('InvestmentCatalogView', () => {
  it('hiển thị nhãn nguồn chính thức, vốn dự kiến, tên xã thật và link nguồn', async () => {
    await renderView();
    expect(screen.getByText(/NGUỒN CHÍNH THỨC/)).toBeTruthy();
    expect(screen.getByText('3.400 tỷ đồng', { selector: 'dd' })).toBeTruthy();
    expect(screen.getByText('Ea Súp')).toBeTruthy();
    const link = screen.getByRole('link', {
      name: '1985/QĐ-UBND · 24/06/2026 — Nhà máy điện gió thử nghiệm',
    });
    expect(link.getAttribute('href')).toBe('https://example.vn/1985');
  });

  it('không bịa: thiếu vốn/địa bàn/vị trí thì ghi rõ chưa có dữ liệu; không có tiến độ hay nhà đầu tư', async () => {
    await renderView();
    expect(screen.getAllByText('Chưa có dữ liệu').length).toBeGreaterThan(0);
    expect(screen.getByText('Chưa xác định địa bàn')).toBeTruthy();
    expect(screen.getByText('Chưa có vị trí')).toBeTruthy();
    expect(screen.getByText('Tâm xã/phường (ước lượng)')).toBeTruthy();
    expect(screen.queryByText(/giải ngân/i, { selector: 'dt' })).toBeNull();
    expect(screen.queryByText(/nhà đầu tư/i, { selector: 'dt' })).toBeNull();
  });

  it('hiện ghi chú nguồn khi địa danh chưa khớp', async () => {
    await renderView();
    expect(screen.getByText(/Địa danh chưa khớp: Ea Bar/)).toBeTruthy();
  });

  it('tìm theo tên không dấu thu hẹp kết quả và báo số lượng', async () => {
    await renderView();
    fireEvent.change(screen.getByLabelText('Tìm theo tên dự án'), {
      target: { value: 'dien gio' },
    });
    await waitFor(() => expect(screen.getByText('Hiển thị 1 / 1 dự án')).toBeTruthy());
    expect(screen.queryByText('Khu du lịch thử nghiệm')).toBeNull();
  });

  it('breadcrumb không tự viết dấu phân cách (CSS đã thêm, tránh lặp ›››)', async () => {
    await renderView();
    const crumb = screen.getByRole('navigation', { name: 'Điều hướng vị trí' });
    expect(crumb.textContent).not.toContain('›');
  });

  it('mở sẵn với từ khóa từ tìm kiếm toàn cục và chỉ hiện dự án khớp', async () => {
    await renderView('điện gió');
    expect((screen.getByLabelText('Tìm theo tên dự án') as HTMLInputElement).value).toBe(
      'điện gió',
    );
    await waitFor(() => expect(screen.getByText('Hiển thị 1 / 1 dự án')).toBeTruthy());
    expect(screen.queryByText('Khu du lịch thử nghiệm')).toBeNull();
  });

  it('bấm "Xem bằng chứng" hiện nguồn, mức bằng chứng và lịch sử thay đổi của từng trường', async () => {
    await renderView();
    const buttons = screen.getAllByRole('button', { name: /Xem bằng chứng/ });
    expect(screen.queryByText('Lịch sử thay đổi')).toBeNull();
    fireEvent.click(buttons[0]);
    expect(screen.getAllByText(/· Chính thức ·/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Độ tin cậy: Cao/).length).toBeGreaterThan(0);
    expect(screen.getByText('Lịch sử thay đổi')).toBeTruthy();
    expect(screen.getByText(/3\.000 tỷ đồng/)).toBeTruthy();
    expect(buttons[0].getAttribute('aria-expanded')).toBe('true');
  });

  it('nút quay lại gọi callback', async () => {
    const onBack = await renderView();
    fireEvent.click(screen.getByRole('button', { name: /Danh mục dự án/ }));
    expect(onBack).toHaveBeenCalled();
  });
});
