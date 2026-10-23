import { describe, expect, it } from 'vitest';
import type { UnitProfile } from '../../../data/unitProfiles';
import type { CatalogRow } from '../../investment-catalog/model/catalogModel';
import { buildUnitProfileModel, imageCoverage, type UnitMedia } from './unitProfileModel';

const profile: UnitProfile = {
  name: 'Buôn Đôn',
  type: 'xa',
  population2025: 6000,
  areaKm2: 100,
  villages: 5,
  buon: 7,
  residentialGroups: 0,
  neighbourhoods: 0,
};

const row = (id: string, areaCodes: string[], capitalVnd?: number): CatalogRow => ({
  id,
  name: id,
  sector: 'energy',
  areaCodes,
  capitalVnd,
  locationAccuracy: undefined,
  hasLocation: false,
  notes: [],
  documentNumber: undefined,
  publishedAt: undefined,
  sourceUrl: undefined,
  evidence: [],
});

describe('buildUnitProfileModel', () => {
  it('tính mật độ và tổng đơn vị con từ số liệu gốc', () => {
    const model = buildUnitProfileModel('X1', { profile, opportunities: [] });
    expect(model.densityPerKm2).toBe(60);
    expect(model.subUnits).toEqual({
      villages: 5,
      buon: 7,
      residentialGroups: 0,
      neighbourhoods: 0,
      total: 12,
    });
  });

  it('chỉ gom dự án thu hút đầu tư thuộc đúng đơn vị; vốn chỉ cộng các dự án có số liệu', () => {
    const model = buildUnitProfileModel('X1', {
      profile,
      opportunities: [
        row('a', ['X1'], 100_000_000_000),
        row('b', ['X1', 'X2'], undefined),
        row('c', ['X2'], 999),
      ],
    });
    expect(model.opportunities.map((o) => o.id)).toEqual(['a', 'b']);
    expect(model.opportunityCapitalVnd).toBe(100_000_000_000);
    expect(model.opportunitiesWithoutCapital).toBe(1);
  });

  it('diện tích 0 hoặc thiếu thì không bịa mật độ', () => {
    const model = buildUnitProfileModel('X1', {
      profile: { ...profile, areaKm2: 0 },
      opportunities: [],
    });
    expect(model.densityPerKm2).toBeUndefined();
  });
});

describe('imageCoverage', () => {
  const media = (code: string, usage: UnitMedia['usage']): UnitMedia => ({
    id: `m-${code}-${usage}`,
    administrativeUnitCode: code,
    subject: 'x',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:X.jpg',
    provider: 'Wikimedia Commons',
    license: 'CC BY-SA 4.0',
    author: 'A',
    retrievedAt: '2026-10-23T00:00:00.000Z',
    localAsset: usage === 'production' ? `images/units/${code}.jpg` : undefined,
    usage,
  });

  it('chỉ ảnh production tính là đã xác minh; còn lại dùng bản đồ GIS, không bịa 100%', () => {
    const result = imageCoverage(
      ['U1', 'U2', 'U3'],
      [media('U1', 'production'), media('U2', 'reference-only'), media('U2', 'rejected')],
    );
    expect(result).toEqual({ total: 3, verified: 1, fallback: 2, referenceOnly: 1 });
  });

  it('không có manifest → 0 đã xác minh', () => {
    expect(imageCoverage(['U1', 'U2'], [])).toEqual({
      total: 2,
      verified: 0,
      fallback: 2,
      referenceOnly: 0,
    });
  });
});
