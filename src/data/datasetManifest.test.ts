import { describe, expect, it } from 'vitest';
import mapMetadata from '../assets/maps/daklak/daklak-metadata.json';
import {
  datasetManifest,
  datasetManifestIssues,
  formatSnapshotDate,
  validateDatasetArtifacts,
} from './datasetManifest';

describe('dataset manifest', () => {
  it('derives administrative facts from validated map metadata', () => {
    expect(datasetManifestIssues).toEqual([]);
    expect(datasetManifest.administrativeUnitCount).toBe(mapMetadata.totalUnits);
    expect(datasetManifest.provinceName).toBe(mapMetadata.provinceName);
  });

  it('marks thematic modes as illustrative', () => {
    expect(datasetManifest.metricStatus.energy).toBe('illustrative');
    expect(datasetManifest.metricStatus.heatmap).toBe('illustrative');
  });

  it('formats the ISO snapshot date for the interface', () => {
    expect(formatSnapshotDate('2026-07-16')).toBe('16.07.2026');
  });

  it('rejects mismatched runtime artifact joins', () => {
    expect(
      validateDatasetArtifacts({
        metadata: { center: [108.5, 12.7], totalUnits: 1, generatedAt: '2026-07-16' },
        source: { sourceSnapshot: 'a'.repeat(40), sourceChecksum: 'b'.repeat(64) },
        wards: { features: [{ properties: { code: 'one' } }] },
        metrics: { other: {} },
        labels: { one: {} },
      }),
    ).toContain('Chỉ số không khớp mã đơn vị hành chính');
  });
});
