/**
 * Lazy dynamic-import wrapper: maplibre-gl and pmtiles must never be part of the initial bundle
 * (see docs/performance.md) and must load exactly once no matter how many times the detail map
 * is opened/retried in a session. A failed import clears the cached promise so the caller's
 * retry action re-attempts a fresh dynamic import instead of replaying the same rejection.
 *
 * `setWorkerUrl` fix (production only): maplibre-gl computes its worker script's URL at runtime
 * from its own `import.meta.url` (not a statically-analyzable literal Rollup can trace), so a
 * production build (`vite build`) never discovers or emits that worker file at all — the computed
 * URL 404s (or, on an SPA-fallback static server like `vite preview`, silently resolves to
 * `index.html`'s HTML content instead of JS, which the module worker then fails to parse as an
 * opaque, undebuggable `ErrorEvent` with no message/filename). The map's `load` event then never
 * fires — every ward source/layer this feature adds makes MapLibre actually need the worker
 * (previously, with zero sources, it was never instantiated, so this was a latent bug until now).
 * `vite.config.ts`'s `maplibre-gl-worker-assets` plugin copies the worker script AND its sibling
 * `maplibre-gl-shared.mjs` (the worker's own internal, also-unhashed relative import — copying
 * only the worker file leaves that second import 404ing the exact same way) to a fixed path;
 * `setWorkerUrl` here points maplibre-gl at it explicitly. Dev mode doesn't need this at all:
 * `optimizeDeps.exclude` (same file) makes Vite's dev server serve the real package file-by-file,
 * so maplibre-gl's own relative-URL resolution already works there.
 */
export interface MapLibreModules {
  maplibregl: typeof import('maplibre-gl');
  pmtiles: typeof import('pmtiles');
}

let modulesPromise: Promise<MapLibreModules> | null = null;

export function loadMapLibreModules(): Promise<MapLibreModules> {
  modulesPromise ??= Promise.all([
    import('maplibre-gl'),
    import('pmtiles'),
    // MapLibre's own stylesheet — never imported anywhere else in the app (lazy, matches the JS
    // being lazy-loaded here). Without it, `.maplibregl-popup`/`.maplibregl-popup-content`/
    // `.maplibregl-popup-tip` and the attribution control's expand toggle have NONE of their
    // required `position`/`z-index`/box styling, so `MapLibreProvider`'s key-project Popup (and,
    // once a source adds a second attribution string, the attribution control's own "▼" dropdown)
    // render as unpositioned, unstyled content that floats to the bottom of the whole page instead
    // of anchoring near the click point. Custom UI elsewhere (layer panel, search, distance tool)
    // never needed this because those are hand-built React components with their own CSS, not
    // MapLibre's built-in Popup/Control classes.
    import('maplibre-gl/dist/maplibre-gl.css'),
  ])
    .then(([maplibregl, pmtiles]) => {
      if (import.meta.env.PROD) {
        maplibregl.setWorkerUrl(`${import.meta.env.BASE_URL}assets/maplibre-gl-worker.mjs`);
      }
      return { maplibregl, pmtiles };
    })
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
