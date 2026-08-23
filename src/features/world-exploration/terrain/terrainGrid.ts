import type { WorldBounds } from '../coordinates/worldCoordinates';

/**
 * Pure, dependency-free bilinear sampling over a decoded height raster. Deliberately separate
 * from `terrainHeightSampler.ts` (which does the actual PNG decode, a browser-only operation) so
 * this coordinate-transform + interpolation math is unit-testable with small synthetic grids, no
 * canvas/Image/DOM required.
 */
export interface HeightGrid {
  width: number;
  height: number;
  /** Row-major (row 0 = north edge of the real-world bbox — see `sampleHeightGrid`'s doc
   * comment), single channel, already normalized to 0..1. Length must be `width * height`. */
  data: ArrayLike<number>;
}

/**
 * Row/column <-> world-space mapping, derived independently from two directions and
 * cross-checked (see `terrainHeightSampler.ts` for the full derivation against
 * `scripts/generate_daklak_terrain.py`'s `lonlat_to_pixel`/crop logic, and
 * `worldCoordinates.ts` for the scene-graph rotation derivation):
 *
 * - `bounds.minX`/`maxX` are the world-space west/east edges (column 0 / column width-1).
 * - `bounds.minZ`/`maxZ` are the world-space north/south edges (row 0 / row height-1) — `minZ` is
 *   north because Mercator Y decreases as latitude increases, and `worldZ === mercatorY`
 *   (`worldCoordinates.ts`), so the smaller Z is always the more-northern one for this projection.
 *
 * Returns `null` outside the bbox (including a small epsilon-free exact-boundary case, which is
 * inside) rather than clamping — silently clamping would make "am I off the edge of the data"
 * indistinguishable from "I'm right at the edge", which matters for movement clamping.
 */
export function sampleHeightGrid(
  grid: HeightGrid,
  bounds: WorldBounds,
  worldX: number,
  worldZ: number,
): number | null {
  const { minX, maxX, minZ, maxZ } = bounds;
  if (worldX < minX || worldX > maxX || worldZ < minZ || worldZ > maxZ) return null;
  if (maxX === minX || maxZ === minZ) return null;

  const u = (worldX - minX) / (maxX - minX);
  const vFromNorth = (worldZ - minZ) / (maxZ - minZ);

  const fx = u * (grid.width - 1);
  const fy = vFromNorth * (grid.height - 1);

  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const x1 = Math.min(x0 + 1, grid.width - 1);
  const y1 = Math.min(y0 + 1, grid.height - 1);
  const tx = fx - x0;
  const ty = fy - y0;

  const at = (col: number, row: number) => grid.data[row * grid.width + col];
  const top = at(x0, y0) * (1 - tx) + at(x1, y0) * tx;
  const bottom = at(x0, y1) * (1 - tx) + at(x1, y1) * tx;
  return top * (1 - ty) + bottom * ty;
}
