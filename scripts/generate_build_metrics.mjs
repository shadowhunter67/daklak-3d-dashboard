import { gzipSync } from 'node:zlib';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { format } from 'prettier';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
const reportDirectory = join(root, 'reports');

async function filesAt(directory) {
  const entries = await readdir(directory);
  return (
    await Promise.all(
      entries.map(async (name) => {
        const path = join(directory, name);
        return (await stat(path)).isDirectory() ? filesAt(path) : [path];
      }),
    )
  ).flat();
}

const paths = await filesAt(dist);
const assets = await Promise.all(
  paths.map(async (path) => {
    const content = await readFile(path);
    return {
      file: relative(dist, path).replaceAll('\\', '/'),
      bytes: content.byteLength,
      gzipBytes: /\.(?:js|css)$/.test(path) ? gzipSync(content).byteLength : null,
    };
  }),
);
const sum = (items, field) => items.reduce((total, item) => total + (item[field] ?? 0), 0);
const javascript = assets.filter(({ file }) => file.endsWith('.js'));
const css = assets.filter(({ file }) => file.endsWith('.css'));
const images = assets.filter(({ file }) => /\.(?:png|jpe?g|webp|avif)$/.test(file));
const largest = [...assets].sort((a, b) => b.bytes - a.bytes)[0];
const sourceAsset = async (name) => {
  const path = join(root, 'src', 'assets', 'maps', 'daklak', name);
  return { file: name, bytes: (await stat(path)).size };
};
const budget = JSON.parse(await readFile(join(reportDirectory, 'performance-budget.json'), 'utf8'));
const report = {
  generatedAt: new Date().toISOString(),
  javascript: {
    rawBytes: sum(javascript, 'bytes'),
    gzipBytes: sum(javascript, 'gzipBytes'),
    chunkCount: javascript.length,
  },
  css: { rawBytes: sum(css, 'bytes'), gzipBytes: sum(css, 'gzipBytes') },
  images: { transferBytes: sum(images, 'bytes'), count: images.length },
  largestAsset: largest,
  threeChunk: javascript.find(({ file }) => basename(file).startsWith('three-vendor-')) ?? null,
  echartsChunk: javascript.find(({ file }) => basename(file).startsWith('StatPanel-')) ?? null,
  geometry: {
    canonical: await sourceAsset('daklak-wards.geojson'),
    render: await sourceAsset('daklak-wards-render.json'),
  },
  budget: {
    status: budget.status,
    limits: budget.limits,
    actual: budget.actual,
    failures: budget.failures,
  },
  unavailableInCi: ['fps', 'gpuMemory', 'reliableLcp'],
};
await writeFile(
  join(reportDirectory, 'build-metrics.json'),
  `${JSON.stringify(report, null, 2)}\n`,
);
const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)} MiB`;
const markdown = `# Build metrics\n\nGenerated: ${report.generatedAt}\n\n| Metric | Result |\n| --- | ---: |\n| JavaScript raw | ${mb(report.javascript.rawBytes)} |\n| JavaScript gzip | ${mb(report.javascript.gzipBytes)} |\n| CSS raw / gzip | ${mb(report.css.rawBytes)} / ${mb(report.css.gzipBytes)} |\n| Images/textures | ${mb(report.images.transferBytes)} |\n| JavaScript chunks | ${report.javascript.chunkCount} |\n| Largest asset | ${largest.file} (${mb(largest.bytes)}) |\n| Three.js chunk | ${report.threeChunk?.file ?? 'not found'} (${mb(report.threeChunk?.gzipBytes ?? 0)} gzip) |\n| ECharts chunk | ${report.echartsChunk?.file ?? 'not found'} (${mb(report.echartsChunk?.gzipBytes ?? 0)} gzip) |\n| Canonical GeoJSON | ${mb(report.geometry.canonical.bytes)} |\n| Render JSON | ${mb(report.geometry.render.bytes)} |\n| Budget | ${report.budget.status} |\n\nFPS, GPU memory and reliable LCP are not claimed because this CI does not provide representative physical GPU measurements.\n`;
await writeFile(
  join(reportDirectory, 'build-metrics.md'),
  await format(markdown, { parser: 'markdown' }),
);
console.log(markdown);
