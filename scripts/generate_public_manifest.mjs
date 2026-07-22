// Writes reports/public-dataset-manifest.json as an explicit, deterministic command — not a side
// effect of `npm test` (see docs/security-architecture.md#public-data-leakage-boundary). This is
// the one place a plain Node script needs to read the real TypeScript dataset catalog
// (src/data-platform/validation/publicManifest.ts) without adding ts-node/tsx as a new dependency:
// Vite (already installed) can transform and load a TS module on demand via `ssrLoadModule`.
//
// Also fails loudly (non-zero exit) if config/public-data-files.json — the public data file
// registry — is itself invalid (bad path, dangling dataset reference, checksum mismatch, etc.),
// so a broken registry can never quietly produce a manifest that lets something slip past
// scripts/validate_public_build.mjs later.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { loadRegistry, validateRegistry } from './validate_public_build.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

async function loadManifestBuilder() {
  const server = await createServer({
    root,
    logLevel: 'error',
    server: { middlewareMode: true, hmr: false, watch: null },
  });
  try {
    const mod = await server.ssrLoadModule('/src/data-platform/validation/publicManifest.ts');
    return mod.buildPublicBundleManifest();
  } finally {
    await server.close();
  }
}

async function main() {
  const catalogManifest = await loadManifestBuilder();
  const registry = loadRegistry(join(root, 'config', 'public-data-files.json'));

  const datasetInfoById = {};
  for (const dataset of catalogManifest.datasets) datasetInfoById[dataset.id] = dataset;

  const registryIssues = validateRegistry(registry, datasetInfoById, root);
  if (registryIssues.length) {
    console.error('generate_public_manifest.mjs: registry công khai không hợp lệ:\n');
    for (const issue of registryIssues) console.error(`  - ${issue}`);
    process.exitCode = 1;
    return;
  }

  const manifest = {
    ...catalogManifest,
    registeredPublicDataFiles: registry.files,
  };

  const outputDir = join(root, 'reports');
  mkdirSync(outputDir, { recursive: true });
  const outputPath = join(outputDir, 'public-dataset-manifest.json');
  writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(
    `Wrote ${outputPath} (${manifest.allDatasetIds.length} datasets, ${registry.files.length} registered public data files).`,
  );
}

await main();
