import { describe, expect, it } from 'vitest';
import { buildMeshSurface } from './terrainMeshSurface';
import type { HeightGrid } from './terrainGrid';
import type { WorldBounds } from '../coordinates/worldCoordinates';

const bounds: WorldBounds = { minX: 0, maxX: 10, minZ: 0, maxZ: 10 };

describe('buildMeshSurface', () => {
  it('returns the constant value everywhere for a constant grid', () => {
    const grid: HeightGrid = { width: 4, height: 4, data: new Array(16).fill(0.7) };
    const surface = buildMeshSurface(grid, bounds, [2, 2]);
    for (const [x, z] of [
      [0, 0],
      [10, 0],
      [5, 5],
      [3, 7],
      [10, 10],
    ]) {
      // precision 6, not 10: vertex heights are stored in a Float32Array (deliberate — same
      // precision budget as the rest of this scene's geometry, see module doc comment).
      expect(surface.getNormalizedHeight(x, z)).toBeCloseTo(0.7, 6);
    }
  });

  it('reproduces an exact linear ramp along x, surviving subsampling and triangulation', () => {
    // 5-wide texture ramping 0..1 along x; mesh segments coarser than the texture (2 segments).
    const grid: HeightGrid = {
      width: 5,
      height: 1,
      data: [0, 0.25, 0.5, 0.75, 1],
    };
    const flatBounds: WorldBounds = { minX: 0, maxX: 100, minZ: 0, maxZ: 1 };
    const surface = buildMeshSurface(grid, flatBounds, [2, 1]);
    expect(surface.getNormalizedHeight(0, 0)).toBeCloseTo(0, 6);
    expect(surface.getNormalizedHeight(50, 0)).toBeCloseTo(0.5, 6);
    expect(surface.getNormalizedHeight(100, 0)).toBeCloseTo(1, 6);
    expect(surface.getNormalizedHeight(25, 0)).toBeCloseTo(0.25, 6);
    expect(surface.getNormalizedHeight(77, 0)).toBeCloseTo(0.77, 6);
  });

  it('reproduces an exact linear ramp along z', () => {
    const grid: HeightGrid = {
      width: 1,
      height: 5,
      data: [0, 0.25, 0.5, 0.75, 1],
    };
    const flatBounds: WorldBounds = { minX: 0, maxX: 1, minZ: 0, maxZ: 100 };
    const surface = buildMeshSurface(grid, flatBounds, [1, 2]);
    expect(surface.getNormalizedHeight(0, 0)).toBeCloseTo(0, 6);
    expect(surface.getNormalizedHeight(0, 50)).toBeCloseTo(0.5, 6);
    expect(surface.getNormalizedHeight(0, 100)).toBeCloseTo(1, 6);
  });

  it('interpolates along the real PlaneGeometry triangle diagonal (b-d), not bilinear-over-quad', () => {
    // A single 2x2-segment quad whose four corners are deliberately non-planar (a saddle), so
    // triangle-exact and bilinear-over-quad interpolation disagree away from the diagonal.
    // Corner layout: a=(0,0)=0, b=(0,1)=1, c=(1,1)=0, d=(1,0)=1 (checkerboard saddle).
    const grid: HeightGrid = { width: 2, height: 2, data: [0, 1, 1, 0] }; // [a, d, b, c] row-major
    const surface = buildMeshSurface(grid, bounds, [1, 1]);

    // Query near a corner off the diagonal so texel-centre bilinear (grid is only 2x2, texture
    // res == mesh res) reduces to the corner value itself, isolating the triangulation choice.
    // Point at localX=0.9, localY=0.1 (in triangle a-d-b since localX+localY=1.0 boundary;
    // pick localX=0.8, localY=0.1 -> sum 0.9 <= 1, triangle (a,b,d)).
    const worldX = bounds.minX + 0.8 * (bounds.maxX - bounds.minX);
    const worldZ = bounds.minZ + 0.1 * (bounds.maxZ - bounds.minZ);
    const triangleExact = surface.getNormalizedHeight(worldX, worldZ);

    // Independent bilinear-over-quad reference at the same local (fx=0.8, fy=0.1):
    // a=0, b=1, c=0, d=1 (from data layout below).
    const a = 0;
    const b = 1;
    const c = 0;
    const d = 1;
    const fx = 0.8;
    const fy = 0.1;
    const top = a * (1 - fx) + d * fx;
    const bottomRow = b * (1 - fx) + c * fx;
    const bilinearOverQuad = top * (1 - fy) + bottomRow * fy;

    // Triangle (a,b,d): a + (d-a)*fx + (b-a)*fy = 0 + 1*0.8 + 1*0.1 = 0.9
    expect(triangleExact).toBeCloseTo(0.9, 10);
    // Bilinear-over-quad: top=a*(1-fx)+d*fx=0.8, bottom=b*(1-fx)+c*fx=0.2, value=top*(1-fy)+bottom*fy=0.74
    expect(bilinearOverQuad).toBeCloseTo(0.74, 10);
    expect(triangleExact).not.toBeCloseTo(bilinearOverQuad, 2);
  });

  it('texel-centre clamping returns the exact corner texel at the bbox corners', () => {
    const grid: HeightGrid = {
      width: 3,
      height: 3,
      data: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8],
    };
    const surface = buildMeshSurface(grid, bounds, [4, 4]);
    expect(surface.getNormalizedHeight(bounds.minX, bounds.minZ)).toBeCloseTo(0, 6); // NW texel
    expect(surface.getNormalizedHeight(bounds.maxX, bounds.minZ)).toBeCloseTo(0.2, 6); // NE texel
    expect(surface.getNormalizedHeight(bounds.minX, bounds.maxZ)).toBeCloseTo(0.6, 6); // SW texel
    expect(surface.getNormalizedHeight(bounds.maxX, bounds.maxZ)).toBeCloseTo(0.8, 6); // SE texel
  });

  it('returns null strictly outside the bounds on every side', () => {
    const grid: HeightGrid = { width: 2, height: 2, data: [0, 0, 0, 0] };
    const surface = buildMeshSurface(grid, bounds, [1, 1]);
    expect(surface.getNormalizedHeight(-0.001, 5)).toBeNull();
    expect(surface.getNormalizedHeight(10.001, 5)).toBeNull();
    expect(surface.getNormalizedHeight(5, -0.001)).toBeNull();
    expect(surface.getNormalizedHeight(5, 10.001)).toBeNull();
  });

  it('treats the exact boundary as inside, not outside', () => {
    const grid: HeightGrid = { width: 2, height: 2, data: [0.1, 0.2, 0.3, 0.4] };
    const surface = buildMeshSurface(grid, bounds, [1, 1]);
    expect(surface.getNormalizedHeight(0, 0)).not.toBeNull();
    expect(surface.getNormalizedHeight(10, 10)).not.toBeNull();
  });

  it('degenerate (zero-area) bounds never divides by zero / never returns NaN or Infinity', () => {
    const grid: HeightGrid = { width: 2, height: 2, data: [0, 0, 0, 0] };
    const degenerate: WorldBounds = { minX: 5, maxX: 5, minZ: 0, maxZ: 10 };
    const surface = buildMeshSurface(grid, degenerate, [1, 1]);
    expect(surface.getNormalizedHeight(5, 5)).toBeNull();
  });

  it('a finer mesh (segments == texture resolution) still resolves finite values everywhere', () => {
    const size = 16;
    const data = new Float32Array(size * size);
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) data[row * size + col] = (row + col) / (2 * (size - 1));
    }
    const grid: HeightGrid = { width: size, height: size, data };
    const surface = buildMeshSurface(grid, bounds, [size - 1, size - 1]);
    for (let i = 0; i <= 10; i++) {
      const value = surface.getNormalizedHeight(i, 10 - i);
      expect(value).not.toBeNull();
      expect(Number.isFinite(value)).toBe(true);
    }
  });
});
