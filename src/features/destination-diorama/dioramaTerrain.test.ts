import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  createHeightfieldGeometry,
  forestPlacements,
  makeShoreHeight,
  makeTerrainColor,
  makeValleyHeight,
  scatterOnTerrain,
} from './dioramaTerrain';

describe('makeValleyHeight', () => {
  const valley = makeValleyHeight({
    channelHalf: 3,
    sideHeight: 5,
    backHeight: 6,
    backStart: -8,
    relief: 2,
  });

  it('keeps the channel low and raises the sides and the back', () => {
    expect(valley(0, 2)).toBeLessThan(0.2);
    expect(valley(14, 2)).toBeGreaterThan(valley(0, 2) + 2);
    expect(valley(0, -20)).toBeGreaterThan(valley(0, 2) + 2);
  });

  it('a steeper valley closes in faster on the channel', () => {
    const steep = makeValleyHeight({
      channelHalf: 3,
      sideHeight: 5,
      backHeight: 0,
      backStart: -8,
      relief: 0,
      steepness: 2.4,
    });
    const gentle = makeValleyHeight({
      channelHalf: 3,
      sideHeight: 5,
      backHeight: 0,
      backStart: -8,
      relief: 0,
    });
    expect(steep(5, 0)).toBeGreaterThan(gentle(5, 0));
  });
});

describe('makeShoreHeight', () => {
  const shore = makeShoreHeight({
    inland: (_x, z) => -z,
    slopeLen: 5,
    inlandHeight: 3,
    seaDepth: 1,
    relief: 0,
  });

  it('is below water on the sea side, at the waterline on the coast, and rises inland', () => {
    expect(shore(0, 4)).toBeLessThan(-0.5);
    expect(Math.abs(shore(0, 0))).toBeLessThan(0.05);
    expect(shore(0, -8)).toBeGreaterThan(shore(0, -1));
    expect(shore(0, -8)).toBeGreaterThan(1);
  });

  it('is continuous across the coastline', () => {
    expect(Math.abs(shore(0, 0.001) - shore(0, -0.001))).toBeLessThan(0.02);
  });
});

describe('forestPlacements', () => {
  const flat = () => 1;
  const base = {
    count: 40,
    seed: 7,
    height: flat,
    sample: (r: () => number): [number, number] => [(r() - 0.5) * 20, (r() - 0.5) * 20],
  };

  it('is deterministic per seed and builds crowns and trunks together', () => {
    const a = forestPlacements(base);
    const b = forestPlacements(base);
    expect(a).toEqual(b);
    expect(a.trunks).toHaveLength(40);
    expect(a.crowns.flat()).toHaveLength(40 * 5);
  });

  it('skips spots below minY or above maxY, and rejected samples', () => {
    expect(forestPlacements({ ...base, minY: 2 }).trunks).toHaveLength(0);
    expect(forestPlacements({ ...base, maxY: 0.5 }).trunks).toHaveLength(0);
    expect(forestPlacements({ ...base, sample: () => null }).trunks).toHaveLength(0);
  });
});

describe('scatterOnTerrain', () => {
  it('places part-buried blocks on the terrain height', () => {
    const height = () => 2;
    const blocks = scatterOnTerrain(10, 3, (r) => [r() * 5, r() * 5], height, [0.2, 0.5]);
    expect(blocks).toHaveLength(10);
    for (const b of blocks) expect(b.position[1]).toBeLessThan(2);
  });
});

describe('createHeightfieldGeometry', () => {
  it('samples the height function and colours every vertex', () => {
    const color = makeTerrainColor({ low: '#00ff00', high: '#003300', highAt: 3 });
    const geometry = createHeightfieldGeometry(
      { width: 10, depth: 10, segmentsX: 10, segmentsZ: 10, centerZ: -2 },
      (x, z) => x * 0.1 + z * 0.05,
      color,
    );
    const position = geometry.getAttribute('position') as THREE.BufferAttribute;
    const colors = geometry.getAttribute('color');
    expect(colors.count).toBe(position.count);
    for (let i = 0; i < position.count; i++) {
      const expected = position.getX(i) * 0.1 + position.getZ(i) * 0.05;
      expect(position.getY(i)).toBeCloseTo(expected, 5);
    }
  });
});
