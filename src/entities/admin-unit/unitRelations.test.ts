import { describe, expect, it } from 'vitest';
import wards from '#province-assets/daklak-wards-render.json';
import type { WardCollection } from '../../types/map';
import { destinationUnit, groupDestinationsByUnit } from './unitRelations';

const collection = wards as WardCollection;

const square = (code: string, x0: number, y0: number, size = 1) => ({
  type: 'Feature' as const,
  properties: { code, name: code, type: 'xa' as const, provinceCode: '66' as const, areaKm2: 1 },
  geometry: {
    type: 'Polygon' as const,
    coordinates: [
      [
        // d3-geo coi vòng quay thuận chiều kim đồng hồ là phần bên trong (ngược quy ước RFC 7946);
        // dữ liệu ranh giới thật trong repo đã theo quy ước này.
        [x0, y0],
        [x0, y0 + size],
        [x0 + size, y0 + size],
        [x0 + size, y0],
        [x0, y0],
      ],
    ],
  },
});
const synthetic: WardCollection = {
  type: 'FeatureCollection',
  features: [square('A', 0, 0), square('B', 2, 0)],
};

describe('destinationUnit', () => {
  it('gán điểm nằm trong ranh giới, ghi rõ phương pháp suy ra', () => {
    expect(destinationUnit([0.5, 0.5], synthetic)).toEqual({
      code: 'A',
      method: 'point-in-polygon',
    });
    expect(destinationUnit([2.5, 0.5], synthetic)?.code).toBe('B');
  });

  it('điểm ngoài mọi ranh giới → null (không đoán đơn vị gần nhất)', () => {
    expect(destinationUnit([1.5, 0.5], synthetic)).toBeNull();
    expect(destinationUnit([50, 50], synthetic)).toBeNull();
  });

  it('toạ độ thiếu hoặc không hợp lệ → null', () => {
    expect(destinationUnit(undefined, synthetic)).toBeNull();
    expect(destinationUnit([Number.NaN, 1], synthetic)).toBeNull();
  });

  it('dùng dữ liệu thật: Hồ Lắk thuộc Liên Sơn Lắk (24580)', () => {
    expect(destinationUnit([108.18194, 12.42167], collection)?.code).toBe('24580');
  });
});

describe('groupDestinationsByUnit', () => {
  it('gom điểm đến theo mã đơn vị và bỏ các điểm không xác định được', () => {
    const grouped = groupDestinationsByUnit(
      [
        { id: 'p1', coordinates: [0.5, 0.5] as [number, number] },
        { id: 'p2', coordinates: [0.6, 0.6] as [number, number] },
        { id: 'p3', coordinates: [2.5, 0.5] as [number, number] },
        { id: 'p4', coordinates: [9, 9] as [number, number] },
      ],
      synthetic,
    );
    expect(grouped.get('A')?.map((d) => d.id)).toEqual(['p1', 'p2']);
    expect(grouped.get('B')?.map((d) => d.id)).toEqual(['p3']);
    expect(grouped.size).toBe(2);
  });
});
