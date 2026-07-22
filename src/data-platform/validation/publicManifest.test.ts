/// <reference types="node" />
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DATASET_CATALOG } from '../catalog/datasets';
import { buildPublicBundleManifest, type PublicBundleManifest } from './publicManifest';

const currentFile = fileURLToPath(import.meta.url);
const repoRoot = resolve(dirname(currentFile), '../../../');
const manifestPath = join(repoRoot, 'reports', 'public-dataset-manifest.json');

describe('buildPublicBundleManifest', () => {
  it('separates public-bundled dataset ids from any non-public ones', () => {
    const manifest = buildPublicBundleManifest();
    expect(manifest.allDatasetIds.length).toBe(DATASET_CATALOG.length);
    // Today every cataloged dataset is public — this repo has no non-public dataset yet. The
    // manifest structure exists so scripts/validate_public_build.mjs has something real to check
    // against the moment a non-public one is ever added.
    expect(manifest.nonPublicDatasetIds).toEqual([]);
    // Not every cataloged dataset is bundled-static (e.g. the not-yet-built detail-map PMTiles
    // source has access.delivery:'pmtiles') — only those actually shipped in the static bundle.
    const expectedCount = DATASET_CATALOG.filter(
      (dataset) => dataset.access.delivery === 'bundled-static',
    ).length;
    expect(manifest.expectedBundledDatasetIds.length).toBe(expectedCount);
    expect(manifest.expectedBundledDatasetIds.length).toBeLessThan(DATASET_CATALOG.length);
  });

  it('excludes a non-public or non-bundled dataset from expectedBundledDatasetIds', () => {
    const manifest = buildPublicBundleManifest([
      {
        id: 'internal-example',
        title: 'x',
        description: 'x',
        domain: 'other',
        classification: 'internal',
        authority: 'unknown',
        publicationStatus: 'draft',
        administrativeLevel: 'province',
        temporalResolution: 'static',
        spatialRepresentation: 'none',
        source: { organization: 'x' },
        version: '1.0.0',
        quality: { status: 'unverified', knownLimitations: ['no checksum'] },
        access: { delivery: 'protected-api', requiresAuthentication: true },
      },
    ]);
    expect(manifest.nonPublicDatasetIds).toEqual(['internal-example']);
    expect(manifest.expectedBundledDatasetIds).toEqual([]);
  });

  it('writes the real catalog manifest to reports/public-dataset-manifest.json for the Node-side dist scanner to read', () => {
    const manifest: PublicBundleManifest = buildPublicBundleManifest();
    mkdirSync(dirname(manifestPath), { recursive: true });
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    const written = JSON.parse(readFileSync(manifestPath, 'utf8')) as PublicBundleManifest;
    expect(written.allDatasetIds).toEqual(manifest.allDatasetIds);
  });
});
