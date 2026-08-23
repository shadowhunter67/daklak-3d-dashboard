import { describe, expect, it } from 'vitest';
import { sampleHeightGrid, type HeightGrid } from './terrainGrid';
import type { WorldBounds } from '../coordinates/worldCoordinates';

const bounds: WorldBounds = { minX: 0, maxX: 10, minZ: 0, maxZ: 10 };

describe('sampleHeightGrid', () => {
  it('returns the exact corner values at the four bbox corners', () => {
    // 2x2 grid: row 0 = north edge, row 1 = south edge; col 0 = west, col 1 = east.
    const grid: HeightGrid = { width: 2, height: 2, data: [0, 1, 0.5, 0.25] };
    // data layout: [NW=0, NE=1, SW=0.5, SE=0.25]
    expect(sampleHeightGrid(grid, bounds, 0, 0)).toBeCloseTo(0, 10); // NW
    expect(sampleHeightGrid(grid, bounds, 10, 0)).toBeCloseTo(1, 10); // NE
    expect(sampleHeightGrid(grid, bounds, 0, 10)).toBeCloseTo(0.5, 10); // SW
    expect(sampleHeightGrid(grid, bounds, 10, 10)).toBeCloseTo(0.25, 10); // SE
  });

  it('bilinearly interpolates the exact center of a 2x2 grid', () => {
    const grid: HeightGrid = { width: 2, height: 2, data: [0, 1, 0.5, 0.25] };
    const center = sampleHeightGrid(grid, bounds, 5, 5);
    expect(center).toBeCloseTo((0 + 1 + 0.5 + 0.25) / 4, 10);
  });

  it('interpolates linearly along a single axis for a uniform gradient', () => {
    // 5-wide, 1-tall grid: value equals column index / 4 (a simple ramp along X).
    const grid: HeightGrid = { width: 5, height: 1, data: [0, 0.25, 0.5, 0.75, 1] };
    const flatBounds: WorldBounds = { minX: 0, maxX: 100, minZ: 0, maxZ: 1 };
    expect(sampleHeightGrid(grid, flatBounds, 0, 0)).toBeCloseTo(0, 10);
    expect(sampleHeightGrid(grid, flatBounds, 50, 0)).toBeCloseTo(0.5, 10);
    expect(sampleHeightGrid(grid, flatBounds, 100, 0)).toBeCloseTo(1, 10);
    expect(sampleHeightGrid(grid, flatBounds, 25, 0)).toBeCloseTo(0.25, 10);
  });

  it('returns null strictly outside the bounds on every side', () => {
    const grid: HeightGrid = { width: 2, height: 2, data: [0, 0, 0, 0] };
    expect(sampleHeightGrid(grid, bounds, -0.001, 5)).toBeNull();
    expect(sampleHeightGrid(grid, bounds, 10.001, 5)).toBeNull();
    expect(sampleHeightGrid(grid, bounds, 5, -0.001)).toBeNull();
    expect(sampleHeightGrid(grid, bounds, 5, 10.001)).toBeNull();
  });

  it('treats the exact boundary as inside, not outside', () => {
    const grid: HeightGrid = { width: 2, height: 2, data: [0.1, 0.2, 0.3, 0.4] };
    expect(sampleHeightGrid(grid, bounds, 0, 0)).not.toBeNull();
    expect(sampleHeightGrid(grid, bounds, 10, 10)).not.toBeNull();
  });

  it('degenerate (zero-area) bounds never divides by zero / never returns NaN or Infinity', () => {
    const grid: HeightGrid = { width: 2, height: 2, data: [0, 0, 0, 0] };
    const degenerate: WorldBounds = { minX: 5, maxX: 5, minZ: 0, maxZ: 10 };
    expect(sampleHeightGrid(grid, degenerate, 5, 5)).toBeNull();
  });

  it('a larger grid still resolves finite values everywhere inside bounds', () => {
    const size = 16;
    const data = new Float32Array(size * size);
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) data[row * size + col] = (row + col) / (2 * (size - 1));
    }
    const grid: HeightGrid = { width: size, height: size, data };
    for (let i = 0; i <= 10; i++) {
      const value = sampleHeightGrid(grid, bounds, i, 10 - i);
      expect(value).not.toBeNull();
      expect(Number.isFinite(value)).toBe(true);
    }
  });
});
