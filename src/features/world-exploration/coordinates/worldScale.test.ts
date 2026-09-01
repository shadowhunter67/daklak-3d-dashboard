import { describe, expect, it } from 'vitest';
import { displacementScale, terrainMetadata } from '../../../components/map/terrainConfig';
import { haversineDistanceMeters, latLonToWorld } from './worldCoordinates';
import {
  METERS_PER_WORLD_UNIT_HORIZONTAL,
  METERS_PER_WORLD_UNIT_VERTICAL,
  VERTICAL_EXAGGERATION,
  metersToWorld,
  worldToMeters,
} from './worldScale';

describe('METERS_PER_WORLD_UNIT_HORIZONTAL', () => {
  it('is a plausible real-world distance (tens of km per world-unit, not meters or thousands of km)', () => {
    expect(METERS_PER_WORLD_UNIT_HORIZONTAL).toBeGreaterThan(30_000);
    expect(METERS_PER_WORLD_UNIT_HORIZONTAL).toBeLessThan(55_000);
  });

  it('cross-checks against an independent haversine measurement between two different bbox points (not the same points the module itself used)', () => {
    const [minLon, minLat, maxLon, maxLat] = terrainMetadata.bbox;
    const nw = latLonToWorld(minLon, maxLat);
    const se = latLonToWorld(maxLon, minLat);
    const worldWidth = Math.hypot(se.x - nw.x, se.z - nw.z);
    const realDistance = haversineDistanceMeters([minLon, maxLat], [maxLon, minLat]);
    const impliedMetersPerUnit = realDistance / worldWidth;
    // A province-spanning diagonal crosses more latitude than the 1-unit-at-center measurement,
    // so Mercator distortion differs a bit across it — allow a looser tolerance than a same-point
    // check would need, while still catching a wrong-by-a-large-factor regression.
    expect(impliedMetersPerUnit).toBeGreaterThan(METERS_PER_WORLD_UNIT_HORIZONTAL * 0.9);
    expect(impliedMetersPerUnit).toBeLessThan(METERS_PER_WORLD_UNIT_HORIZONTAL * 1.1);
  });
});

describe('METERS_PER_WORLD_UNIT_VERTICAL / VERTICAL_EXAGGERATION', () => {
  it('matches the elevation-range / displacementScale formula from primary source data', () => {
    const expected =
      (terrainMetadata.elevationMaxMeters - terrainMetadata.elevationMinMeters) / displacementScale;
    expect(METERS_PER_WORLD_UNIT_VERTICAL).toBeCloseTo(expected, 6);
  });

  it('vertical is more exaggerated than horizontal (ratio > 1) — terrain relief is compressed to be visible at province scale', () => {
    expect(VERTICAL_EXAGGERATION).toBeGreaterThan(1);
  });

  it('exaggeration factor is in a plausible range for this dataset (roughly 4x-7x, not off by an order of magnitude)', () => {
    expect(VERTICAL_EXAGGERATION).toBeGreaterThan(4);
    expect(VERTICAL_EXAGGERATION).toBeLessThan(7);
  });
});

describe('metersToWorld / worldToMeters', () => {
  it('are exact inverses', () => {
    for (const meters of [0, 1.7, 62.7, 1000, 200_000]) {
      expect(worldToMeters(metersToWorld(meters))).toBeCloseTo(meters, 6);
    }
  });

  it('metersToWorld(0) is 0', () => {
    expect(metersToWorld(0)).toBe(0);
  });

  it('a real human height (1.7m) converts to a small positive world-unit value, far smaller than the province width (~5.16 units)', () => {
    const eyeHeight = metersToWorld(1.7);
    expect(eyeHeight).toBeGreaterThan(0);
    expect(eyeHeight).toBeLessThan(0.001);
  });
});
