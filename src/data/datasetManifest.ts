import dashboardSources from '../assets/data/dashboard-sources.json';
import labels from '../assets/maps/daklak/daklak-labels.json';
import mapMetadata from '../assets/maps/daklak/daklak-metadata.json';
import metrics from '../assets/maps/daklak/daklak-metrics.json';
import sourceSummary from '../assets/maps/daklak/daklak-source-summary.json';
import wards from '../assets/maps/daklak/daklak-wards-render.json';

export type MetricStatus = 'official' | 'illustrative' | 'mixed';

export interface DatasetManifest {
  snapshotDate: string;
  administrativeUnitCount: number;
  provinceName: string;
  center: readonly [number, number];
  sourceName: string;
  sourceUrl: string;
  sourceVersion: string;
  cacheVersion: string;
  metricStatus: Record<'overview' | 'energy' | 'heatmap', MetricStatus>;
}

const center = mapMetadata.center;

interface DatasetArtifacts {
  metadata: { center: readonly number[]; totalUnits: number; generatedAt: string };
  source: { sourceSnapshot: string; sourceChecksum: string };
  wards: { features: ReadonlyArray<{ properties: { code: string } }> };
  metrics: Readonly<Record<string, unknown>>;
  labels: Readonly<Record<string, unknown>>;
}

export function validateDatasetArtifacts({
  metadata,
  source,
  wards: wardCollection,
  metrics: metricRecords,
  labels: labelRecords,
}: DatasetArtifacts): string[] {
  const issues: string[] = [];
  if (metadata.center.length !== 2 || metadata.center.some((value) => !Number.isFinite(value)))
    issues.push('Tọa độ trung tâm không hợp lệ');
  if (metadata.totalUnits <= 0 || wardCollection.features.length !== metadata.totalUnits)
    issues.push('Số đơn vị hành chính không khớp artifact hiển thị');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(metadata.generatedAt))
    issues.push('Ngày snapshot dữ liệu không hợp lệ');
  if (!/^[0-9a-f]{40}$/i.test(source.sourceSnapshot))
    issues.push('Phiên bản nguồn GIS không hợp lệ');
  if (!/^[0-9a-f]{64}$/i.test(source.sourceChecksum))
    issues.push('Checksum nguồn GIS không hợp lệ');

  const codes = wardCollection.features.map(({ properties }) => properties.code);
  const uniqueCodes = new Set(codes);
  if (uniqueCodes.size !== codes.length) issues.push('Mã đơn vị hành chính bị trùng');
  const sameCodes = (records: Readonly<Record<string, unknown>>) =>
    Object.keys(records).length === uniqueCodes.size &&
    Object.keys(records).every((code) => uniqueCodes.has(code));
  if (!sameCodes(metricRecords)) issues.push('Chỉ số không khớp mã đơn vị hành chính');
  if (!sameCodes(labelRecords)) issues.push('Nhãn không khớp mã đơn vị hành chính');
  return issues;
}

export const datasetManifestIssues = validateDatasetArtifacts({
  metadata: mapMetadata,
  source: sourceSummary,
  wards,
  metrics,
  labels,
});

export const datasetManifest: DatasetManifest = {
  snapshotDate: mapMetadata.generatedAt,
  administrativeUnitCount: mapMetadata.totalUnits,
  provinceName: mapMetadata.provinceName,
  center: [center[0] ?? 0, center[1] ?? 0],
  sourceName: dashboardSources.overview.sourceName,
  sourceUrl: dashboardSources.overview.sourceUrl,
  sourceVersion: String(dashboardSources.overview.year),
  cacheVersion: `${sourceSummary.sourceSnapshot.slice(0, 12)}-${mapMetadata.generatedAt}`,
  metricStatus: {
    overview: 'mixed',
    energy: 'illustrative',
    heatmap: 'illustrative',
  },
};

export function formatSnapshotDate(value: string): string {
  const [year, month, day] = value.split('-');
  return `${day}.${month}.${year}`;
}
