import { describe, expect, it, vi } from 'vitest';
import { verifiedTourismDestinations } from '../../../entities/tourism/verifiedTourismDestinations';
import { latLonToWorld } from '../coordinates/worldCoordinates';
import type { TerrainSampler } from '../terrain/terrainHeightSampler';
import {
  getDestinationMarkerHeight,
  MARKER_FALLBACK_HEIGHT,
  MARKER_GROUND_OFFSET,
} from './destinationElevation';

function fakeSampler(heightFor: (x: number, z: number) => number | null): TerrainSampler {
  return {
    getHeight: vi.fn(heightFor),
    getElevationMeters: vi.fn(() => null),
  };
}

describe('getDestinationMarkerHeight', () => {
  it('falls back to the flat height while the terrain sampler has not loaded yet (sampler === null)', () => {
    for (const destination of verifiedTourismDestinations) {
      expect(getDestinationMarkerHeight(null, destination)).toBe(MARKER_FALLBACK_HEIGHT);
    }
  });

  it('falls back to the flat height when the destination is outside the terrain data extent', () => {
    const sampler = fakeSampler(() => null);
    expect(getDestinationMarkerHeight(sampler, verifiedTourismDestinations[0])).toBe(
      MARKER_FALLBACK_HEIGHT,
    );
  });

  it('samples the shared terrain sampler at the destination’s real projected world position, for every one of the 4 verified destinations', () => {
    const sampler = fakeSampler(() => 0.1);
    for (const destination of verifiedTourismDestinations) {
      getDestinationMarkerHeight(sampler, destination);
      const expected = latLonToWorld(destination.coordinates[0], destination.coordinates[1]);
      expect(sampler.getHeight).toHaveBeenLastCalledWith(expected.x, expected.z);
    }
  });

  it('adds the small ground-lift offset on top of the sampled ground height', () => {
    const sampler = fakeSampler(() => 0.08);
    const height = getDestinationMarkerHeight(sampler, verifiedTourismDestinations[0]);
    expect(height).toBeCloseTo(0.08 + MARKER_GROUND_OFFSET, 10);
  });

  it('a higher sampled ground height produces a higher marker height (monotonic, not clamped/inverted)', () => {
    const low = getDestinationMarkerHeight(
      fakeSampler(() => 0.02),
      verifiedTourismDestinations[0],
    );
    const high = getDestinationMarkerHeight(
      fakeSampler(() => 0.2),
      verifiedTourismDestinations[0],
    );
    expect(high).toBeGreaterThan(low);
  });

  it('every real destination coordinate resolves to a finite world position the sampler can be queried at', () => {
    for (const destination of verifiedTourismDestinations) {
      const { x, z } = latLonToWorld(destination.coordinates[0], destination.coordinates[1]);
      expect(Number.isFinite(x)).toBe(true);
      expect(Number.isFinite(z)).toBe(true);
    }
  });
});
