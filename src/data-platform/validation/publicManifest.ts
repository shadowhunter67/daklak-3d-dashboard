/**
 * A tiny, machine-readable summary of the catalog's public/non-public split, written to
 * `reports/public-dataset-manifest.json` by publicManifest.test.ts (run under `npm test`, which
 * always runs before `npm run validate:public-build:dist` in `quality:frontend`). This is how
 * `scripts/validate_public_build.mjs` — a plain Node script with no TypeScript runtime — learns
 * which dataset ids must never appear in the built `dist/` output, without this repo needing to
 * add ts-node/tsx just to let a .mjs script import catalog/datasets.ts directly.
 */
import { DATASET_CATALOG } from '../catalog/datasets';
import type { DatasetDescriptor } from '../schemas/dataset';

export interface PublicBundleManifest {
  generatedAt: string;
  allDatasetIds: string[];
  nonPublicDatasetIds: string[];
  /** Dataset ids that are classification:public AND access.delivery:'bundled-static' — these are
   * the ones actually expected to appear in the public dist output. */
  expectedBundledDatasetIds: string[];
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
    nonPublicDatasetIds: datasets
      .filter((dataset) => dataset.classification !== 'public')
      .map((dataset) => dataset.id),
    expectedBundledDatasetIds: datasets.filter(isBundledPublic).map((dataset) => dataset.id),
  };
}
