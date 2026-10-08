import { describe, expect, it } from 'vitest';
import { verifiedTourismDestinations } from './verifiedTourismDestinations';
import { validateTourismDestination } from './validation/validateTourismDestination';
import { TOURISM_DESTINATION_CATEGORIES } from './types';
import terrainMetadata from '#province-assets/daklak-terrain-metadata.json';

describe('verifiedTourismDestinations', () => {
  it('has exactly the sourced entries (5 from phases T2/T4 + 22 from the 2026-10 expansion)', () => {
    expect(verifiedTourismDestinations).toHaveLength(28);
    expect(verifiedTourismDestinations.map((d) => d.id).sort()).toEqual([
      'bao-tang-dak-lak',
      'buon-ako-dhong',
      'buon-don',
      'cao-nguyen-van-hoa',
      'cau-ong-cop',
      'chua-pho-minh',
      'dam-o-loan',
      'dinh-lac-giao',
      'dray-nur-waterfall',
      'duc-me-giang-son',
      'ganh-da-dia',
      'ho-lak',
      'krong-kmar-waterfall',
      'lang-ca-phe-trung-nguyen',
      'mui-dien',
      'nha-day-buon-ma-thuot',
      'nui-chop-chai',
      'nui-da-bia',
      'thac-bay-nhanh',
      'thac-dray-knao',
      'thac-gia-long',
      'thac-thuy-tien',
      'thap-nhan',
      'thap-yang-prong',
      'vinh-xuan-dai',
      'vung-ro',
      'vuon-quoc-gia-ea-so',
      'yok-don-national-park',
    ]);
  });

  it('every entry passes structural validation', () => {
    for (const destination of verifiedTourismDestinations) {
      expect(validateTourismDestination(destination), destination.id).toEqual([]);
    }
  });

  it('every entry has a non-empty https sourceUrl', () => {
    for (const destination of verifiedTourismDestinations) {
      expect(destination.sourceUrl, destination.id).toMatch(/^https:\/\//);
    }
  });

  it('every entry has a unique id', () => {
    const ids = verifiedTourismDestinations.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every entry has a category from the closed union', () => {
    for (const destination of verifiedTourismDestinations) {
      expect(TOURISM_DESTINATION_CATEGORIES).toContain(destination.category);
    }
  });

  it('every coordinate is within Đắk Lắk bbox from terrainMetadata.json', () => {
    // Same bbox source as terrainConfig.ts / WorldTerrainMesh — real terrain metadata, not a
    // separately-invented bounding box.
    const [minLon, minLat, maxLon, maxLat] = terrainMetadata.bbox;
    for (const destination of verifiedTourismDestinations) {
      const [lon, lat] = destination.coordinates;
      expect(lon, destination.id).toBeGreaterThanOrEqual(minLon);
      expect(lon, destination.id).toBeLessThanOrEqual(maxLon);
      expect(lat, destination.id).toBeGreaterThanOrEqual(minLat);
      expect(lat, destination.id).toBeLessThanOrEqual(maxLat);
    }
  });

  it('only entries with a verified free image carry image fields', () => {
    const withImage = verifiedTourismDestinations.filter((d) => d.imageUrl);
    expect(withImage.map((d) => d.id).sort()).toEqual([
      'bao-tang-dak-lak',
      'buon-ako-dhong',
      'buon-don',
      'chua-pho-minh',
      'dam-o-loan',
      'dinh-lac-giao',
      'dray-nur-waterfall',
      'duc-me-giang-son',
      'ganh-da-dia',
      'ho-lak',
      'krong-kmar-waterfall',
      'lang-ca-phe-trung-nguyen',
      'mui-dien',
      'nha-day-buon-ma-thuot',
      'nui-chop-chai',
      'nui-da-bia',
      'thac-bay-nhanh',
      'thac-dray-knao',
      'thac-gia-long',
      'thap-nhan',
      'thap-yang-prong',
      'vinh-xuan-dai',
      'vung-ro',
      'vuon-quoc-gia-ea-so',
      'yok-don-national-park',
    ]);
    for (const destination of withImage) {
      expect(destination.imageAttribution).toBeTruthy();
      expect(destination.imageLicense).toBeTruthy();
    }
  });
});
