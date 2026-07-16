import { describe, expect, it } from 'vitest';
import mapMetadata from '../assets/maps/daklak/daklak-metadata.json';
import { datasetManifest, datasetManifestIssues, formatSnapshotDate } from './datasetManifest';

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
});
