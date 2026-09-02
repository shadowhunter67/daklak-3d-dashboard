import type { WorldBounds } from '../coordinates/worldCoordinates';
import type { HeightGrid } from './terrainGrid';

/**
 * Reconstructs the surface the GPU actually rasterizes — not the raw height texture. `terrainGrid.ts`'s
 * `sampleHeightGrid` bilinearly reads the full-resolution height PNG (1024x1024), but
 * `WorldTerrainMesh.tsx` renders that texture displaced over a much coarser `planeGeometry` (192x160
 * segments, `terrainConfig.ts`'s `terrainSegments`) — i.e. a 193x161 vertex grid, ~1.1km/cell. Between
 * those vertices the mesh is *linearly rasterized*, so a query answered from the full-res texture and
 * the point the player actually sees on screen can disagree by up to ~180m (measured against the real
 * shipped PNG). That's ~14x the height of a true-scale PR2 building — enough to bury buildings and walk
 * the player through the visible ground on sloped terrain. See
 * `reports/tourism-digital-twin/world-scale-lod-adr.md` (PR4/9) for the full writeup; this module is
 * the fix — `getHeight` (`terrainHeightSampler.ts`) now answers "where is the surface I must place an
 * object on" using this reconstruction, while `getElevationMeters` keeps using the data-accurate
 * `sampleHeightGrid` for HUD display (a deliberate, different contract — see that module's doc comment).
 *
 * Two details are load-bearing for matching the GPU exactly, both independently measured:
 * - **Triangle topology**: `PlaneGeometry` triangulates each quad along the `b-d` diagonal
 *   (`indices.push(a, b, d); indices.push(b, c, d)` — see `three/src/geometries/PlaneGeometry.js`).
 *   Bilinear-over-the-quad interpolation (ignoring which triangle a point falls in) disagrees with the
 *   real rasterization by up to ~85m on a non-planar quad.
 * - **Texel-centre texture addressing**: the GPU samples `displacementMap` with standard texture
 *   addressing, `uv * N - 0.5` (clamped), not `terrainGrid.ts`'s `sampleHeightGrid`'s `u * (N - 1)`
 *   convention (which is correct for *that* module's own purpose — data-accurate elevation readout —
 *   but is a half-texel off from what the vertex shader's displacement lookup actually samples).
 *   Using the wrong convention here costs another ~34m.
 */

/** Precomputed height at each mesh vertex, queryable by world position. Pure — no canvas/DOM/three.js,
 * so this is unit-testable with small synthetic grids (see `terrainMeshSurface.test.ts`). */
export interface MeshSurface {
  /** Normalized (0..1) height at the rendered mesh surface, or `null` outside the bbox — same
   * out-of-bounds semantics as `sampleHeightGrid` (exact boundary is inside, no clamping). */
  getNormalizedHeight(worldX: number, worldZ: number): number | null;
}

function texelCentreBilinear(grid: HeightGrid, u: number, v: number): number {
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
}

/** Builds the precomputed vertex grid once (called at sampler load, not per query — same "decode
 * once, reuse forever" contract `terrainHeightSampler.ts` documents for the PNG decode itself). */
export function buildMeshSurface(
  grid: HeightGrid,
  bounds: WorldBounds,
  segments: readonly [number, number],
): MeshSurface {
  const { minX, maxX, minZ, maxZ } = bounds;
  const [segX, segY] = segments;
  const vertsX = segX + 1;
  const vertsY = segY + 1;
  const vertexHeights = new Float32Array(vertsX * vertsY);

  // iy = 0 is the north edge (minZ) — same row-0-is-north convention as `terrainGrid.ts`'s
  // `sampleHeightGrid` (cross-checked derivation in `terrainHeightSampler.ts`'s doc comment).
  for (let iy = 0; iy < vertsY; iy++) {
    const v = iy / segY;
    for (let ix = 0; ix < vertsX; ix++) {
      const u = ix / segX;
      vertexHeights[iy * vertsX + ix] = texelCentreBilinear(grid, u, v);
    }
  }

  return {
    getNormalizedHeight(worldX, worldZ) {
      if (worldX < minX || worldX > maxX || worldZ < minZ || worldZ > maxZ) return null;
      if (maxX === minX || maxZ === minZ) return null;

      const u = (worldX - minX) / (maxX - minX);
      const v = (worldZ - minZ) / (maxZ - minZ);
      const fx = u * segX;
      const fy = v * segY;

      const ix0 = Math.min(segX - 1, Math.floor(fx));
      const iy0 = Math.min(segY - 1, Math.floor(fy));
      const localX = fx - ix0;
      const localY = fy - iy0;

      const at = (ix: number, iy: number) => vertexHeights[iy * vertsX + ix];
      // Quad corners, matching PlaneGeometry's own vertex naming for the triangulated quad:
      // a = (ix0, iy0), b = (ix0, iy0+1), c = (ix0+1, iy0+1), d = (ix0+1, iy0). Diagonal is b-d.
      const a = at(ix0, iy0);
      const b = at(ix0, iy0 + 1);
      const c = at(ix0 + 1, iy0 + 1);
      const d = at(ix0 + 1, iy0);

      if (localX + localY <= 1) {
        // Triangle (a, b, d): a + (d - a) * localX + (b - a) * localY
        return a + (d - a) * localX + (b - a) * localY;
      }
      // Triangle (b, c, d): c + (b - c) * (1 - localX) + (d - c) * (1 - localY)
      return c + (b - c) * (1 - localX) + (d - c) * (1 - localY);
    },
  };
}
