import { describe, expect, it } from 'vitest';
import {
  getWorldBounds,
  haversineDistanceMeters,
  latLonToWorld,
  worldDistance,
  worldToLatLon,
} from './worldCoordinates';
import { projection } from '../../../utils/geo';
import terrainMetadata from '../../../assets/maps/daklak/daklak-terrain-metadata.json';
import { verifiedTourismDestinations } from '../../../entities/tourism/verifiedTourismDestinations';

describe('latLonToWorld / worldToLatLon', () => {
  it('matches projection() directly for a reference point (province centroid)', () => {
    const [lon, lat] = [108.5, 12.7];
    const expected = projection([lon, lat])!;
    const actual = latLonToWorld(lon, lat);
    expect(actual.x).toBeCloseTo(expected[0], 10);
    expect(actual.z).toBeCloseTo(expected[1], 10);
  });

  it('round-trips lon/lat -> world -> lon/lat within floating-point tolerance', () => {
    for (const destination of verifiedTourismDestinations) {
      const [lon, lat] = destination.coordinates;
      const world = latLonToWorld(lon, lat);
      const [backLon, backLat] = worldToLatLon(world.x, world.z);
      expect(backLon).toBeCloseTo(lon, 8);
      expect(backLat).toBeCloseTo(lat, 8);
    }
  });

  it('distinct real destinations produce distinct, finite world coordinates', () => {
    const points = verifiedTourismDestinations.map((d) => latLonToWorld(...d.coordinates));
    for (const point of points) {
      expect(Number.isFinite(point.x)).toBe(true);
      expect(Number.isFinite(point.z)).toBe(true);
    }
    // No two of the 4 real, geographically distinct destinations should collide onto the same
    // world point (would indicate a broken projection, not just an unlikely coincidence).
    const keys = new Set(points.map((p) => `${p.x.toFixed(6)},${p.z.toFixed(6)}`));
    expect(keys.size).toBe(points.length);
  });
});

describe('worldDistance', () => {
  it('is zero for the same point and symmetric', () => {
    const a = latLonToWorld(108.0, 12.5);
    const b = latLonToWorld(108.2, 12.6);
    expect(worldDistance(a, a)).toBe(0);
    expect(worldDistance(a, b)).toBeCloseTo(worldDistance(b, a), 12);
  });

  it('grows with real geographic separation (Hồ Lắk vs Buôn Đôn, ~60km apart)', () => {
    const hoLak = verifiedTourismDestinations.find((d) => d.id === 'ho-lak')!;
    const buonDon = verifiedTourismDestinations.find((d) => d.id === 'buon-don')!;
    const near = latLonToWorld(...hoLak.coordinates);
    const far = latLonToWorld(...buonDon.coordinates);
    const nudged = latLonToWorld(hoLak.coordinates[0] + 0.001, hoLak.coordinates[1]);
    expect(worldDistance(near, far)).toBeGreaterThan(worldDistance(near, nudged) * 10);
  });
});

describe('haversineDistanceMeters', () => {
  it('is zero for the same point', () => {
    expect(haversineDistanceMeters([108.2, 12.5], [108.2, 12.5])).toBe(0);
  });

  it('is symmetric', () => {
    const a: [number, number] = [107.9, 12.4];
    const b: [number, number] = [108.1, 12.6];
    expect(haversineDistanceMeters(a, b)).toBeCloseTo(haversineDistanceMeters(b, a), 6);
  });

  it('matches the well-known ~111.2 km per degree of latitude at the equator-ish scale', () => {
    // 1 degree of latitude is ~111.2 km everywhere (unlike longitude, which shrinks toward the
    // poles) — a solid sanity check independent of this province's specific coordinates.
    const meters = haversineDistanceMeters([108, 12], [108, 13]);
    expect(meters).toBeGreaterThan(110000);
    expect(meters).toBeLessThan(112500);
  });

  it('gives a plausible real-world distance between two known Đắk Lắk destinations', () => {
    const hoLak = verifiedTourismDestinations.find((d) => d.id === 'ho-lak')!;
    const buonDon = verifiedTourismDestinations.find((d) => d.id === 'buon-don')!;
    const meters = haversineDistanceMeters(hoLak.coordinates, buonDon.coordinates);
    // These two are roughly 55-70 km apart in reality (Lắk district to Buôn Đôn district) — a
    // generous sanity band, not an exact assertion, since this only guards against an order-of
    // -magnitude bug (e.g. forgetting a radians conversion), not pixel-perfect geodesy.
    expect(meters).toBeGreaterThan(30000);
    expect(meters).toBeLessThan(120000);
  });
});

describe('getWorldBounds', () => {
  it('derives a non-degenerate box that contains every real destination', () => {
    const bounds = getWorldBounds();
    expect(bounds.maxX).toBeGreaterThan(bounds.minX);
    expect(bounds.maxZ).toBeGreaterThan(bounds.minZ);
    for (const destination of verifiedTourismDestinations) {
      const point = latLonToWorld(...destination.coordinates);
      expect(point.x).toBeGreaterThanOrEqual(bounds.minX);
      expect(point.x).toBeLessThanOrEqual(bounds.maxX);
      expect(point.z).toBeGreaterThanOrEqual(bounds.minZ);
      expect(point.z).toBeLessThanOrEqual(bounds.maxZ);
    }
  });

  it('the province bbox corners project to exactly the reported bounds', () => {
    const [minLon, minLat, maxLon, maxLat] = terrainMetadata.bbox;
    const corners = [
      latLonToWorld(minLon, minLat),
      latLonToWorld(minLon, maxLat),
      latLonToWorld(maxLon, minLat),
      latLonToWorld(maxLon, maxLat),
    ];
    const bounds = getWorldBounds();
    const xs = corners.map((c) => c.x);
    const zs = corners.map((c) => c.z);
    expect(bounds.minX).toBeCloseTo(Math.min(...xs), 10);
    expect(bounds.maxX).toBeCloseTo(Math.max(...xs), 10);
    expect(bounds.minZ).toBeCloseTo(Math.min(...zs), 10);
    expect(bounds.maxZ).toBeCloseTo(Math.max(...zs), 10);
  });
});
