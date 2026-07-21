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
const limits = {
  totalJavaScriptBytes: 3_400_000,
  totalJavaScriptGzipBytes: 950_000,
  largestJavaScriptGzipBytes: 300_000,
  totalTextureBytes: 3_000_000,
  largestAssetBytes: 1_900_000,
  totalBuildBytes: 6_400_000,
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
