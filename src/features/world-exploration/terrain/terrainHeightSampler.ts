import {
  displacementBias,
  displacementScale,
  terrainHeightUrl,
  terrainMetadata,
} from '../../../components/map/terrainConfig';
import { getWorldBounds, type WorldBounds } from '../coordinates/worldCoordinates';
import { sampleHeightGrid, type HeightGrid } from './terrainGrid';

/**
 * CPU-side terrain height query — the gap `reports/tourism-digital-twin/world-engine-adr.md`
 * explicitly flagged as unimplemented ("No existing CPU-side elevation query API ... elevation
 * comes from a GPU displacement map sampled in the vertex shader"). Player/POI/teleport all need
 * to know "what's the ground height here" on the CPU; this decodes the exact same source texture
 * the GPU displaces with (`daklak-terrain-height.png`, see `WorldTerrainMesh.tsx`), once, and
 * reuses it for every subsequent query — never re-decodes per frame or per call.
 *
 * Why decode the shipped PNG at runtime instead of adding a new build-time asset/pipeline step:
 * this is the one dataset that must byte-for-byte match what the GPU is already displaying (a
 * separately-regenerated or downsampled copy could silently drift from the rendered mesh, putting
 * the player visibly above/below the ground the user can see). The browser's own `<canvas>` 2D API
 * decodes it losslessly with zero new dependency and zero new build step — see
 * `docs/world-exploration.md` for the full write-up of this decision.
 *
 * Row/column <-> geography mapping (cross-checked two independent ways, not assumed):
 * 1. `scripts/generate_daklak_terrain.py`'s `main()`: `top = lonlat_to_pixel(min_lon, max_lat, ...)`
 *    is used as the crop box's *upper* (PIL: smaller-y/top-of-image) bound, and `bottom` (from
 *    `min_lat`) as the *lower* bound — standard Web Mercator tile pixel-Y (increases southward).
 *    So PNG row 0 = north edge (max latitude), row (height-1) = south edge (min latitude).
 * 2. `worldCoordinates.ts`'s scene-graph derivation independently established `worldZ = mercatorY`,
 *    and `d3-geo`'s Mercator Y is smaller for higher latitude — so `getWorldBounds().minZ` is
 *    always the *north* edge and `maxZ` the *south* edge, for the same underlying reason. Both
 *    derivations agree: row 0 <-> `minZ` (north), row (height-1) <-> `maxZ` (south) — exactly what
 *    `sampleHeightGrid` assumes. `terrainHeightSampler.test.ts` also asserts this end-to-end
 *    against the real shipped PNG (not just the synthetic grids in `terrainGrid.test.ts`).
 *
 * Elevation reconstruction: `daklak-terrain-metadata.json`'s `elevationMinMeters`/
 * `elevationMaxMeters` are the exact percentile clip bounds `generate_daklak_terrain.py` used to
 * normalize raw SRTM meters into the PNG's 0..255 grayscale (`normalized*255`, after which a
 * Gaussian blur was applied — the blurred, saved PNG is decoded here, so this reconstructs
 * "displayed" elevation, matching the rendered mesh exactly, not a hypothetical unblurred value).
 */
export interface TerrainSampler {
  /** World-space displaced height (same units as everything else placed in this scene — e.g.
   * `terrainCenter`, marker positions), or `null` outside the real terrain data extent. */
  getHeight(worldX: number, worldZ: number): number | null;
  /** Approximate real-world elevation in meters, for HUD display only — reconstructed from the
   * same normalized grayscale value as `getHeight`, see module doc comment. `null` outside the
   * data extent. */
  getElevationMeters(worldX: number, worldZ: number): number | null;
}

function decodeGrayscalePng(bitmap: ImageBitmap): HeightGrid {
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('2D canvas context unavailable');
  ctx.drawImage(bitmap, 0, 0);
  const { data: rgba } = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
  // Grayscale PNG decodes to RGBA with R === G === B; read the R channel only.
  const normalized = new Float32Array(bitmap.width * bitmap.height);
  for (let i = 0; i < normalized.length; i++) normalized[i] = rgba[i * 4] / 255;
  return { width: bitmap.width, height: bitmap.height, data: normalized };
}

function buildSampler(grid: HeightGrid, bounds: WorldBounds): TerrainSampler {
  const { elevationMinMeters, elevationMaxMeters } = terrainMetadata;
  return {
    getHeight(worldX, worldZ) {
      const normalized = sampleHeightGrid(grid, bounds, worldX, worldZ);
      if (normalized === null) return null;
      return normalized * displacementScale + displacementBias;
    },
    getElevationMeters(worldX, worldZ) {
      const normalized = sampleHeightGrid(grid, bounds, worldX, worldZ);
      if (normalized === null) return null;
      return elevationMinMeters + normalized * (elevationMaxMeters - elevationMinMeters);
    },
  };
}

let pending: Promise<TerrainSampler> | null = null;

/** Module-level cache (same pattern as `I18nProvider.tsx`'s `pendingEnImport`): every caller
 * across the scene (player, POI markers, teleport) shares one decode, in flight or resolved. */
export function loadTerrainHeightSampler(): Promise<TerrainSampler> {
  if (!pending) {
    pending = fetch(terrainHeightUrl)
      .then((response) => {
        if (!response.ok) throw new Error(`terrain height fetch failed: ${response.status}`);
        return response.blob();
      })
      .then((blob) => createImageBitmap(blob))
      .then((bitmap) => {
        const grid = decodeGrayscalePng(bitmap);
        bitmap.close();
        return buildSampler(grid, getWorldBounds());
      })
      .catch((error) => {
        pending = null; // allow retry on next call instead of caching a permanent failure
        throw error;
      });
  }
  return pending;
}

/** Test-only escape hatch: `loadTerrainHeightSampler`'s module-level cache would otherwise leak
 * a resolved/rejected promise across unrelated test cases. */
export function __resetTerrainHeightSamplerCacheForTests(): void {
  pending = null;
}
