import { describe, expect, it } from 'vitest';
import { DATASET_CATALOG } from '../catalog/datasets';
import { buildPublicBundleManifest } from './publicManifest';

describe('buildPublicBundleManifest', () => {
  it('separates public-bundled dataset ids from any non-public ones', () => {
    const manifest = buildPublicBundleManifest();
    expect(manifest.allDatasetIds.length).toBe(DATASET_CATALOG.length);
    // Today every cataloged dataset is public — this repo has no non-public dataset yet. The
    // manifest structure exists so scripts/validate_public_build.mjs has something real to check
    // against the moment a non-public one is ever added.
    expect(manifest.nonPublicDatasetIds).toEqual([]);
    expect(manifest.publicDatasetIds.length).toBe(DATASET_CATALOG.length);
    // Not every cataloged dataset is bundled-static (e.g. the not-yet-built detail-map PMTiles
    // source has access.delivery:'pmtiles') — only those actually shipped in the static bundle.
    const expectedCount = DATASET_CATALOG.filter(
      (dataset) => dataset.access.delivery === 'bundled-static',
    ).length;
    expect(manifest.expectedBundledDatasetIds.length).toBe(expectedCount);
    expect(manifest.expectedBundledDatasetIds.length).toBeLessThan(DATASET_CATALOG.length);
  });

  it('includes a per-dataset classification/access record for every cataloged dataset', () => {
    const manifest = buildPublicBundleManifest();
    expect(manifest.datasets.length).toBe(DATASET_CATALOG.length);
    const administrativeUnits = manifest.datasets.find((d) => d.id === 'administrative-units');
    expect(administrativeUnits).toEqual({
      id: 'administrative-units',
      classification: 'public',
      delivery: 'bundled-static',
      requiresAuthentication: false,
    });
  });

  it('excludes a non-public or non-bundled dataset from expectedBundledDatasetIds, and reports it in datasets/nonPublicDatasetIds', () => {
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
    expect(manifest.publicDatasetIds).toEqual([]);
    expect(manifest.expectedBundledDatasetIds).toEqual([]);
    expect(manifest.datasets).toEqual([
      {
        id: 'internal-example',
        classification: 'internal',
        delivery: 'protected-api',
        requiresAuthentication: true,
      },
    ]);
  });
});
