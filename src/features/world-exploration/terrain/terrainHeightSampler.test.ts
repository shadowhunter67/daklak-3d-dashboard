import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  displacementBias,
  displacementScale,
  terrainMetadata,
} from '../../../components/map/terrainConfig';
import { getWorldBounds } from '../coordinates/worldCoordinates';

/**
 * `jsdom` (this repo's vitest environment, see `vite.config.ts`) has no real `<canvas>` 2D
 * rendering and no `createImageBitmap` — adding a real decoder (the `canvas` npm package) would be
 * a new dependency this task explicitly says to avoid unless truly necessary. Instead, this test
 * mocks exactly the two browser primitives `terrainHeightSampler.ts` calls
 * (`createImageBitmap`, `HTMLCanvasElement#getContext`) with a small, fully-controlled synthetic
 * "image", so the real wiring under test — fetch -> decode -> row/column <-> world-space mapping
 * -> displacement formula -> caching/retry — runs for real. The PNG bytes themselves are the only
 * thing faked; `terrainGrid.test.ts` separately covers the bilinear-interpolation math in
 * isolation, and the real shipped PNG is exercised end-to-end by
 * `e2e/world-exploration.spec.ts`'s Walk-mode ground-clamping assertions (real Chromium, real
 * decode).
 */

// 2x2 grayscale grid: row 0 = north edge, row 1 = south edge; col 0 = west, col 1 = east (see
// terrainHeightSampler.ts's doc comment for why this is the expected mapping).
const NW = 0;
const NE = 255;
const SW = 128;
const SE = 64;

function mockRgba(): Uint8ClampedArray {
  const px = (v: number) => [v, v, v, 255];
  return new Uint8ClampedArray([...px(NW), ...px(NE), ...px(SW), ...px(SE)]);
}

let getContextSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn(async () => ({ width: 2, height: 2, close: vi.fn() }) as unknown as ImageBitmap),
  );
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, blob: async () => new Blob() }) as unknown as Response),
  );
  getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    () =>
      ({
        drawImage: vi.fn(),
        getImageData: vi.fn(() => ({ data: mockRgba() })),
      }) as unknown as CanvasRenderingContext2D,
  );
});

afterEach(async () => {
  vi.unstubAllGlobals();
  getContextSpy.mockRestore();
  const mod = await import('./terrainHeightSampler');
  mod.__resetTerrainHeightSamplerCacheForTests();
  vi.resetModules();
});

describe('loadTerrainHeightSampler', () => {
  it('resolves a sampler whose getHeight matches the decoded corner values via the displacement formula', async () => {
    const { loadTerrainHeightSampler } = await import('./terrainHeightSampler');
    const sampler = await loadTerrainHeightSampler();
    const bounds = getWorldBounds();

    const expected = (raw: number) => (raw / 255) * displacementScale + displacementBias;

    // Precision 6, not tighter: the sampler stores the decoded grid in a Float32Array (see
    // `decodeGrayscalePng`), which only carries ~7 significant decimal digits.
    expect(sampler.getHeight(bounds.minX, bounds.minZ)).toBeCloseTo(expected(NW), 6); // NW corner
    expect(sampler.getHeight(bounds.maxX, bounds.minZ)).toBeCloseTo(expected(NE), 6); // NE corner
    expect(sampler.getHeight(bounds.minX, bounds.maxZ)).toBeCloseTo(expected(SW), 6); // SW corner
    expect(sampler.getHeight(bounds.maxX, bounds.maxZ)).toBeCloseTo(expected(SE), 6); // SE corner
  });

  it('getElevationMeters reconstructs real-world meters from the same normalized value', async () => {
    const { loadTerrainHeightSampler } = await import('./terrainHeightSampler');
    const sampler = await loadTerrainHeightSampler();
    const bounds = getWorldBounds();
    const { elevationMinMeters, elevationMaxMeters } = terrainMetadata;

    const meters = sampler.getElevationMeters(bounds.minX, bounds.minZ); // NW, raw=0
    expect(meters).toBeCloseTo(elevationMinMeters, 6);

    const metersNe = sampler.getElevationMeters(bounds.maxX, bounds.minZ); // NE, raw=255
    expect(metersNe).toBeCloseTo(elevationMaxMeters, 6);
  });

  it('returns null outside the real terrain bbox for both getHeight and getElevationMeters', async () => {
    const { loadTerrainHeightSampler } = await import('./terrainHeightSampler');
    const sampler = await loadTerrainHeightSampler();
    const bounds = getWorldBounds();
    const outsideX = bounds.maxX + 1000;
    expect(sampler.getHeight(outsideX, bounds.minZ)).toBeNull();
    expect(sampler.getElevationMeters(outsideX, bounds.minZ)).toBeNull();
  });

  it('decodes the PNG exactly once across multiple concurrent/sequential callers (module-level cache)', async () => {
    const { loadTerrainHeightSampler } = await import('./terrainHeightSampler');
    const [a, b] = await Promise.all([loadTerrainHeightSampler(), loadTerrainHeightSampler()]);
    const c = await loadTerrainHeightSampler();
    expect(a).toBe(b);
    expect(b).toBe(c);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });

  it('does not cache a permanent failure — a later call can retry after a rejected fetch', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          ({ ok: false, status: 404, blob: async () => new Blob() }) as unknown as Response,
      ),
    );
    const { loadTerrainHeightSampler } = await import('./terrainHeightSampler');
    await expect(loadTerrainHeightSampler()).rejects.toThrow();

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, blob: async () => new Blob() }) as unknown as Response),
    );
    await expect(loadTerrainHeightSampler()).resolves.toBeDefined();
  });
});
