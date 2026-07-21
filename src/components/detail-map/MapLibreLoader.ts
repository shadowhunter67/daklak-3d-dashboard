/**
 * Lazy dynamic-import wrapper: maplibre-gl and pmtiles must never be part of the initial bundle
 * (see docs/performance.md) and must load exactly once no matter how many times the detail map
 * is opened/retried in a session. A failed import clears the cached promise so the caller's
 * retry action re-attempts a fresh dynamic import instead of replaying the same rejection.
 */
export interface MapLibreModules {
  maplibregl: typeof import('maplibre-gl');
  pmtiles: typeof import('pmtiles');
}

let modulesPromise: Promise<MapLibreModules> | null = null;

export function loadMapLibreModules(): Promise<MapLibreModules> {
  modulesPromise ??= Promise.all([import('maplibre-gl'), import('pmtiles')])
    .then(([maplibregl, pmtiles]) => ({ maplibregl: maplibregl.default, pmtiles }))
    .catch((error: unknown) => {
      modulesPromise = null;
      throw error;
    });
  return modulesPromise;
}

/** Test-only: clears the module cache so each test can exercise a fresh load/failure. */
export function resetMapLibreModulesForTesting(): void {
  modulesPromise = null;
}
