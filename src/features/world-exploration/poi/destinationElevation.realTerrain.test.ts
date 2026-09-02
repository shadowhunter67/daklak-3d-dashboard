// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { verifiedTourismDestinations } from '../../../entities/tourism/verifiedTourismDestinations';
import { terrainMetadata } from '../../../components/map/terrainConfig';
import { latLonToWorld, getWorldBounds } from '../coordinates/worldCoordinates';
import { sampleHeightGrid } from '../terrain/terrainGrid';
import { decodeGrayscale8Png } from '../../../test/decodeGrayscale8Png';

/**
 * Phase T4 — sanity-range check of real per-destination elevation, decoded from the actual
 * shipped `daklak-terrain-height.png` (not a synthetic mock, unlike `terrainHeightSampler.test.ts`
 * — see that file's doc comment for why unit tests normally mock the canvas decode: `jsdom` has no
 * real `<canvas>` 2D rendering). This file sidesteps that limitation without a new runtime
 * dependency by decoding the PNG's IDAT stream directly with Node's built-in `zlib.inflateSync`
 * (the decoder lives in `src/test/decodeGrayscale8Png.ts`, shared with
 * `terrain/terrainMeshSurface.realTerrain.test.ts`). This is intentionally a plausibility/sanity
 * check on real data, not a GPS-survey-precision assertion — see the task's own instruction for
 * this sub-item.
 */

describe('real daklak-terrain-height.png elevation sanity check (Phase T4)', () => {
  const pngPath = resolve(__dirname, '../../../assets/maps/daklak/daklak-terrain-height.png');
  const grid = decodeGrayscale8Png(readFileSync(pngPath));
  const bounds = getWorldBounds();
  const { elevationMinMeters, elevationMaxMeters } = terrainMetadata;

  it('decodes to the metadata-declared 1024x1024 dimensions', () => {
    expect(grid.width).toBe(terrainMetadata.width);
    expect(grid.height).toBe(terrainMetadata.height);
  });

  it.each(verifiedTourismDestinations)(
    'reconstructs a plausible real-world elevation (0-1609 m, the province’s documented SRTM clip range) for $name',
    (destination) => {
      const { x, z } = latLonToWorld(destination.coordinates[0], destination.coordinates[1]);
      const normalized = sampleHeightGrid(grid, bounds, x, z);
      expect(normalized).not.toBeNull();
      const meters = elevationMinMeters + normalized! * (elevationMaxMeters - elevationMinMeters);

      // Sanity range, not GPS-survey precision (per this sub-item's explicit instruction): Đắk Lắk
      // province spans lowland river valleys to the Chư Yang Sin highlands, so the full clip range
      // is plausible in principle, but a single real destination landing at either extreme would be
      // suspicious. Hồ Lắk and Buôn Đôn/Yok Đôn are lowland-basin locations; Đray Nur is a
      // mid-elevation river waterfall — none should resolve near sea level (0 m, the SRTM-tile
      // background/void value) or the province's alpine peak elevations (>1200 m).
      expect(meters).toBeGreaterThan(50);
      expect(meters).toBeLessThan(1200);
    },
  );

  it('the 4 destinations do not all resolve to the exact same elevation (would indicate a broken lookup, not real terrain)', () => {
    const values = verifiedTourismDestinations.map((destination) => {
      const { x, z } = latLonToWorld(destination.coordinates[0], destination.coordinates[1]);
      return sampleHeightGrid(grid, bounds, x, z);
    });
    const unique = new Set(values.map((v) => Math.round(v! * 1000)));
    expect(unique.size).toBeGreaterThan(1);
  });
});
