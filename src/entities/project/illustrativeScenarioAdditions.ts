/**
 * 5 project minh hoạ bổ sung — Phase 5 §B2 (docs/adr/0008-*.md), sinh qua `scenarioFactory.ts` thay
 * vì viết tay từng field như 9 project gốc. Mở rộng scenario coverage (status `proposed`/
 * `preparing`/`procurement`/`approved` chưa có trong 9 project gốc; LineString route; approximate
 * geometry + disclaimer; Polygon geometry; low-confidence/raw-verification record; multiple
 * verification-stage progress snapshot NGAY TRONG fixture, không chỉ trong unit test riêng) —
 * KHÔNG thay thế project gốc nào, chỉ nối thêm (xem `illustrativeProjectPortfolio.ts` cuối file).
 *
 * Đủ để nâng phạm vi scenario coverage lên một bước có ý nghĩa mà không cố đạt 24-40 project như đề
 * xuất đầy đủ trong spec Phase 5 — xem "Hạn chế" trong báo cáo cuối Phase 5 (ADR 0008) về lý do thu
 * hẹp phạm vi này.
 */
import type { ProjectBundle } from './types';
import { buildScenarioBundle } from './scenarioFactory';

const PROJECT_PORTFOLIO_DATASET_ID = 'project-portfolio-illustrative';
const PROJECT_PROGRESS_DATASET_ID = 'project-progress-illustrative';
const MOCK_DATA_OWNER = 'Dữ liệu minh hoạ — Ban điều hành dự án trọng điểm (giả lập)';

export const ADDITIONAL_SCENARIO_PROJECT_BUNDLES: ProjectBundle[] = [
  // Scenario: LineString route project + status "procurement" (chưa xuất hiện trong 9 project gốc).
  buildScenarioBundle({
    id: 'prj-010',
    code: 'DL-2026-TL-010',
    name: 'Kênh mương tưới tiêu tuyến Krông Ana (minh hoạ)',
    description: 'Cải tạo tuyến kênh mương chính phục vụ tưới tiêu (dữ liệu minh hoạ).',
    sector: 'irrigation',
    status: 'procurement',
    managingAuthorityId: 'agency-snn',
    investorId: 'agency-ubnd-tinh',
    administrativeAreaCodes: ['24133'],
    geometry: {
      type: 'LineString',
      coordinates: [
        [108.05, 12.7],
        [108.07, 12.68],
        [108.09, 12.66],
      ],
    },
    approvedBudget: 120_000_000_000,
    disbursedAmount: 0,
    overallProgress: 0,
    plannedProgress: 5,
    financialProgress: 0,
    dataUpdatedAt: '2026-07-15T00:00:00.000Z',
    dataOwner: MOCK_DATA_OWNER,
    sourceDatasetId: PROJECT_PORTFOLIO_DATASET_ID,
    confidence: 'medium',
    verificationStatus: 'approved',
  }),

  // Scenario: approximate geometry với legalStatusDisclaimer bắt buộc + status "proposed".
  buildScenarioBundle({
    id: 'prj-011',
    code: 'DL-2026-CDS-011',
    name: 'Trung tâm điều hành đô thị thông minh (minh hoạ, giai đoạn đề xuất)',
    description:
      'Đề xuất chủ trương đầu tư, vị trí chưa được khảo sát chính xác (dữ liệu minh hoạ).',
    sector: 'digital-transformation',
    status: 'proposed',
    managingAuthorityId: 'agency-sokhcn',
    investorId: 'agency-ubnd-tinh',
    administrativeAreaCodes: ['22015'],
    geometry: { type: 'Point', coordinates: [108.04, 12.67] },
    geometryMetadata: {
      source: 'approximate-manual',
      confidence: 'low',
      approximate: true,
      legalStatusDisclaimer:
        'Vị trí minh hoạ gần đúng — chưa có khảo sát địa điểm chính thức, không dùng cho quyết định quy hoạch.',
    },
    approvedBudget: 60_000_000_000,
    disbursedAmount: 0,
    overallProgress: 0,
    plannedProgress: 0,
    financialProgress: 0,
    dataUpdatedAt: '2026-07-05T00:00:00.000Z',
    dataOwner: MOCK_DATA_OWNER,
    sourceDatasetId: PROJECT_PORTFOLIO_DATASET_ID,
    confidence: 'low',
    verificationStatus: 'raw',
  }),

  // Scenario: status "preparing" + toàn bộ record ở mức confidence thấp/verification raw.
  buildScenarioBundle({
    id: 'prj-012',
    code: 'DL-2026-YT-012',
    name: 'Trạm y tế vệ tinh cụm xã phía Đông (minh hoạ, giai đoạn chuẩn bị)',
    description: 'Đang lập báo cáo nghiên cứu khả thi, số liệu sơ bộ (dữ liệu minh hoạ).',
    sector: 'health',
    status: 'preparing',
    managingAuthorityId: 'agency-syte',
    investorId: 'agency-ubnd-tinh',
    administrativeAreaCodes: ['24403'],
    approvedBudget: 35_000_000_000,
    disbursedAmount: 0,
    overallProgress: 0,
    plannedProgress: 0,
    financialProgress: 0,
    dataUpdatedAt: '2026-06-01T00:00:00.000Z',
    dataOwner: MOCK_DATA_OWNER,
    sourceDatasetId: PROJECT_PORTFOLIO_DATASET_ID,
    confidence: 'low',
    verificationStatus: 'raw',
  }),

  // Scenario: multiple verification-stage progress snapshot NGAY trong fixture (cùng identity
  // projectId+observedAt+sourceDatasetId, khác sourceRecordId/verificationStatus) — trước đây chỉ
  // có trong dữ liệu giả lập của unit test riêng (dataQualityRules.test.ts), chưa có trong fixture
  // minh hoạ thật mà Data Readiness UI (Phase 5 §C) có thể hiển thị trực tiếp.
  buildScenarioBundle(
    {
      id: 'prj-013',
      code: 'DL-2026-GD-013',
      name: 'Cải tạo trường THCS cụm xã Tây Nam (minh hoạ)',
      description: 'Cải tạo, nâng cấp cơ sở vật chất trường học (dữ liệu minh hoạ).',
      sector: 'education',
      status: 'active',
      managingAuthorityId: 'agency-sgddt',
      investorId: 'agency-ubnd-tinh',
      administrativeAreaCodes: ['22015'],
      geometry: { type: 'Point', coordinates: [108.03, 12.65] },
      approvedBudget: 45_000_000_000,
      disbursedAmount: 12_000_000_000,
      overallProgress: 25,
      plannedProgress: 30,
      financialProgress: 27,
      dataUpdatedAt: '2026-07-01T00:00:00.000Z',
      dataOwner: MOCK_DATA_OWNER,
      sourceDatasetId: PROJECT_PORTFOLIO_DATASET_ID,
      confidence: 'medium',
      verificationStatus: 'reviewed',
    },
    {
      progressSnapshots: [
        {
          projectId: 'prj-013',
          observedAt: '2026-06-01T00:00:00.000Z',
          plannedPhysicalProgress: 30,
          physicalProgress: 25,
          financialProgress: 27,
          disbursedAmount: 12_000_000_000,
          sourceDatasetId: PROJECT_PROGRESS_DATASET_ID,
          sourceRecordId: 'snap-013-raw',
          importedAt: '2026-06-02T00:00:00.000Z',
          verificationStatus: 'raw',
        },
        {
          projectId: 'prj-013',
          observedAt: '2026-06-01T00:00:00.000Z',
          plannedPhysicalProgress: 30,
          physicalProgress: 25,
          financialProgress: 27,
          disbursedAmount: 12_000_000_000,
          sourceDatasetId: PROJECT_PROGRESS_DATASET_ID,
          sourceRecordId: 'snap-013-reviewed',
          importedAt: '2026-06-10T00:00:00.000Z',
          verificationStatus: 'reviewed',
        },
      ],
    },
  ),

  // Scenario: Polygon geometry + status "approved".
  buildScenarioBundle({
    id: 'prj-014',
    code: 'DL-2026-DT-014',
    name: 'Khu tái định cư phường trung tâm (minh hoạ)',
    description: 'Quy hoạch khu tái định cư phục vụ dự án hạ tầng (dữ liệu minh hoạ).',
    sector: 'urban-development',
    status: 'approved',
    managingAuthorityId: 'agency-sxd',
    investorId: 'agency-ubnd-tinh',
    administrativeAreaCodes: ['22015'],
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [108.02, 12.66],
          [108.03, 12.66],
          [108.03, 12.67],
          [108.02, 12.67],
          [108.02, 12.66],
        ],
      ],
    },
    approvedBudget: 200_000_000_000,
    disbursedAmount: 0,
    overallProgress: 0,
    plannedProgress: 0,
    financialProgress: 0,
    dataUpdatedAt: '2026-07-18T00:00:00.000Z',
    dataOwner: MOCK_DATA_OWNER,
    sourceDatasetId: PROJECT_PORTFOLIO_DATASET_ID,
    confidence: 'high',
    verificationStatus: 'approved',
  }),

  // Phase 6 (§D1) — bốn scenario còn thiếu sau audit Phase 5→6, gộp vào MỘT project thay vì bốn (ưu
  // tiên scenario coverage, không ưu tiên số lượng project — xem docs/adr/0009-*.md):
  //   1. financial/physical mismatch: overallProgress cao (70%) nhưng financialProgress rất thấp
  //      (15%) — khối lượng thi công vượt xa tiến độ giải ngân.
  //   2. missing provenance: work package KHÔNG có sourceDatasetId (field optional — xem
  //      WorkPackage.sourceDatasetId trong types.ts), để missingProvenanceChildCount (Data
  //      Readiness) > 0 có ít nhất một ví dụ thật trong fixture minh hoạ.
  //   3. superseded snapshot: nhóm progress snapshot cùng identity
  //      (projectId+observedAt+sourceDatasetId) có MỘT bản ghi verificationStatus='superseded' (bị
  //      thay thế bởi bản ghi 'approved' cùng identity, sourceRecordId khác) — khác prj-013 (raw→
  //      reviewed, không có bản nào 'superseded').
  //   4. rejected snapshot: MỘT quan sát riêng biệt (observedAt khác) có verificationStatus='rejected'
  //      duy nhất, không có bản ghi thay thế cho quan sát đó.
  buildScenarioBundle(
    {
      id: 'prj-015',
      code: 'DL-2026-NL-015',
      name: 'Trạm biến áp 110kV cụm công nghiệp phía Nam (minh hoạ)',
      description:
        'Xây dựng trạm biến áp phục vụ cụm công nghiệp — khối lượng thi công vượt tiến độ giải ngân (dữ liệu minh hoạ).',
      sector: 'energy',
      status: 'active',
      managingAuthorityId: 'agency-scongthuong',
      investorId: 'agency-ubnd-tinh',
      administrativeAreaCodes: ['24133'],
      geometry: { type: 'Point', coordinates: [108.06, 12.64] },
      approvedBudget: 150_000_000_000,
      disbursedAmount: 22_500_000_000,
      overallProgress: 70,
      plannedProgress: 65,
      financialProgress: 15,
      dataUpdatedAt: '2026-07-20T00:00:00.000Z',
      dataOwner: MOCK_DATA_OWNER,
      sourceDatasetId: PROJECT_PORTFOLIO_DATASET_ID,
      confidence: 'medium',
      verificationStatus: 'approved',
    },
    {
      workPackages: [
        {
          id: 'prj-015-wp-01',
          projectId: 'prj-015',
          code: 'WP-01',
          name: 'Thi công móng và lắp đặt thiết bị (minh hoạ)',
          plannedStart: '2026-01-01',
          plannedEnd: '2026-09-01',
          plannedProgress: 65,
          actualProgress: 70,
          budget: 100_000_000_000,
          paidAmount: 15_000_000_000,
          status: 'active',
          // KHÔNG có sourceDatasetId — scenario "missing provenance" (field optional, xem
          // types.ts §WorkPackage).
        },
      ],
      progressSnapshots: [
        {
          projectId: 'prj-015',
          observedAt: '2026-05-01T00:00:00.000Z',
          plannedPhysicalProgress: 55,
          physicalProgress: 60,
          financialProgress: 10,
          disbursedAmount: 15_000_000_000,
          sourceDatasetId: PROJECT_PROGRESS_DATASET_ID,
          sourceRecordId: 'snap-015-superseded',
          importedAt: '2026-05-03T00:00:00.000Z',
          verificationStatus: 'superseded',
        },
        {
          projectId: 'prj-015',
          observedAt: '2026-05-01T00:00:00.000Z',
          plannedPhysicalProgress: 55,
          physicalProgress: 62,
          financialProgress: 11,
          disbursedAmount: 16_500_000_000,
          sourceDatasetId: PROJECT_PROGRESS_DATASET_ID,
          sourceRecordId: 'snap-015-approved',
          importedAt: '2026-05-10T00:00:00.000Z',
          verificationStatus: 'approved',
        },
        {
          projectId: 'prj-015',
          observedAt: '2026-06-15T00:00:00.000Z',
          plannedPhysicalProgress: 60,
          physicalProgress: 90,
          financialProgress: 12,
          disbursedAmount: 18_000_000_000,
          sourceDatasetId: PROJECT_PROGRESS_DATASET_ID,
          sourceRecordId: 'snap-015-rejected',
          importedAt: '2026-06-16T00:00:00.000Z',
          verificationStatus: 'rejected',
        },
      ],
    },
  ),
];
