import { describe, expect, it } from 'vitest';
import { buildBuildingGeometryData, buildingHeightWorldUnits } from './worldBuildingGeometry';
import { metersToWorld } from '../coordinates/worldScale';
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
  it('delegates exactly to the shared metersToWorld conversion — no independent scale factor', () => {
    for (const meters of [0, 3.3, 10, 62.7]) {
      expect(buildingHeightWorldUnits(meters)).toBe(metersToWorld(meters));
    }
  });

  it('is positive for any positive height, zero at zero', () => {
    expect(buildingHeightWorldUnits(3.3)).toBeGreaterThan(0);
    expect(buildingHeightWorldUnits(0)).toBe(0);
  });

  it('clamps negative input to 0 instead of producing a negative depth', () => {
    expect(buildingHeightWorldUnits(-5)).toBe(0);
  });

  it('is linear (true scale) — height ratio between two buildings exactly matches their real-meter ratio, unlike the old sqrt-compressed version', () => {
    const house = buildingHeightWorldUnits(3.3);
    const tower = buildingHeightWorldUnits(62.7);
    expect(tower / house).toBeCloseTo(62.7 / 3.3, 6);
  });

  it('keeps the tallest real building in the pilot dataset (62.7m, the "Chung cư Hoàng Anh BIDV" tower) a small fraction of the whole province width (~5.16 world units) — regression guard against the spike bug (PR #105) recurring', () => {
    expect(buildingHeightWorldUnits(62.7)).toBeLessThan(0.01);
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
