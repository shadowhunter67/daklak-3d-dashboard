import { describe, expect, it } from 'vitest';
import { findNearestPoi, getWorldPoiById, POI_PROXIMITY_RADIUS, worldPois } from './worldPoi';
import { verifiedTourismDestinations } from '../../../entities/tourism/verifiedTourismDestinations';

describe('worldPois', () => {
  it('has exactly one runtime POI per verified destination, in the same order', () => {
    expect(worldPois).toHaveLength(verifiedTourismDestinations.length);
    expect(worldPois.map((p) => p.id)).toEqual(verifiedTourismDestinations.map((d) => d.id));
  });

  it('every POI carries a finite precomputed world position', () => {
    for (const poi of worldPois) {
      expect(Number.isFinite(poi.world.x)).toBe(true);
      expect(Number.isFinite(poi.world.z)).toBe(true);
    }
  });

  it('does not fabricate an English name/description not present in the source data', () => {
    for (const poi of worldPois) {
      expect((poi as unknown as Record<string, unknown>).nameEn).toBeUndefined();
      expect((poi as unknown as Record<string, unknown>).descriptionEn).toBeUndefined();
    }
  });
});

describe('getWorldPoiById', () => {
  it('finds a known real destination by id', () => {
    expect(getWorldPoiById('ho-lak')?.name).toBe('Hồ Lắk');
  });

  it('returns undefined for an unknown id (never fabricates a placeholder POI)', () => {
    expect(getWorldPoiById('does-not-exist')).toBeUndefined();
  });
});

describe('findNearestPoi', () => {
  it('returns null for an empty POI list', () => {
    expect(findNearestPoi({ x: 0, z: 0 }, [])).toBeNull();
  });

  it('returns the exact POI (distance 0) when standing on top of it', () => {
    const target = worldPois[0]!;
    const result = findNearestPoi(target.world);
    expect(result?.poi.id).toBe(target.id);
    expect(result?.distance).toBeCloseTo(0, 10);
  });

  it('picks the closer of two POIs correctly', () => {
    const [a, b] = worldPois;
    if (!a || !b) throw new Error('test requires at least 2 real POIs');
    const nearA = { x: a.world.x + 0.001, z: a.world.z };
    const result = findNearestPoi(nearA, [a, b]);
    expect(result?.poi.id).toBe(a.id);
  });

  it('distance grows monotonically with real separation', () => {
    const target = worldPois[0]!;
    const near = findNearestPoi({ x: target.world.x + 0.01, z: target.world.z }, [target]);
    const far = findNearestPoi({ x: target.world.x + 1, z: target.world.z }, [target]);
    expect(near!.distance).toBeLessThan(far!.distance);
  });
});

describe('POI_PROXIMITY_RADIUS', () => {
  it('is a small positive number (world units, not degrees or meters)', () => {
    expect(POI_PROXIMITY_RADIUS).toBeGreaterThan(0);
    expect(POI_PROXIMITY_RADIUS).toBeLessThan(5);
  });
});
