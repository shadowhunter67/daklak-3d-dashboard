import { describe, expect, it } from 'vitest';
import type { ResearchedDataset } from '../../../entities/researched-project/types';
import {
  buildCatalogRows,
  filterCatalogRows,
  formatCapitalBillions,
  sortCatalogRows,
} from './catalogModel';

const obs = <T>(value: T, sourceId = 's1') => ({
  value,
  sourceId,
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
      url: 'https://example.vn/x',
      documentNumber: '1985/QĐ-UBND',
      sourceType: 'official-legal-document',
      publishedAt: '2026-06-24T00:00:00.000Z',
      retrievedAt: '2026-09-29T00:00:00.000Z',
    },
  ],
  projects: [
    {
      id: 'a',
      name: 'Điện gió Ea Súp',
      lifecycle: obs('investment-attraction' as const),
      sector: 'energy',
      administrativeAreaCodes: ['24133'],
      fields: { totalInvestment: [obs(3_400_000_000_000)] },
      verification: 'partial',
      location: {
        coordinates: [108, 12.7],
        accuracy: 'administrative-centroid',
        sourceId: 's1',
        verificationMethods: ['administrative-centroid'],
      },
    },
    {
      id: 'b',
      name: 'Khu du lịch Hồ Lắk',
      lifecycle: obs('investment-attraction' as const),
      sector: 'tourism',
      administrativeAreaCodes: [],
      fields: {},
      verification: 'incomplete',
    },
    {
      id: 'c',
      name: 'Bệnh viện đa khoa',
      lifecycle: obs('investment-attraction' as const),
      sector: 'health',
      administrativeAreaCodes: ['24133', '24999'],
      fields: { totalInvestment: [obs(500_000_000_000)] },
      verification: 'partial',
    },
  ],
};

describe('buildCatalogRows', () => {
  it('lấy vốn đã giải quyết và thông tin nguồn; thiếu vốn → undefined, không bịa 0', () => {
    const rows = buildCatalogRows(dataset);
    expect(rows.find((r) => r.id === 'a')).toMatchObject({
      capitalVnd: 3_400_000_000_000,
      documentNumber: '1985/QĐ-UBND',
      publishedAt: '2026-06-24T00:00:00.000Z',
      hasLocation: true,
    });
    expect(rows.find((r) => r.id === 'b')?.capitalVnd).toBeUndefined();
    expect(rows.find((r) => r.id === 'b')?.hasLocation).toBe(false);
  });
});

describe('filterCatalogRows', () => {
  const rows = buildCatalogRows(dataset);
  it('tìm không phân biệt dấu/hoa thường', () => {
    expect(filterCatalogRows(rows, { query: 'ho lak' }).map((r) => r.id)).toEqual(['b']);
    expect(filterCatalogRows(rows, { query: 'DIEN GIO' }).map((r) => r.id)).toEqual(['a']);
  });
  it('lọc theo lĩnh vực và theo đơn vị hành chính', () => {
    expect(filterCatalogRows(rows, { sector: 'health' }).map((r) => r.id)).toEqual(['c']);
    expect(filterCatalogRows(rows, { area: '24133' }).map((r) => r.id)).toEqual(['a', 'c']);
  });
  it('bộ lọc rỗng trả đủ', () => {
    expect(filterCatalogRows(rows, {})).toHaveLength(3);
  });
});

describe('sortCatalogRows', () => {
  const rows = buildCatalogRows(dataset);
  it('vốn giảm dần, dự án chưa có vốn xuống cuối', () => {
    expect(sortCatalogRows(rows, 'capital-desc').map((r) => r.id)).toEqual(['a', 'c', 'b']);
  });
  it('theo tên A-Z (locale vi)', () => {
    expect(sortCatalogRows(rows, 'name-asc').map((r) => r.id)).toEqual(['c', 'a', 'b']);
  });
});

describe('formatCapitalBillions', () => {
  it('đổi VND sang tỷ, theo locale', () => {
    expect(formatCapitalBillions(3_400_000_000_000, 'vi')).toBe('3.400');
    expect(formatCapitalBillions(1_234_500_000, 'vi')).toBe('1,23');
    expect(formatCapitalBillions(3_400_000_000_000, 'en')).toBe('3,400');
    expect(formatCapitalBillions(918_997_020_000_000, 'vi')).toBe('918.997');
  });
});
