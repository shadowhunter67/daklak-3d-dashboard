import { describe, expect, it } from 'vitest';
import {
  buildBuildingGeometryData,
  buildingHeightWorldUnits,
  BUILDING_HEIGHT_SCALE,
} from './worldBuildingGeometry';
import type { BuildingCollection } from '../../../data/loadBuildings';

function collectionWithOneSquare(heightMeters: number): BuildingCollection {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          id: 'osm-way-1',
          name: null,
          buildingType: 'yes',
          heightMeters,
          heightMethod: 'estimated-default-levels',
          sourceId: 'test',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [108.05, 12.68],
              [108.0501, 12.68],
              [108.0501, 12.6801],
              [108.05, 12.6801],
              [108.05, 12.68],
            ],
          ],
        },
      },
    ],
  };
}

describe('buildingHeightWorldUnits', () => {
  it('scales by sqrt(meters) * BUILDING_HEIGHT_SCALE', () => {
    expect(buildingHeightWorldUnits(10)).toBeCloseTo(BUILDING_HEIGHT_SCALE * Math.sqrt(10), 10);
  });

  it('is positive for any positive height', () => {
    expect(buildingHeightWorldUnits(3.3)).toBeGreaterThan(0);
  });

  it('compresses a ~19x real height range (3.3m house vs a real 62.7m tower) to well under 19x in world units — the actual bug this scale fixes', () => {
    const house = buildingHeightWorldUnits(3.3);
    const tower = buildingHeightWorldUnits(62.7);
    expect(tower / house).toBeLessThan(6);
  });

  it('keeps the tallest real building in the pilot dataset (62.7m, the "Chung cư Hoàng Anh BIDV" tower) well under the ~1 world unit spike this scale was shipped-then-fixed to avoid (see the doc comment above) — regression guard, verified live in a browser before this bound was set', () => {
    expect(buildingHeightWorldUnits(62.7)).toBeLessThan(0.3);
  });
});

describe('buildBuildingGeometryData', () => {
  it('returns non-empty, equal-length positions and normals for a single footprint', () => {
    const data = buildBuildingGeometryData(collectionWithOneSquare(10), () => 0, 0.3);
    expect(data.positions.length).toBeGreaterThan(0);
    expect(data.positions.length % 3).toBe(0);
    expect(data.normals.length).toBe(data.positions.length);
  });

  it('every vertex Y sits between the ground height and ground height + extruded depth', () => {
    const groundZ = 1.5;
    const depth = buildingHeightWorldUnits(10);
    const data = buildBuildingGeometryData(collectionWithOneSquare(10), () => groundZ, 0.3);
    for (let i = 2; i < data.positions.length; i += 3) {
      const y = data.positions[i]!;
      expect(y).toBeGreaterThanOrEqual(groundZ - 1e-6);
      expect(y).toBeLessThanOrEqual(groundZ + depth + 1e-6);
    }
  });

  it('falls back to the given ground height when the sampler returns null', () => {
    const fallback = 0.42;
    const data = buildBuildingGeometryData(collectionWithOneSquare(5), () => null, fallback);
    const minY = Math.min(
      ...Array.from({ length: data.positions.length / 3 }, (_, i) => data.positions[i * 3 + 2]!),
    );
    expect(minY).toBeCloseTo(fallback, 5);
  });

  it('returns empty arrays for an empty collection', () => {
    const empty: BuildingCollection = { type: 'FeatureCollection', features: [] };
    const data = buildBuildingGeometryData(empty, () => 0, 0.3);
    expect(data.positions.length).toBe(0);
    expect(data.normals.length).toBe(0);
  });
});
