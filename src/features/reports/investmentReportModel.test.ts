import { describe, expect, it } from 'vitest';
import type { CatalogRow } from '../investment-catalog/model/catalogModel';
import {
  benchmarkBySector,
  benchmarkByUnit,
  bottleneckSummary,
  capitalExposure,
} from './investmentReportModel';

const row = (id: string, over: Partial<CatalogRow> = {}): CatalogRow => ({
  id,
  name: id,
  sector: 'energy',
  areaCodes: ['U1'],
  capitalVnd: 1e12,
  locationAccuracy: 'approximate',
  hasLocation: true,
  notes: [],
  documentNumber: '1985/QĐ-UBND',
  publishedAt: undefined,
  sourceUrl: undefined,
  evidence: [],
  ...over,
});

const rows = [
  row('a', { capitalVnd: 4e12 }),
  row('b', { capitalVnd: 2e12, sector: 'tourism', areaCodes: ['U2'] }),
  row('c', { capitalVnd: undefined, sector: 'tourism', areaCodes: ['U1', 'U2'] }),
  row('d', { capitalVnd: 1e12, areaCodes: [] }),
];

describe('benchmarkBySector', () => {
  it('đếm số dự án; vốn và vốn trung bình chỉ tính dự án có số vốn', () => {
    const result = benchmarkBySector(rows);
    const energy = result.find((r) => r.key === 'energy')!;
    expect(energy).toMatchObject({
      projects: 2,
      withCapital: 2,
      capitalVnd: 5e12,
      averageVnd: 2.5e12,
    });
    const tourism = result.find((r) => r.key === 'tourism')!;
    expect(tourism).toMatchObject({
      projects: 2,
      withCapital: 1,
      capitalVnd: 2e12,
      averageVnd: 2e12,
    });
  });
  it('xếp theo vốn giảm dần', () => {
    expect(benchmarkBySector(rows).map((r) => r.key)).toEqual(['energy', 'tourism']);
  });
});

describe('benchmarkByUnit', () => {
  it('mỗi dự án tính cho từng địa bàn nó thuộc; dự án chưa rõ địa bàn không tính vào xã nào', () => {
    const result = benchmarkByUnit(rows, 10);
    expect(result.find((r) => r.key === 'U1')).toMatchObject({ projects: 2, capitalVnd: 4e12 });
    expect(result.find((r) => r.key === 'U2')).toMatchObject({ projects: 2, capitalVnd: 2e12 });
    expect(result.every((r) => r.key !== '')).toBe(true);
  });
  it('giới hạn top N', () => {
    expect(benchmarkByUnit(rows, 1)).toHaveLength(1);
  });
});

describe('bottleneckSummary', () => {
  it('chỉ nhóm "Quy hoạch" có dữ liệu; các nhóm khác ghi rõ chưa có nguồn, không có số', () => {
    const result = bottleneckSummary({ review: 5, uncited: 14 });
    expect(result.find((b) => b.id === 'planning')).toEqual({
      id: 'planning',
      count: 19,
      available: true,
    });
    for (const id of ['land', 'procedure', 'infrastructure'] as const) {
      expect(result.find((b) => b.id === id)).toEqual({ id, count: undefined, available: false });
    }
  });
});

describe('capitalExposure', () => {
  it('cộng vốn của dự án có vấn đề; dự án thiếu vốn không tính và được đếm riêng', () => {
    const result = capitalExposure({
      rows,
      flaggedIds: new Set(['a', 'c']),
    });
    expect(result).toEqual({
      flaggedProjects: 2,
      flaggedCapitalVnd: 4e12,
      flaggedWithoutCapital: 1,
      totalCapitalVnd: 7e12,
      shareOfTotal: 4 / 7,
    });
  });
});
