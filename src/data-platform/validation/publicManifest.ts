/**
 * A tiny, machine-readable summary of the catalog's public/non-public split. Turned into
 * `reports/public-dataset-manifest.json` by `scripts/generate_public_manifest.mjs` (run via
 * `npm run generate:public-manifest`, a deterministic command — not a `npm test` side effect). This
 * is how `scripts/validate_public_build.mjs` — a plain Node script with no TypeScript runtime —
 * learns which dataset ids must never appear in the built `dist/` output, and which
 * `datasetId`/`classification`/`access` facts a `config/public-data-files.json` registry entry can
 * be cross-checked against, without this repo needing to add ts-node/tsx just to let a plain .mjs
 * script import catalog/datasets.ts directly (generate_public_manifest.mjs instead uses Vite's own
 * `ssrLoadModule`, since `vite` is already a dependency).
 */
import { DATASET_CATALOG } from '../catalog/datasets';
import type { DataClassification, DataDelivery, DatasetDescriptor } from '../schemas/dataset';

export interface PublicManifestDatasetInfo {
  id: string;
  classification: DataClassification;
  delivery: DataDelivery;
  requiresAuthentication: boolean;
}

export interface PublicBundleManifest {
  generatedAt: string;
  allDatasetIds: string[];
  /** Dataset ids with classification:'public', regardless of delivery. */
  publicDatasetIds: string[];
  nonPublicDatasetIds: string[];
  /** Dataset ids that are classification:public AND access.delivery:'bundled-static' — these are
   * the ones actually expected to appear in the public dist output. */
  expectedBundledDatasetIds: string[];
  /** Per-dataset classification/access facts, keyed by id via `datasets` (an array so this stays
   * plain JSON) — this is what lets a plain Node script (scripts/validate_public_build.mjs)
   * cross-check a `config/public-data-files.json` registry entry's `datasetIds` against the real
   * catalog without a TypeScript runtime. */
  datasets: PublicManifestDatasetInfo[];
}

function isBundledPublic(dataset: DatasetDescriptor): boolean {
  return dataset.classification === 'public' && dataset.access.delivery === 'bundled-static';
}

export function buildPublicBundleManifest(
  datasets: readonly DatasetDescriptor[] = DATASET_CATALOG,
  now: Date = new Date(),
): PublicBundleManifest {
  return {
    generatedAt: now.toISOString(),
    allDatasetIds: datasets.map((dataset) => dataset.id),
    publicDatasetIds: datasets
      .filter((dataset) => dataset.classification === 'public')
      .map((dataset) => dataset.id),
    nonPublicDatasetIds: datasets
      .filter((dataset) => dataset.classification !== 'public')
      .map((dataset) => dataset.id),
    expectedBundledDatasetIds: datasets.filter(isBundledPublic).map((dataset) => dataset.id),
    datasets: datasets.map((dataset) => ({
      id: dataset.id,
      classification: dataset.classification,
      delivery: dataset.access.delivery,
      requiresAuthentication: dataset.access.requiresAuthentication,
    })),
  };
}
