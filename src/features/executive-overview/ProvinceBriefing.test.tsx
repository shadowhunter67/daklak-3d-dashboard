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
const project = (id: string, sector: 'energy' | 'tourism', capital?: number) => ({
  id,
  name: id,
  lifecycle: obs('investment-attraction' as const),
  sector,
  administrativeAreaCodes: [],
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
      sourceType: 'official-legal-document',
      retrievedAt: '2026-09-29T00:00:00.000Z',
    },
  ],
  projects: [
    project('p1', 'energy', 3e12),
    project('p2', 'tourism', 2e11),
    project('p3', 'tourism'),
  ],
};

vi.mock('../../data/loadResearchedProjects', () => ({
  loadResearchedProjects: () => Promise.resolve(dataset),
}));

import { ProvinceBriefing } from './ProvinceBriefing';

afterEach(() => {
  cleanup();
  window.location.hash = '';
});

describe('ProvinceBriefing', () => {
  it('hàng chờ liệt kê khoảng trống dữ liệu thật và dẫn tới trang xử lý', async () => {
    renderWithI18n(<ProvinceBriefing />);
    const queue = await screen.findByRole('region', { name: 'Việc cần chú ý' });
    expect(queue).toHaveTextContent('1 dự án thu hút đầu tư chưa có số liệu vốn');
    expect(queue).toHaveTextContent('102 xã/phường chưa có ảnh đã xác minh');
    expect(queue).toHaveTextContent(/dự án cần rà soát quy hoạch/);
    fireEvent.click(within(queue).getByRole('button', { name: 'Mở trung tâm quy hoạch' }));
    expect(window.location.hash).toBe('#/planning');
  });

  it('quy mô vốn: chỉ tính dự án có vốn, nói rõ đây không phải vốn giải ngân', async () => {
    renderWithI18n(<ProvinceBriefing />);
    const economy = await screen.findByRole('region', { name: 'Quy mô vốn theo lĩnh vực' });
    expect(economy).toHaveTextContent('chưa phải vốn đã giải ngân hay đã cam kết');
    expect(economy).toHaveTextContent('Tổng vốn dự kiến của 2 dự án có số liệu');
    expect(economy).toHaveTextContent('1 dự án chưa có số liệu vốn, không tính vào tổng');
    expect(within(economy).getByRole('list', { name: 'Vốn dự kiến theo lĩnh vực' })).toBeTruthy();
  });

  it('nói thẳng chưa có nguồn về trách nhiệm/giải ngân thay vì dựng bảng giả', async () => {
    renderWithI18n(<ProvinceBriefing />);
    expect(await screen.findByText(/Chưa có nguồn công bố về chủ đầu tư/)).toBeTruthy();
  });
});
