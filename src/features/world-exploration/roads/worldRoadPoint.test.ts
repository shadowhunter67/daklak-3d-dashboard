import { describe, expect, it, vi } from 'vitest';
import { latLonToWorld } from '../coordinates/worldCoordinates';
import { worldToMeters } from '../coordinates/worldScale';
import type { TerrainSampler } from '../terrain/terrainHeightSampler';
import { projectRoadPoint, ROAD_FALLBACK_HEIGHT, ROAD_GROUND_LIFT } from './worldRoadPoint';

function fakeSampler(height: number | null): TerrainSampler {
  return { getHeight: vi.fn(() => height), getElevationMeters: vi.fn(() => null) };
}

describe('projectRoadPoint', () => {
  const coordinate: [number, number] = [108.0, 12.5];

  it('maps [lon, lat] to the same x/z the shared coordinate utility produces, negating z for the local pre-rotation frame', () => {
    const [x, negatedZ] = projectRoadPoint(fakeSampler(0.1), coordinate);
    const world = latLonToWorld(coordinate[0], coordinate[1]);
    expect(x).toBe(world.x);
    expect(negatedZ).toBe(-world.z);
  });

  it('ground-anchors the local-Z (world Y after rotation) to the sampled terrain height plus a small lift', () => {
    const [, , y] = projectRoadPoint(fakeSampler(0.12), coordinate);
    expect(y).toBeCloseTo(0.12 + ROAD_GROUND_LIFT, 10);
  });

  it('falls back to a flat height while the sampler has not loaded (null)', () => {
    const [, , y] = projectRoadPoint(null, coordinate);
    expect(y).toBe(ROAD_FALLBACK_HEIGHT);
  });

  it('falls back to a flat height when the vertex is outside the terrain data extent (sampler returns null)', () => {
    const [, , y] = projectRoadPoint(fakeSampler(null), coordinate);
    expect(y).toBe(ROAD_FALLBACK_HEIGHT);
  });

  it('queries the sampler at the same world position it returns x/z for', () => {
    const sampler = fakeSampler(0.05);
    projectRoadPoint(sampler, coordinate);
    const world = latLonToWorld(coordinate[0], coordinate[1]);
    expect(sampler.getHeight).toHaveBeenCalledWith(world.x, world.z);
  });

  // PR4/9 (world-scale-lod-adr.md): ROAD_GROUND_LIFT is now expressed in real meters via
  // metersToWorld — cross-check the real-world meaning, not just the formula that produced it.
  it('ROAD_GROUND_LIFT means a plausible real kerb-height clearance, not the old terrain-vertical fudge', () => {
    const meters = worldToMeters(ROAD_GROUND_LIFT);
    expect(meters).toBeCloseTo(0.25, 3);
    expect(meters).toBeGreaterThan(0.05);
    expect(meters).toBeLessThan(1);
  });
});
