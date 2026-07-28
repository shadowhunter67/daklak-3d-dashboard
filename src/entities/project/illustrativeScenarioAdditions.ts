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
];
