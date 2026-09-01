// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { terrainMetadata, terrainSegments } from '../../../components/map/terrainConfig';
import { getWorldBounds } from '../coordinates/worldCoordinates';
import { sampleHeightGrid, type HeightGrid } from './terrainGrid';
import { buildMeshSurface } from './terrainMeshSurface';
import { decodeGrayscale8Png } from '../../../test/decodeGrayscale8Png';

/**
 * Real-PNG cross-check for `terrainMeshSurface.ts`, decoded the same way
 * `poi/destinationElevation.realTerrain.test.ts` does (shared decoder — see that file's doc
 * comment for why: `jsdom` has no real `<canvas>` 2D rendering). Per this feature's test
 * philosophy (established in PR1's `worldScale.test.ts`), the reference value here is computed
 * independently of `buildMeshSurface`'s own implementation, not by re-calling the module under
 * test with different inputs.
 */

/** Deterministic LCG, not `Math.random()` — reproducible sample points across runs. */
function makeRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

/** Independent reference reconstruction: builds the mesh vertex grid via direct `uv` arithmetic
 * (not reusing `buildMeshSurface`'s helpers) and picks the triangle by a barycentric sign check
 * instead of the `localX + localY <= 1` shortcut the implementation uses. */
function referenceMeshHeight(
  grid: HeightGrid,
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number },
  segments: readonly [number, number],
  worldX: number,
  worldZ: number,
): number | null {
  const { minX, maxX, minZ, maxZ } = bounds;
  if (worldX < minX || worldX > maxX || worldZ < minZ || worldZ > maxZ) return null;

  const [segX, segY] = segments;

  const texelAt = (u: number, v: number): number => {
    const px = Math.min(Math.max(u * grid.width - 0.5, 0), grid.width - 1);
    const py = Math.min(Math.max(v * grid.height - 0.5, 0), grid.height - 1);
    const x0 = Math.floor(px);
    const y0 = Math.floor(py);
    const x1 = Math.min(x0 + 1, grid.width - 1);
    const y1 = Math.min(y0 + 1, grid.height - 1);
    const tx = px - x0;
    const ty = py - y0;
    const at = (col: number, row: number) => grid.data[row * grid.width + col];
    const top = at(x0, y0) * (1 - tx) + at(x1, y0) * tx;
    const bottom = at(x0, y1) * (1 - tx) + at(x1, y1) * tx;
    return top * (1 - ty) + bottom * ty;
  };

  const vertexHeight = (ix: number, iy: number) => texelAt(ix / segX, iy / segY);

  const u = (worldX - minX) / (maxX - minX);
  const v = (worldZ - minZ) / (maxZ - minZ);
  const fx = u * segX;
  const fy = v * segY;
  const ix0 = Math.min(segX - 1, Math.floor(fx));
  const iy0 = Math.min(segY - 1, Math.floor(fy));
  const lx = fx - ix0;
  const ly = fy - iy0;

  const a = vertexHeight(ix0, iy0);
  const b = vertexHeight(ix0, iy0 + 1);
  const c = vertexHeight(ix0 + 1, iy0 + 1);
  const d = vertexHeight(ix0 + 1, iy0);

  // Barycentric sign check, independent of the implementation's `lx + ly <= 1` branch: point P is
  // in triangle (a, b, d) iff it's on the origin side of the b-d diagonal (lx + ly = 1 line).
  const onADSideOfDiagonal = lx + ly <= 1;
  if (onADSideOfDiagonal) {
    return a * (1 - lx - ly) + d * lx + b * ly;
  }
  const lx2 = 1 - lx;
  const ly2 = 1 - ly;
  return c * (1 - lx2 - ly2) + b * lx2 + d * ly2;
}

describe('terrainMeshSurface vs the real daklak-terrain-height.png (PR4/9)', () => {
  const pngPath = resolve(__dirname, '../../../assets/maps/daklak/daklak-terrain-height.png');
  const grid = decodeGrayscale8Png(readFileSync(pngPath));
  const bounds = getWorldBounds();
  const { elevationMinMeters, elevationMaxMeters } = terrainMetadata;
  const elevationRange = elevationMaxMeters - elevationMinMeters;
  const surface = buildMeshSurface(grid, bounds, terrainSegments);

  const samplePoints: Array<[number, number]> = (() => {
    const rng = makeRng(0xd4c1a1);
    const points: Array<[number, number]> = [];
    for (let i = 0; i < 20000; i++) {
      const x = bounds.minX + rng() * (bounds.maxX - bounds.minX);
      const z = bounds.minZ + rng() * (bounds.maxZ - bounds.minZ);
      points.push([x, z]);
    }
    return points;
  })();

  it('agrees with an independently-written reference reconstruction to float precision', () => {
    let maxDiff = 0;
    for (const [x, z] of samplePoints) {
      const implValue = surface.getNormalizedHeight(x, z);
      const refValue = referenceMeshHeight(grid, bounds, terrainSegments, x, z);
      expect(implValue).not.toBeNull();
      expect(refValue).not.toBeNull();
      maxDiff = Math.max(maxDiff, Math.abs(implValue! - refValue!));
    }
    expect(maxDiff).toBeLessThan(1e-6);
  });

  it('regression guard: differs materially from the raw-texture sample (documents the PR4/9 fix)', () => {
    // If a future refactor silently reverts `getHeight` back to the raw full-res texture read,
    // this assertion fails loudly instead of the bug shipping silently again.
    let maxDiffMeters = 0;
    let sumAbsDiffMeters = 0;
    for (const [x, z] of samplePoints) {
      const meshValue = surface.getNormalizedHeight(x, z)!;
      const rawValue = sampleHeightGrid(grid, bounds, x, z)!;
      const diffMeters = Math.abs(meshValue - rawValue) * elevationRange;
      maxDiffMeters = Math.max(maxDiffMeters, diffMeters);
      sumAbsDiffMeters += diffMeters;
    }
    const meanDiffMeters = sumAbsDiffMeters / samplePoints.length;

    expect(maxDiffMeters).toBeGreaterThan(50);
    // Plausibility bound on the whole reconstruction — a broken orientation/convention would blow
    // this up by an order of magnitude; measured real-world mean is roughly 5-20m.
    expect(meanDiffMeters).toBeGreaterThan(1);
    expect(meanDiffMeters).toBeLessThan(50);
  });
});
