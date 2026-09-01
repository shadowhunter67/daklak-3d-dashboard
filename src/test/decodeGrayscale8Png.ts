import { inflateSync } from 'node:zlib';
import type { HeightGrid } from '../features/world-exploration/terrain/terrainGrid';

/**
 * Shared Node-only PNG decoder for real-terrain test suites (originally inlined in
 * `poi/destinationElevation.realTerrain.test.ts`, extracted here so
 * `terrain/terrainMeshSurface.realTerrain.test.ts` can reuse it — see either file for why tests
 * decode the real shipped PNG directly instead of mocking canvas: `jsdom` has no real `<canvas>`
 * 2D rendering). Minimal decoder for the one format this repo's terrain textures ship as:
 * grayscale, 8 bits/channel, non-interlaced (PNG color type 0). Not a general-purpose decoder.
 * Plain `.ts`, not `.test.ts` — vitest only collects files matching its `.test.ts(x)` include glob,
 * so this module is type-checked/linted but never collected as its own suite.
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

export function decodeGrayscale8Png(pngBytes: Buffer): HeightGrid {
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
