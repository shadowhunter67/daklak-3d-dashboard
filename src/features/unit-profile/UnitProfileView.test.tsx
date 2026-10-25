import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ResearchedDataset } from '../../entities/researched-project/types';
import labels from '#province-assets/daklak-labels.json';
import { ADMIN_UNIT_MEDIA } from '../../data/adminUnitMedia';
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
      retrievedAt: '2026-09-29T00:00:00.000Z',
    },
  ],
  projects: [
    {
      id: 'p1',
      name: 'Khu du lịch hồ thử nghiệm',
      lifecycle: obs('investment-attraction' as const),
      sector: 'tourism',
      administrativeAreaCodes: ['24580'],
      fields: { totalInvestment: [obs(500_000_000_000)] },
      verification: 'partial',
    },
    {
      id: 'p2',
      name: 'Dự án chưa có vốn',
      lifecycle: obs('investment-attraction' as const),
      sector: 'other',
      administrativeAreaCodes: ['24580'],
      fields: {},
      verification: 'incomplete',
    },
  ],
};

vi.mock('../../data/loadResearchedProjects', () => ({
  loadResearchedProjects: () => Promise.resolve(dataset),
}));

import { UnitProfileView } from './UnitProfileView';

afterEach(cleanup);

function renderUnit(code: string) {
  const handlers = {
    onBack: vi.fn(),
    onViewOnMap: vi.fn(),
    onOpenCatalog: vi.fn(),
    onOpenDestination: vi.fn(),
  };
  renderWithI18n(<UnitProfileView code={code} {...handlers} />);
  return handlers;
}

describe('UnitProfileView', () => {
  it('hiện số liệu thật của đơn vị (tên, loại, diện tích, dân số, mật độ)', async () => {
    renderUnit('24580');
    expect(await screen.findByRole('heading', { level: 1, name: /Liên Sơn Lắk/ })).toBeTruthy();
    expect(screen.getByText(/km²/)).toBeTruthy();
    expect(screen.getByText('Mật độ dân số')).toBeTruthy();
  });

  it('liệt kê điểm du lịch nằm trong ranh giới, ghi rõ đây là kết quả suy ra', async () => {
    renderUnit('24580');
    await screen.findByRole('heading', { level: 1 });
    const tourism = screen.getByRole('region', { name: 'Điểm du lịch trong địa bàn' });
    expect(tourism).toHaveTextContent('Hồ Lắk');
    expect(tourism).toHaveTextContent(/suy ra/);
  });

  it('gom dự án thu hút đầu tư; vốn chỉ tính dự án có số liệu và nói rõ phần còn thiếu', async () => {
    const { onOpenCatalog } = renderUnit('24580');
    const section = await screen.findByRole('region', {
      name: 'Dự án thu hút đầu tư trong địa bàn',
    });
    await waitFor(() => expect(section).toHaveTextContent('Khu du lịch hồ thử nghiệm'));
    expect(section).toHaveTextContent('1 dự án chưa có số liệu vốn');
    fireEvent.click(screen.getByRole('button', { name: /Xem tất cả trong danh mục/ }));
    expect(onOpenCatalog).toHaveBeenCalledWith('24580');
  });

  it('đơn vị có điểm đến kèm ảnh: hiện ảnh điểm đến, ghi rõ không phải ảnh toàn cảnh, kèm giấy phép', async () => {
    renderUnit('24580');
    await screen.findByRole('heading', { level: 1 });
    expect(screen.getByRole('img', { name: /Ảnh tham chiếu của Hồ Lắk/ })).toBeTruthy();
    expect(screen.getByText(/không phải ảnh toàn cảnh/)).toBeTruthy();
    expect(screen.getAllByText(/CC BY-SA/).length).toBeGreaterThan(0);
    expect(screen.queryByRole('img', { name: /Hình dạng ranh giới/ })).toBeNull();
  });

  it('không có ảnh thì dùng hình ranh giới GIS và nói thẳng độ phủ thật', async () => {
    const withMedia = new Set(ADMIN_UNIT_MEDIA.map((m) => m.administrativeUnitCode));
    const total = Object.keys(labels).length;
    const bare = Object.keys(labels).find((c) => !withMedia.has(c))!;
    renderUnit(bare);
    await screen.findByRole('heading', { level: 1 });
    expect(screen.getByRole('img', { name: /Hình dạng ranh giới/ })).toBeTruthy();
    expect(
      screen.getByText(new RegExp(`${withMedia.size}/${total} đơn vị có ảnh đã xác minh`)),
    ).toBeTruthy();
  });

  it('mã không tồn tại → thông báo rõ ràng, không crash', async () => {
    renderUnit('99999');
    expect(await screen.findByText(/Không tìm thấy đơn vị hành chính/)).toBeTruthy();
  });
});
