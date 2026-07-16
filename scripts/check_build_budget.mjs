import { gzipSync } from 'node:zlib';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
const limits = {
  totalJavaScriptGzipBytes: 650_000,
  largestJavaScriptGzipBytes: 250_000,
  totalTextureBytes: 3_000_000,
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
  totalJavaScriptGzipBytes: scripts.reduce((sum, file) => sum + (file.gzipBytes ?? 0), 0),
  largestJavaScriptGzipBytes: scripts.length
    ? Math.max(...scripts.map((file) => file.gzipBytes ?? 0))
    : 0,
  totalTextureBytes: textures.reduce((sum, file) => sum + file.bytes, 0),
};
const failures = Object.entries(limits)
  .filter(([key, limit]) => actual[key] > limit)
  .map(([key, limit]) => `${key}: ${actual[key]} > ${limit}`);
if (!scripts.length) failures.push('Build did not produce any JavaScript files');
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
