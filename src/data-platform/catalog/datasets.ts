/**
 * The dataset catalog: one DatasetDescriptor per distinct source of data this app renders (or
 * could render once configured). This wraps existing, already-verified provenance recorded
 * elsewhere in the repo (dashboard-sources.json, metric-provenance.json, road-source-registry.json,
 * daklak-terrain-metadata.json, daklak-source-summary.json) into one typed, queryable shape — it
 * does not replace those files, and does not introduce any new sourcing. See
 * docs/data-platform-architecture.md and docs/public-data-sources.md.
 */
import dashboardSources from '../../assets/data/dashboard-sources.json';
import metricProvenance from '../../assets/data/metric-provenance.json';
import roadMetadata from '../../assets/maps/daklak/road-metadata.json';
import roadSourceRegistry from '../../assets/maps/daklak/road-source-registry.json';
import terrainMetadata from '../../assets/maps/daklak/daklak-terrain-metadata.json';
import mapMetadata from '../../assets/maps/daklak/daklak-metadata.json';
import sourceSummary from '../../assets/maps/daklak/daklak-source-summary.json';
import type { DatasetDescriptor } from '../schemas/dataset';

const roadRegistryEntry = roadSourceRegistry[0];
const overviewProvenance = metricProvenance['overview.grdpGrowthPercent'];

export const ADMINISTRATIVE_UNITS_DATASET: DatasetDescriptor = {
  id: 'administrative-units',
  title: 'Đơn vị hành chính cấp xã Đắk Lắk 2025',
  description:
    '102 xã/phường sau sắp xếp 2025. Tên và mã đơn vị theo văn bản pháp lý; geometry là dữ liệu mở tham khảo, chưa được cơ quan địa chính xác nhận (xem quality.geometryStatus).',
  domain: 'administrative',
  classification: 'public',
  // The distributed artifact here is the polygon geometry, sourced from an open-community GitHub
  // repository — not a government geodata service. Legal correctness of NAMES/CODES is a separate
  // claim (see knownLimitations and authorityDetail) and does not make the geometry itself official.
  authority: 'open-community',
  authorityDetail: {
    // Names/codes trace to Nghị quyết 1660/NQ-UBTVQH15 + Quyết định 19/2025/QĐ-TTg — real legal
    // instruments — while the polygon shapes come from thanglequoc/vietnamese-provinces-database
    // (MIT, open-community). One dataset, two different authority levels; see quality.geometryStatus.
    identityAuthority: 'official',
    geometryAuthority: 'open-community',
  },
  publicationStatus: 'published',
  administrativeLevel: 'commune',
  temporalResolution: 'static',
  spatialRepresentation: 'polygon',
  source: {
    organization: 'thanglequoc/vietnamese-provinces-database (GitHub, MIT)',
    documentNumber: `Nghị quyết 1660/NQ-UBTVQH15; ${sourceSummary.unitCodes}`,
    sourceUrl: sourceSummary.geometrySource,
    retrievalDate: mapMetadata.generatedAt,
    license: sourceSummary.geometryLicense,
  },
  version: sourceSummary.sourceSnapshot.slice(0, 12),
  period: { label: '2025 (sau sắp xếp đơn vị hành chính)' },
  generatedAt: mapMetadata.generatedAt,
  checksum: sourceSummary.sourceChecksum,
  refreshPolicy: { mode: 'manual', expectedInterval: 'P5Y' },
  quality: {
    status: 'partially-verified',
    geometryStatus: 'reference',
    knownLimitations: [
      'Tên/mã theo Nghị quyết 1660/NQ-UBTVQH15 và Quyết định 19/2025/QĐ-TTg, nhưng geometry (hình dạng ranh giới) lấy từ kho mã nguồn mở, chưa qua xác nhận địa chính.',
      mapMetadata.disclaimer,
      'Chưa có bảng tra predecessor/successor cho các đơn vị trước sáp nhập 2025 — cần transcribe phụ lục Nghị quyết 1660 mới bổ sung được, chưa thực hiện trong lượt này.',
    ],
  },
  access: { delivery: 'bundled-static', requiresAuthentication: false },
};

export const PROVINCE_OVERVIEW_INDICATORS_DATASET: DatasetDescriptor = {
  id: 'province-overview-indicators',
  title: 'Chỉ tiêu kinh tế - xã hội tổng quan tỉnh Đắk Lắk 2025',
  description:
    'Tăng trưởng GRDP, số doanh nghiệp thành lập mới, tổng vốn đăng ký — theo công bố của UBND tỉnh Đắk Lắk / Thống kê tỉnh.',
  domain: 'economy',
  classification: 'public',
  authority: 'official',
  publicationStatus: 'published',
  administrativeLevel: 'province',
  temporalResolution: 'annual',
  spatialRepresentation: 'none',
  source: {
    organization: dashboardSources.overview.sourceName,
    sourceUrl: dashboardSources.overview.sourceUrl,
    retrievalDate: overviewProvenance?.retrievedAt,
  },
  version: String(dashboardSources.overview.year),
  period: {
    label: `Năm ${dashboardSources.overview.year}`,
    start: `${dashboardSources.overview.year}-01-01`,
    end: `${dashboardSources.overview.year}-12-31`,
  },
  generatedAt: overviewProvenance?.retrievedAt,
  refreshPolicy: { mode: 'manual', expectedInterval: 'P1Y' },
  quality: {
    status: 'partially-verified',
    knownLimitations: [
      'Trích dẫn từ một bài công bố báo chí của UBND tỉnh; chưa đối chiếu độc lập với niên giám thống kê gốc của Cục Thống kê tỉnh.',
      'Chưa có checksum riêng cho bộ chỉ số này (chỉ 3 con số, không phải file lớn); đối chiếu qua sourceUrl khi cần.',
    ],
  },
  access: { delivery: 'bundled-static', requiresAuthentication: false },
};

export const COMMUNE_DEMOGRAPHIC_ILLUSTRATIVE_DATASET: DatasetDescriptor = {
  id: 'commune-demographic-illustrative',
  title: 'Dân số, độ phủ, tăng trưởng theo xã/phường (minh họa)',
  description:
    'Dữ liệu minh họa được sinh có seed cố định để trình diễn choropleth/heatmap cấp xã. Không phải số liệu dân số vận hành.',
  domain: 'population',
  classification: 'public',
  authority: 'illustrative',
  publicationStatus: 'published',
  administrativeLevel: 'commune',
  temporalResolution: 'static',
  spatialRepresentation: 'polygon',
  source: {
    organization: 'Deterministic seeded demo generator (nội bộ project)',
    repositoryPath: 'scripts/build_daklak_geojson.py',
    retrievalDate: metricProvenance['wards.populationCoverageGrowth']?.retrievedAt,
  },
  version: '1.0.0',
  period: { label: 'demo' },
  quality: {
    status: 'unverified',
    knownLimitations: [
      'Dữ liệu minh họa, không đại diện số liệu dân số thật.',
      'Không tính checksum cho dữ liệu minh họa có seed cố định.',
    ],
  },
  access: { delivery: 'bundled-static', requiresAuthentication: false },
};

export const ENERGY_ILLUSTRATIVE_DATASET: DatasetDescriptor = {
  id: 'energy-illustrative',
  title: 'Nút năng lượng (minh họa)',
  description:
    'Kịch bản minh họa 5 nút phụ tải/truyền tải/năng lượng tái tạo, không phải dữ liệu vận hành lưới điện thật.',
  domain: 'energy',
  classification: 'public',
  authority: 'illustrative',
  publicationStatus: 'published',
  administrativeLevel: 'point',
  temporalResolution: 'static',
  spatialRepresentation: 'point',
  source: {
    organization: 'Dashboard demo scenario (nội bộ project)',
    repositoryPath: 'src/assets/data/dashboard-sources.json',
    retrievalDate: metricProvenance.energy?.retrievedAt,
  },
  version: '1.0.0',
  period: { label: 'demo' },
  quality: {
    status: 'unverified',
    knownLimitations: [
      'Dữ liệu minh họa, không phải số liệu vận hành lưới điện thật.',
      'Không tính checksum cho dữ liệu minh họa có seed cố định.',
    ],
  },
  access: { delivery: 'bundled-static', requiresAuthentication: false },
};

export const HEATMAP_ILLUSTRATIVE_DATASET: DatasetDescriptor = {
  id: 'heatmap-illustrative',
  title: 'Heatmap chuyên đề (minh họa)',
  description:
    'Giá trị heatmap dẫn xuất từ chỉ số minh họa cấp xã, chỉ phục vụ trình diễn trực quan hóa.',
  domain: 'other',
  classification: 'public',
  authority: 'illustrative',
  publicationStatus: 'published',
  administrativeLevel: 'commune',
  temporalResolution: 'static',
  spatialRepresentation: 'polygon',
  source: {
    organization: 'Deterministic visualization derived from demo metrics',
    repositoryPath: 'src/assets/maps/daklak/daklak-metrics.json',
    retrievalDate: metricProvenance.heatmap?.retrievedAt,
  },
  version: '1.0.0',
  period: { label: 'demo' },
  quality: {
    status: 'unverified',
    knownLimitations: [
      'Dữ liệu minh họa, không phải số liệu đo lường thật.',
      'Không tính checksum cho dữ liệu minh họa có seed cố định.',
    ],
  },
  access: { delivery: 'bundled-static', requiresAuthentication: false },
};

export const ROAD_NETWORK_3D2D_DATASET: DatasetDescriptor = {
  id: 'road-network-osm-3d2d',
  title: 'Mạng lưới đường bộ (OpenStreetMap) — lớp 3D/2D',
  description:
    'Trục đường quốc lộ/tỉnh lộ/huyện lộ trích từ OpenStreetMap, dùng cho lớp đường trong bản đồ 3D và danh sách 2D (RoadLayer2D/RoadLayer3D). Khác với nguồn PMTiles của bản đồ chi tiết (xem road-network-detail-map-pmtiles) — nguồn đó chưa được xây dựng.',
  domain: 'infrastructure',
  classification: 'public',
  authority: 'open-community',
  publicationStatus: 'published',
  administrativeLevel: 'mixed',
  temporalResolution: 'static',
  spatialRepresentation: 'line',
  source: {
    organization: roadRegistryEntry?.issuingAuthority ?? 'OpenStreetMap contributors',
    documentNumber: roadRegistryEntry?.sourceId,
    sourceUrl: roadRegistryEntry?.sourceUrl,
    retrievalDate: roadRegistryEntry?.accessedAt,
    license: roadRegistryEntry?.license,
  },
  version: roadMetadata.sourceId,
  period: { label: roadRegistryEntry?.publishedAt ?? roadMetadata.generatedAt },
  generatedAt: roadMetadata.generatedAt,
  checksum: roadMetadata.artifactChecksum,
  refreshPolicy: { mode: 'manual', expectedInterval: 'P1Y' },
  quality: {
    status: 'verified',
    knownLimitations: [
      roadRegistryEntry?.methodologyNote ??
        'Supplementary open data; not an official or legal road record.',
      roadRegistryEntry?.coverageNote ?? '',
    ].filter(Boolean),
  },
  access: { delivery: 'bundled-static', requiresAuthentication: false },
};

export const TERRAIN_IMAGERY_DATASET: DatasetDescriptor = {
  id: 'terrain-imagery',
  title: 'Địa hình và ảnh bề mặt (SRTM + Sentinel-2)',
  description:
    'Texture độ cao/màu/pháp tuyến dùng cho mesh địa hình 3D: độ cao từ NASA SRTM (qua Mapzen Terrarium tiles), ảnh bề mặt từ Sentinel-2 cloudless 2016 (EOX).',
  domain: 'environment',
  classification: 'public',
  authority: 'authoritative-third-party',
  publicationStatus: 'published',
  administrativeLevel: 'grid',
  temporalResolution: 'static',
  spatialRepresentation: 'raster',
  source: {
    organization:
      'NASA SRTM (qua AWS Open Data / Mapzen Terrain Tiles) + EOX IT Services GmbH (Sentinel-2 cloudless)',
    sourceUrl: terrainMetadata.sourceUrl,
    license: terrainMetadata.surfaceImageryLicense,
  },
  version: `srtm-${terrainMetadata.elevationAcquisitionDate}_s2-${terrainMetadata.imageryAcquisitionYear}`,
  period: {
    label: `SRTM ${terrainMetadata.elevationAcquisitionDate} / Sentinel-2 ${terrainMetadata.imageryAcquisitionYear}`,
  },
  quality: {
    status: 'verified',
    knownLimitations: [
      terrainMetadata.realtimeNotice,
      terrainMetadata.sourceTileProjection,
      'Không có checksum nội dung texture; pipeline xác định (deterministic) từ bbox/zoom cố định nhưng chưa hash-verify.',
    ],
  },
  access: { delivery: 'bundled-static', requiresAuthentication: false },
};

/**
 * Documents the detail map's PMTiles road/administrative-boundary source as a real catalog entry
 * in `draft` status rather than only in prose docs — this is what lets the data-status UI report
 * "1 source not yet configured" instead of silently omitting it. No file exists at this URL; see
 * docs/detail-map-integration.md for the build pipeline this is waiting on.
 */
export const DETAIL_MAP_ROAD_BOUNDARY_PMTILES_DATASET: DatasetDescriptor = {
  id: 'road-network-detail-map-pmtiles',
  title: 'Đường/ranh giới hành chính (PMTiles) — bản đồ chi tiết',
  description:
    'Nguồn vector tile OSM dự kiến cho các lớp đường/ranh giới/heatmap của bản đồ chi tiết MapLibre. Chưa được xây dựng hoặc host — VITE_DETAIL_MAP_SOURCE_URL rỗng theo mặc định.',
  domain: 'infrastructure',
  classification: 'public',
  authority: 'unknown',
  publicationStatus: 'draft',
  administrativeLevel: 'mixed',
  temporalResolution: 'static',
  spatialRepresentation: 'vector-tile',
  source: { organization: 'OpenStreetMap contributors (dự kiến)', license: 'ODbL 1.0 (dự kiến)' },
  version: 'not-built',
  quality: {
    status: 'unverified',
    knownLimitations: [
      'Chưa build PMTiles thật: thiếu osmium/tippecanoe/pmtiles CLI trên máy phát triển hiện tại.',
      'Xem docs/detail-map-integration.md để biết pipeline và quyết định hosting (GitHub Releases nếu >~90MB).',
      'Chưa có checksum vì file PMTiles chưa tồn tại.',
    ],
  },
  access: { delivery: 'pmtiles', requiresAuthentication: false },
};

/**
 * Provenance for `src/entities/project/illustrativeProjectPortfolio.ts` (Phase 1.5 hardening — see
 * docs/adr/0001-project-centric-domain.md). These three descriptors exist so every
 * `sourceDatasetId` a project-domain fixture record cites actually resolves through
 * `getDatasetById`, the same way every other rendered value in this app already does — a
 * `sourceDatasetId` that intentionally didn't resolve (Phase 1's original choice) was a
 * provenance shortcut, not a real invariant, and `catalogValidationIssues` would have no way to
 * catch a *dangling* project-domain reference the way it catches other kinds of drift.
 * `authority: 'illustrative'` + `quality.status: 'unverified'` mirror
 * `COMMUNE_DEMOGRAPHIC_ILLUSTRATIVE_DATASET` above — same shape, same meaning: seeded, deterministic,
 * demo-only, never a stand-in for a real official source.
 */
export const PROJECT_PORTFOLIO_ILLUSTRATIVE_DATASET: DatasetDescriptor = {
  id: 'project-portfolio-illustrative',
  title: 'Danh mục dự án trọng điểm (minh họa)',
  description:
    'Hồ sơ 9 dự án trọng điểm minh họa (giao thông, năng lượng, thủy lợi, y tế, giáo dục, đô thị, chuyển đổi số) dùng để trình diễn nền tảng điều hành dự án. Không phản ánh dự án, ngân sách hoặc tiến độ chính thức của tỉnh Đắk Lắk; không được dùng cho quyết định quản lý thực tế.',
  domain: 'planning',
  classification: 'public',
  authority: 'illustrative',
  publicationStatus: 'published',
  administrativeLevel: 'commune',
  temporalResolution: 'static',
  spatialRepresentation: 'point',
  source: {
    organization: 'Deterministic seeded demo fixture (nội bộ project)',
    repositoryPath: 'src/entities/project/illustrativeProjectPortfolio.ts',
  },
  version: '1.0.0',
  period: { label: 'demo' },
  quality: {
    status: 'unverified',
    knownLimitations: [
      'Dữ liệu minh họa deterministic (seed cố định trong mã nguồn), không phải hồ sơ dự án vận hành thật.',
      'Tên dự án, cơ quan, nhà thầu, ngân sách và tiến độ đều là hư cấu — chỉ mã hành chính (administrativeAreaCodes) là mã xã/phường thật.',
      'Không được dùng làm căn cứ cho bất kỳ quyết định quản lý, phê duyệt hay báo cáo thực tế nào.',
      'Không tính checksum cho dữ liệu minh họa có seed cố định.',
    ],
  },
  access: { delivery: 'bundled-static', requiresAuthentication: false },
};

export const PROJECT_PROGRESS_ILLUSTRATIVE_DATASET: DatasetDescriptor = {
  id: 'project-progress-illustrative',
  title: 'Tiến độ và giải ngân dự án trọng điểm (minh họa)',
  description:
    'Chuỗi progress snapshot minh họa (tiến độ khối lượng, tiến độ tài chính, giải ngân) đi kèm danh mục dự án minh họa. Không phải số liệu giải ngân/tiến độ vận hành thật.',
  domain: 'planning',
  classification: 'public',
  authority: 'illustrative',
  publicationStatus: 'published',
  administrativeLevel: 'commune',
  temporalResolution: 'monthly',
  spatialRepresentation: 'none',
  source: {
    organization: 'Deterministic seeded demo fixture (nội bộ project)',
    repositoryPath: 'src/entities/project/illustrativeProjectPortfolio.ts',
  },
  version: '1.0.0',
  period: { label: 'demo' },
  quality: {
    status: 'unverified',
    knownLimitations: [
      'Dữ liệu minh họa deterministic, không phải số liệu giải ngân/tiến độ vận hành thật.',
      'Không được dùng làm căn cứ cho bất kỳ quyết định quản lý, phê duyệt hay báo cáo thực tế nào.',
      'Không tính checksum cho dữ liệu minh họa có seed cố định.',
    ],
  },
  access: { delivery: 'bundled-static', requiresAuthentication: false },
};

export const PROJECT_ISSUES_ILLUSTRATIVE_DATASET: DatasetDescriptor = {
  id: 'project-issues-illustrative',
  title: 'Vướng mắc dự án trọng điểm (minh họa)',
  description:
    'Danh sách vướng mắc minh họa (giải phóng mặt bằng, thủ tục, nhà thầu, tài chính...) gắn với danh mục dự án minh họa. Không phải số liệu vướng mắc vận hành thật.',
  domain: 'planning',
  classification: 'public',
  authority: 'illustrative',
  publicationStatus: 'published',
  administrativeLevel: 'commune',
  temporalResolution: 'event',
  spatialRepresentation: 'none',
  source: {
    organization: 'Deterministic seeded demo fixture (nội bộ project)',
    repositoryPath: 'src/entities/project/illustrativeProjectPortfolio.ts',
  },
  version: '1.0.0',
  period: { label: 'demo' },
  quality: {
    status: 'unverified',
    knownLimitations: [
      'Dữ liệu minh họa deterministic, không phải vướng mắc dự án thật đang xử lý.',
      'Không được dùng làm căn cứ cho bất kỳ quyết định quản lý, phê duyệt hay báo cáo thực tế nào.',
      'Không tính checksum cho dữ liệu minh họa có seed cố định.',
    ],
  },
  access: { delivery: 'bundled-static', requiresAuthentication: false },
};

export const DATASET_CATALOG: readonly DatasetDescriptor[] = [
  ADMINISTRATIVE_UNITS_DATASET,
  PROVINCE_OVERVIEW_INDICATORS_DATASET,
  COMMUNE_DEMOGRAPHIC_ILLUSTRATIVE_DATASET,
  ENERGY_ILLUSTRATIVE_DATASET,
  HEATMAP_ILLUSTRATIVE_DATASET,
  ROAD_NETWORK_3D2D_DATASET,
  TERRAIN_IMAGERY_DATASET,
  DETAIL_MAP_ROAD_BOUNDARY_PMTILES_DATASET,
  PROJECT_PORTFOLIO_ILLUSTRATIVE_DATASET,
  PROJECT_PROGRESS_ILLUSTRATIVE_DATASET,
  PROJECT_ISSUES_ILLUSTRATIVE_DATASET,
];

export function getDatasetById(id: string): DatasetDescriptor | undefined {
  return DATASET_CATALOG.find((dataset) => dataset.id === id);
}
