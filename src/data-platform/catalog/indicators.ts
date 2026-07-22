/**
 * Indicator definitions/observations wrapping the existing metric JSON — see
 * src/data/datasetManifest.ts (unchanged) for the manifest this app has always used; this module
 * only adds a typed, catalog-linked view over the same underlying files for the provenance/data-
 * status UI, per docs/data-platform-architecture.md.
 */
import dashboardSources from '../../assets/data/dashboard-sources.json';
import communeMetrics from '../../assets/maps/daklak/daklak-metrics.json';
import mapMetadata from '../../assets/maps/daklak/daklak-metadata.json';
import type { IndicatorDefinition, IndicatorObservation } from '../schemas/indicator';

export const INDICATOR_DEFINITIONS: readonly IndicatorDefinition[] = [
  {
    code: 'commune-population',
    name: 'Dân số',
    description: 'Dân số minh họa theo xã/phường.',
    domain: 'population',
    unit: 'người',
    valueType: 'integer',
    aggregation: 'sum',
    sourceDatasetId: 'commune-demographic-illustrative',
    allowedAdministrativeLevels: ['commune'],
  },
  {
    code: 'commune-coverage',
    name: 'Độ phủ',
    description: 'Chỉ số độ phủ minh họa theo xã/phường (không gắn với một dịch vụ cụ thể).',
    domain: 'population',
    unit: '%',
    valueType: 'percentage',
    aggregation: 'average',
    sourceDatasetId: 'commune-demographic-illustrative',
    allowedAdministrativeLevels: ['commune'],
  },
  {
    code: 'commune-growth',
    name: 'Tăng trưởng',
    description: 'Tỷ lệ tăng trưởng minh họa theo xã/phường.',
    domain: 'population',
    unit: '%',
    valueType: 'percentage',
    aggregation: 'average',
    sourceDatasetId: 'commune-demographic-illustrative',
    allowedAdministrativeLevels: ['commune'],
  },
  {
    code: 'province-grdp-growth-percent',
    name: 'Tăng trưởng GRDP',
    description: 'Tốc độ tăng trưởng GRDP cấp tỉnh theo công bố chính thức.',
    domain: 'economy',
    unit: '%',
    valueType: 'percentage',
    aggregation: 'latest',
    sourceDatasetId: 'province-overview-indicators',
    allowedAdministrativeLevels: ['province'],
  },
  {
    code: 'province-new-businesses',
    name: 'Doanh nghiệp thành lập mới',
    description: 'Số doanh nghiệp thành lập mới trong năm, cấp tỉnh.',
    domain: 'economy',
    unit: 'doanh nghiệp',
    valueType: 'integer',
    aggregation: 'latest',
    sourceDatasetId: 'province-overview-indicators',
    allowedAdministrativeLevels: ['province'],
  },
  {
    code: 'province-registered-capital-billion-vnd',
    name: 'Vốn đăng ký',
    description: 'Tổng vốn đăng ký của doanh nghiệp thành lập mới trong năm, cấp tỉnh.',
    domain: 'economy',
    unit: 'tỷ đồng',
    valueType: 'currency',
    aggregation: 'latest',
    sourceDatasetId: 'province-overview-indicators',
    allowedAdministrativeLevels: ['province'],
  },
];

/** Province-level observations have no per-commune administrative code — mapMetadata.provinceCode
 * ("66") is used as the administrativeCode, matching Quyết định 19/2025/QĐ-TTg's provincial code. */
const PROVINCE_CODE = mapMetadata.provinceCode;

function communeObservations(): IndicatorObservation[] {
  const observations: IndicatorObservation[] = [];
  for (const [code, metrics] of Object.entries(communeMetrics)) {
    const shared = {
      administrativeCode: code,
      administrativeLevel: 'commune' as const,
      period: 'demo',
      status: 'illustrative' as const,
      sourceDatasetId: 'commune-demographic-illustrative',
    };
    observations.push(
      { ...shared, indicatorCode: 'commune-population', value: metrics.population },
      { ...shared, indicatorCode: 'commune-coverage', value: metrics.coverage },
      { ...shared, indicatorCode: 'commune-growth', value: metrics.growth },
    );
  }
  return observations;
}

function provinceObservations(): IndicatorObservation[] {
  const shared = {
    administrativeCode: PROVINCE_CODE,
    administrativeLevel: 'province' as const,
    period: String(dashboardSources.overview.year),
    status: 'official' as const,
    sourceDatasetId: 'province-overview-indicators',
  };
  return [
    {
      ...shared,
      indicatorCode: 'province-grdp-growth-percent',
      value: dashboardSources.overview.grdpGrowthPercent,
    },
    {
      ...shared,
      indicatorCode: 'province-new-businesses',
      value: dashboardSources.overview.newBusinesses,
    },
    {
      ...shared,
      indicatorCode: 'province-registered-capital-billion-vnd',
      value: dashboardSources.overview.registeredCapitalBillionVnd,
    },
  ];
}

export const INDICATOR_OBSERVATIONS: readonly IndicatorObservation[] = [
  ...provinceObservations(),
  ...communeObservations(),
];

export function getIndicatorDefinition(code: string): IndicatorDefinition | undefined {
  return INDICATOR_DEFINITIONS.find((definition) => definition.code === code);
}
