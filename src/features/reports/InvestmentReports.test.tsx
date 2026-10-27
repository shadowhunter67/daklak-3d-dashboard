import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ResearchedDataset } from '../../entities/researched-project/types';
import { renderWithI18n } from '../../i18n/tests/renderWithI18n';

const obs = <T,>(value: T) => ({
  value,
  sourceId: 's1',
  observedAt: '2026-06-24T00:00:00.000Z',
  confidence: 'high' as const,
  status: 'official' as const,
});
const project = (
  id: string,
  sector: 'energy' | 'tourism',
  capital?: number,
  areas: string[] = ['24580'],
) => ({
  id,
  name: id,
  lifecycle: obs('investment-attraction' as const),
  sector,
  administrativeAreaCodes: areas,
  fields: capital === undefined ? {} : { totalInvestment: [obs(capital)] },
  verification: 'partial' as const,
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
    project('p1', 'energy', 3e12),
    project('p2', 'tourism', 1e12),
    project('p3', 'tourism'),
  ],
};

// Hàm thường (không phải vi.fn): vi.fn bọc promise bị reject và tạo unhandled rejection giả.
const loader = vi.hoisted(() => ({ load: (): Promise<unknown> => Promise.resolve() }));
vi.mock('../../data/loadResearchedProjects', () => ({
  loadResearchedProjects: () => loader.load(),
}));

import { InvestmentReports } from './InvestmentReports';

beforeEach(() => {
  loader.load = () => Promise.resolve(dataset);
});
afterEach(cleanup);

describe('InvestmentReports', () => {
  it('xu hướng: nói thẳng chưa có dữ liệu lịch sử, không dựng biểu đồ giả', async () => {
    renderWithI18n(<InvestmentReports />);
    const trends = await screen.findByRole('region', { name: 'Xu hướng theo thời gian' });
    expect(trends).toHaveTextContent('Chưa có dữ liệu lịch sử');
    expect(trends.querySelector('[role="img"], canvas, polyline, path[d][stroke]')).toBeNull();
  });

  it('điểm nghẽn: chỉ Quy hoạch có số; Đất đai/Thủ tục/Hạ tầng ghi Chưa có dữ liệu', async () => {
    renderWithI18n(<InvestmentReports />);
    const region = await screen.findByRole('region', { name: 'Điểm nghẽn' });
    for (const label of ['Đất đai', 'Thủ tục', 'Hạ tầng']) {
      expect(within(region).getByText(label).closest('li')).toHaveTextContent('Chưa có dữ liệu');
    }
    expect(
      within(region)
        .getByText(/^Quy hoạch/)
        .closest('li'),
    ).toHaveTextContent(/\d+ dự án/);
  });

  it('vốn liên quan: không gọi là tác động kinh tế; dự án thiếu vốn được đếm riêng', async () => {
    renderWithI18n(<InvestmentReports />);
    const region = await screen.findByRole('region', { name: 'Vốn liên quan tới dự án có vấn đề' });
    expect(region).toHaveTextContent('không phải tác động kinh tế');
    expect(region).toHaveTextContent('chưa có số vốn, không tính vào tổng');
  });

  it('so sánh: chuyển giữa lĩnh vực và xã/phường', async () => {
    renderWithI18n(<InvestmentReports />);
    const region = await screen.findByRole('region', { name: 'So sánh' });
    expect(
      within(region).getByRole('table', { name: 'So sánh số dự án và vốn dự kiến' }),
    ).toBeTruthy();
    expect(region).toHaveTextContent('Năng lượng');
    fireEvent.click(within(region).getByRole('button', { name: /Xã, phường/ }));
    expect(region).toHaveTextContent('Liên Sơn Lắk');
  });

  it('tải lỗi thì báo lỗi rõ ràng, không biến mất', async () => {
    loader.load = () =>
      new Promise((_, reject) => setTimeout(() => reject(new Error('offline')), 0));
    renderWithI18n(<InvestmentReports />);
    expect(screen.getByRole('status')).toHaveTextContent('Đang tải');
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được dữ liệu danh mục');
  });
});
