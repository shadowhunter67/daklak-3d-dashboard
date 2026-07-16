import dashboardSources from '../assets/data/dashboard-sources.json';
import mapMetadata from '../assets/maps/daklak/daklak-metadata.json';
import sourceSummary from '../assets/maps/daklak/daklak-source-summary.json';

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

export const datasetManifestIssues = [
  ...(center.length === 2 ? [] : ['Tọa độ trung tâm không hợp lệ']),
  ...(mapMetadata.totalUnits > 0 ? [] : ['Số đơn vị hành chính không hợp lệ']),
];

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
