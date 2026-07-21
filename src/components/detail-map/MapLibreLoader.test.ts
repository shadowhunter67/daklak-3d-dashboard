import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('maplibre-gl', () => ({ default: { fakeMaplibre: true } }));
vi.mock('pmtiles', () => ({ Protocol: class {}, fakePmtiles: true }));

describe('loadMapLibreModules', () => {
  afterEach(async () => {
    vi.resetModules();
  });

  it('resolves both modules', async () => {
    const { loadMapLibreModules } = await import('./MapLibreLoader');
    const modules = await loadMapLibreModules();
    expect(modules.maplibregl).toEqual({ fakeMaplibre: true });
    expect(modules.pmtiles).toHaveProperty('fakePmtiles', true);
  });

  it('caches the module promise across calls (imports only once)', async () => {
    const { loadMapLibreModules } = await import('./MapLibreLoader');
    const first = loadMapLibreModules();
    const second = loadMapLibreModules();
    expect(first).toBe(second);
    await first;
  });

  it('resetMapLibreModulesForTesting forces a fresh promise on the next call, the same shape a real retry relies on', async () => {
    const { loadMapLibreModules, resetMapLibreModulesForTesting } =
      await import('./MapLibreLoader');
    const first = loadMapLibreModules();
    await first;
    resetMapLibreModulesForTesting();
    const second = loadMapLibreModules();
    expect(second).not.toBe(first);
    await second;
  });
});
