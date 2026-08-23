// @vitest-environment node
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { verifiedTourismDestinations } from '../../../entities/tourism/verifiedTourismDestinations';
import { terrainMetadata } from '../../../components/map/terrainConfig';
import { latLonToWorld, getWorldBounds } from '../coordinates/worldCoordinates';
import { sampleHeightGrid, type HeightGrid } from '../terrain/terrainGrid';

/**
 * Phase T4 — sanity-range check of real per-destination elevation, decoded from the actual
 * shipped `daklak-terrain-height.png` (not a synthetic mock, unlike `terrainHeightSampler.test.ts`
 * — see that file's doc comment for why unit tests normally mock the canvas decode: `jsdom` has no
 * real `<canvas>` 2D rendering). This file sidesteps that limitation without a new runtime
 * dependency by decoding the PNG's IDAT stream directly with Node's built-in `zlib.inflateSync`
 * (the shipped file is grayscale, 8-bit, non-interlaced — verified once via
 * `buf.readUInt8(25)` (colorType) === 0 and `buf.readUInt8(28)` (interlace) === 0 at the byte
 * offsets the PNG spec fixes for the IHDR chunk) and undoing the PNG per-scanline filter (spec
 * §9.2) by hand. This is intentionally a plausibility/sanity check on real data, not a
 * GPS-survey-precision assertion — see the task's own instruction for this sub-item.
 */

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

/** Minimal PNG decoder for the one format this repo's terrain textures ship as: grayscale,
 * 8 bits/channel, non-interlaced (PNG color type 0). Not a general-purpose decoder. */
function decodeGrayscale8Png(pngBytes: Buffer): HeightGrid {
  if (pngBytes.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG file');
  let width = 0;
  let height = 0;
  const idatChunks: Buffer[] = [];
  let offset = 8;
  while (offset < pngBytes.length) {
    const length = pngBytes.readUInt32BE(offset);
    const type = pngBytes.toString('ascii', offset + 4, offset + 8);
    const data = pngBytes.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      const bitDepth = data.readUInt8(8);
      const colorType = data.readUInt8(9);
      const interlace = data.readUInt8(12);
      if (bitDepth !== 8 || colorType !== 0 || interlace !== 0) {
        throw new Error(
          `unexpected PNG format: bitDepth=${bitDepth} colorType=${colorType} interlace=${interlace}`,
        );
      }
    } else if (type === 'IDAT') {
      idatChunks.push(Buffer.from(data));
    } else if (type === 'IEND') {
      break;
    }
    offset += 12 + length;
  }

  const raw = inflateSync(Buffer.concat(idatChunks));
  const bpp = 1; // grayscale, 8-bit
  const stride = width; // bytes per unfiltered scanline
  const data = new Float32Array(width * height);
  let prevLine = new Uint8Array(stride);

  for (let row = 0; row < height; row++) {
    const lineStart = row * (stride + 1);
    const filterType = raw[lineStart];
    const line = new Uint8Array(stride);
    for (let col = 0; col < stride; col++) {
      const rawByte = raw[lineStart + 1 + col];
      const a = col >= bpp ? line[col - bpp] : 0;
      const b = prevLine[col];
      const c = col >= bpp ? prevLine[col - bpp] : 0;
      let value: number;
      switch (filterType) {
        case 0:
          value = rawByte;
          break;
        case 1:
          value = (rawByte + a) & 0xff;
          break;
        case 2:
          value = (rawByte + b) & 0xff;
          break;
        case 3:
          value = (rawByte + Math.floor((a + b) / 2)) & 0xff;
          break;
        case 4:
          value = (rawByte + paeth(a, b, c)) & 0xff;
          break;
        default:
          throw new Error(`unsupported PNG filter type: ${filterType}`);
      }
      line[col] = value;
      data[row * width + col] = value / 255;
    }
    prevLine = line;
  }

  return { width, height, data };
}

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
