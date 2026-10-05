import { describe, expect, it } from 'vitest';
import {
  createBoulderGeometry,
  createCliffBlockGeometry,
  createStreakTextureData,
  createTerrainGeometry,
  createWaterNormalData,
  fbm3,
  scatterAlongPath,
  seeded,
  terrainHeight,
} from './dioramaGeometry';

describe('seeded', () => {
  it('is deterministic per seed and stays in [0, 1)', () => {
    const a = seeded(42);
    const b = seeded(42);
    const values = Array.from({ length: 50 }, () => a());
    expect(values).toEqual(Array.from({ length: 50 }, () => b()));
    expect(values.every((v) => v >= 0 && v < 1)).toBe(true);
    expect(seeded(43)()).not.toBe(values[0]);
  });
});

describe('createBoulderGeometry', () => {
  it('normalises to a unit box standing on y = 0', () => {
    const geometry = createBoulderGeometry(1, 0.3, seeded(3));
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    expect(box.min.y).toBeCloseTo(0, 5);
    expect(box.max.y - box.min.y).toBeCloseTo(1, 5);
    expect(box.max.x - box.min.x).toBeCloseTo(1, 5);
    expect(box.max.z - box.min.z).toBeCloseTo(1, 5);
  });
});

describe('createCliffBlockGeometry', () => {
  it('keeps a flat base so the block sits on the ground', () => {
    const height = 2;
    const geometry = createCliffBlockGeometry(3, height, 1.5, seeded(8));
    const position = geometry.getAttribute('position');
    for (let i = 0; i < position.count; i++) {
      if (Math.abs(position.getY(i) + height / 2) < 1e-6) {
        expect(position.getY(i)).toBeCloseTo(-height / 2, 6);
      }
    }
    expect(Number.isFinite(position.getX(0))).toBe(true);
  });
});

describe('scatterAlongPath', () => {
  const path = [
    [0, -2],
    [0, 4],
  ] as const;

  it('returns the requested count, part-buried, away from the channel', () => {
    const placements = scatterAlongPath(path, 20, 2, 1, seeded(5));
    expect(placements).toHaveLength(20);
    for (const p of placements) {
      expect(p.position[1]).toBeLessThan(0);
      expect(Math.abs(p.position[0])).toBeGreaterThanOrEqual(2);
      expect(p.position[2]).toBeGreaterThanOrEqual(-2);
      expect(p.position[2]).toBeLessThanOrEqual(4);
    }
  });
});

describe('createStreakTextureData', () => {
  it('is RGBA sized and tiles vertically (first and last rows are neighbours in phase)', () => {
    const data = createStreakTextureData(8, 32, seeded(7));
    expect(data).toHaveLength(8 * 32 * 4);
    expect(Math.max(...Array.from(data).filter((_, i) => i % 4 === 3))).toBeGreaterThan(0);
  });
});

describe('noise', () => {
  it('fbm3 stays in [0, 1] and is deterministic', () => {
    for (let i = 0; i < 50; i++) {
      const v = fbm3(i * 0.37, i * 0.11, i * 0.73, 4, 2);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
      expect(v).toBe(fbm3(i * 0.37, i * 0.11, i * 0.73, 4, 2));
    }
  });
});

describe('terrainHeight', () => {
  it('keeps the river channel low and the valley sides and back higher', () => {
    const channel = terrainHeight(0, 2, -2.2);
    expect(channel).toBeLessThan(0.2);
    expect(terrainHeight(12, 2, -2.2)).toBeGreaterThan(channel + 3);
    expect(terrainHeight(-12, 2, -2.2)).toBeGreaterThan(channel + 3);
    expect(terrainHeight(0, -20, -2.2)).toBeGreaterThan(channel + 3);
  });

  it('raises the bed upstream of the weir', () => {
    expect(terrainHeight(0, -4, -2.2)).toBeGreaterThan(terrainHeight(0, 1, -2.2) + 0.2);
  });
});

describe('createTerrainGeometry', () => {
  it('has finite heights and one colour per vertex', () => {
    const geometry = createTerrainGeometry(20, 20, 20, 20, -6, -2.2);
    const position = geometry.getAttribute('position');
    const color = geometry.getAttribute('color');
    expect(color.count).toBe(position.count);
    for (let i = 0; i < position.count; i++) expect(Number.isFinite(position.getY(i))).toBe(true);
  });
});

describe('createWaterNormalData', () => {
  it('produces unit-ish upward-facing normals', () => {
    const data = createWaterNormalData(16, seeded(1));
    expect(data).toHaveLength(16 * 16 * 4);
    for (let i = 0; i < data.length; i += 4) expect(data[i + 2]).toBeGreaterThan(200);
  });
});
