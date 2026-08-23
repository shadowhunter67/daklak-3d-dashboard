import { describe, expect, it } from 'vitest';
import { verifiedTourismDestinations } from './verifiedTourismDestinations';
import { validateTourismDestination } from './validation/validateTourismDestination';
import { TOURISM_DESTINATION_CATEGORIES } from './types';
import terrainMetadata from '../../assets/maps/daklak/daklak-terrain-metadata.json';

describe('verifiedTourismDestinations', () => {
  it('has exactly the 4 verified Phase T2 entries plus Phase T4’s krong-kmar-waterfall', () => {
    expect(verifiedTourismDestinations).toHaveLength(5);
    expect(verifiedTourismDestinations.map((d) => d.id).sort()).toEqual([
      'buon-don',
      'dray-nur-waterfall',
      'ho-lak',
      'krong-kmar-waterfall',
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

  it('only the two entries with a verified free image carry image fields', () => {
    const withImage = verifiedTourismDestinations.filter((d) => d.imageUrl);
    expect(withImage.map((d) => d.id).sort()).toEqual(['ho-lak', 'yok-don-national-park']);
    for (const destination of withImage) {
      expect(destination.imageAttribution).toBeTruthy();
      expect(destination.imageLicense).toBeTruthy();
    }
  });
});
