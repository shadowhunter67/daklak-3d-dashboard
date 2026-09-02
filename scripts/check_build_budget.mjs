import { gzipSync } from 'node:zlib';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
// Raised once (2026-07) to admit the detail-map feature's maplibre-gl + pmtiles dependency.
// maplibre-gl is its own code-split chunk (~1.03MB raw / ~271KB gzip, a normal size for that
// library) that a user who never opens the detail map never downloads — see the "does not load
// 3D or chart chunks" / "detail map chunk only loads when opened" E2E tests, which are the real
// guarantee that matters, not this aggregate ceiling. This is a deliberate, explained increase
// for a genuinely new optional feature, not a cover for unexplained bloat in the shared/eager
// chunks — those are still expected to stay flat run to run.
//
// totalBuildBytes raised again ("hiệu ứng bản đồ động" PR, 2026-09) to admit two more
// maplibre-gl files: `maplibre-gl-worker.mjs` (~19KB) and `maplibre-gl-shared.mjs` (~471KB,
// unminified — it's copied byte-for-byte from the npm package, see vite.config.ts's
// `maplibre-gl-worker-assets` plugin doc comment for why it can't be minified/hashed like a
// normal chunk). Same "only downloaded by a user who actually opens the detail map" reasoning as
// the maplibre-gl chunk above — these two files are the worker maplibre-gl's GeoJSON
// sources/layers now genuinely need at runtime (added in the same PR); without them the detail
// map silently never finishes loading in production. Not counted in totalJavaScriptBytes/gzip
// (extension is `.mjs`, not `.js`) since they're never part of the eagerly-executed JS the
// gzip-over-the-wire budgets are meant to bound.
//
// totalBuildBytes/largestAssetBytes raised again (real OSM roads/buildings PMTiles source, 2026-09)
// to admit `public/maps/daklak.pmtiles` (~13.4MB, real OpenStreetMap data for the whole province —
// pipeline documented in docs/detail-map-integration.md). This was deliberately measured, not
// guessed: an earlier draft of this feature assumed 35-90MB and planned to host it as a GitHub
// Release asset instead (cross-origin, needs a CSP change) specifically to avoid this budget; once
// the real pipeline ran, the actual province-wide roads+buildings archive came out to 13.4MB — real
// OSM building-footprint coverage outside city centers in this province is sparse (~2.8k buildings
// province-wide), so the file is far smaller than a fully-mapped-area estimate would suggest.
// Same-origin (committed to the repo, served by GitHub Pages like every other static asset) is
// simpler than a Release asset at this size — no CSP `connect-src` addition, no cross-origin range
// requests. Same "only downloaded by a user who actually opens the detail map" download-cost
// reasoning as the maplibre-gl chunk above (it's not part of the eager entry bundle).
const limits = {
  totalJavaScriptBytes: 3_400_000,
  totalJavaScriptGzipBytes: 950_000,
  largestJavaScriptGzipBytes: 300_000,
  totalTextureBytes: 3_000_000,
  largestAssetBytes: 14_000_000,
  totalBuildBytes: 21_000_000,
};

async function filesAt(directory) {
  const entries = await readdir(directory);
  const nested = await Promise.all(
    entries.map(async (name) => {
      const path = join(directory, name);
      return (await stat(path)).isDirectory() ? filesAt(path) : [path];
    }),
  );
  return nested.flat();
}

const files = await filesAt(dist);
const assets = await Promise.all(
  files.map(async (path) => {
    const content = await readFile(path);
    return {
      file: relative(dist, path).replaceAll('\\', '/'),
      bytes: content.byteLength,
      gzipBytes: path.endsWith('.js') ? gzipSync(content).byteLength : undefined,
    };
  }),
);
const scripts = assets.filter(({ file }) => file.endsWith('.js'));
const textures = assets.filter(({ file }) => /terrain-.+\.png$/.test(file));
const actual = {
  totalJavaScriptBytes: scripts.reduce((sum, file) => sum + file.bytes, 0),
  totalJavaScriptGzipBytes: scripts.reduce((sum, file) => sum + (file.gzipBytes ?? 0), 0),
  largestJavaScriptGzipBytes: scripts.length
    ? Math.max(...scripts.map((file) => file.gzipBytes ?? 0))
    : 0,
  totalTextureBytes: textures.reduce((sum, file) => sum + file.bytes, 0),
  largestAssetBytes: assets.length ? Math.max(...assets.map((file) => file.bytes)) : 0,
  totalBuildBytes: assets.reduce((sum, file) => sum + file.bytes, 0),
};
const failures = Object.entries(limits)
  .filter(([key, limit]) => actual[key] > limit)
  .map(([key, limit]) => `${key}: ${actual[key]} > ${limit}`);
if (!scripts.length) failures.push('Build did not produce any JavaScript files');
if (!assets.length) failures.push('Build did not produce any assets');
const report = {
  status: failures.length ? 'failed' : 'passed',
  generatedAt: new Date().toISOString(),
  limits,
  actual,
  assets,
  failures,
};
await writeFile(
  join(root, 'reports', 'performance-budget.json'),
  `${JSON.stringify(report, null, 2)}\n`,
);
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
