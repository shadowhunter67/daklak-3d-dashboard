/**
 * `IllustrativeProjectPortfolioSource` — nguồn dữ liệu minh hoạ: bundled fixture đóng gói cùng ứng
 * dụng (`src/entities/project/illustrativeProjectPortfolio.ts`), giống cách
 * `src/data/datasetManifest.ts` và `loadRoads.ts` đã bọc asset GIS thành API tiêu thụ được — không
 * component nào import fixture trực tiếp (spec Phase 2A "Data access boundary").
 *
 * Đổi tên từ `BundledProjectPortfolioSource` (Phase 2 — docs/project-data-import/01-target-architecture.md
 * §2.1): sau khi có `GeneratedJsonProjectPortfolioSource`, tên "Bundled" không còn phân biệt được hai
 * nguồn — cả hai đều là static import trong nghĩa Vite. Giữ alias `BundledProjectPortfolioSource`
 * bên dưới cho code cũ còn tham chiếu tên gốc.
 *
 * Sống ở `src/data/`, không phải `src/entities/project/adapters/`, vì nó cần import
 * `daklak-labels.json` để suy ra `validAdministrativeCodes` — domain layer dưới
 * `src/entities/project/` bị cấm import GIS asset trực tiếp (xem
 * `src/entities/project/importBoundary.test.ts` và docs/domain-model.md). Đây là điểm nối GIS +
 * domain hợp lệ duy nhất cho nguồn dữ liệu dự án.
 *
 * Luôn trả `status: 'ok'` vì dữ liệu đã nằm sẵn trong bundle JS (không có bước network/parse có thể
 * lỗi) — trạng thái `degraded`/`error` của giao diện được test qua `FakeProjectPortfolioSource`
 * (xem `src/features/executive-overview/data/FakeProjectPortfolioSource.ts`), theo đúng pattern
 * `FakeMapProvider.ts` đã dùng cho detail map.
 */
import labels from '../assets/maps/daklak/daklak-labels.json';
import {
  MOCK_PORTFOLIO_PROVENANCE,
  MOCK_PROJECT_BUNDLES,
  MOCK_REFERENCE_DATE,
} from '../entities/project/illustrativeProjectPortfolio';
import type {
  ProjectPortfolioLoadResult,
  ProjectPortfolioSource,
  ProjectPortfolioSourceMetadata,
} from '../entities/project/adapters/ProjectPortfolioSource';

const validAdministrativeCodes = new Set(Object.keys(labels));

/** Dataset id thật trong `DATASET_CATALOG` (Phase 1.5) mà mọi record minh hoạ trỏ tới — liệt kê lại
 * ở đây (thay vì import DATASET_CATALOG) để tránh domain/data-access layer phải phụ thuộc toàn bộ
 * catalog chỉ để lấy 3 id tĩnh; ba chuỗi này phải khớp `sourceDatasetId` xuất hiện trong
 * `illustrativeProjectPortfolio.ts` (đã được `illustrativeProjectPortfolio.test.ts` xác nhận resolve
 * được qua `getDatasetById`). */
const ILLUSTRATIVE_DATASET_IDS: readonly string[] = [
  'project-portfolio-illustrative',
  'project-progress-illustrative',
  'project-issues-illustrative',
];

function createIllustrativeMetadata(): ProjectPortfolioSourceMetadata {
  return {
    sourceId: 'illustrative',
    sourceKind: 'illustrative',
    displayName: 'Dữ liệu minh họa (illustrative)',
    datasetIds: ILLUSTRATIVE_DATASET_IDS,
    // Fixture viết tay không có khái niệm "wire schema version"/"bundle version"/"generatedAt" —
    // để null thay vì bịa giá trị (xem docs/project-data-import/01-target-architecture.md).
    schemaVersion: null,
    bundleVersion: null,
    asOf: MOCK_REFERENCE_DATE,
    generatedAt: null,
    isIllustrative: true,
    deploymentCompatibility: ['demo'],
  };
}

export class IllustrativeProjectPortfolioSource implements ProjectPortfolioSource {
  getMetadata(): ProjectPortfolioSourceMetadata {
    return createIllustrativeMetadata();
  }

  async loadPortfolio(): Promise<ProjectPortfolioLoadResult> {
    return {
      status: 'ok',
      data: {
        bundles: MOCK_PROJECT_BUNDLES,
        validAdministrativeCodes,
        // `loadedInBrowserAt` là mốc runtime hợp lệ DUY NHẤT ở đây — bốn mốc còn lại đến từ
        // snapshot deterministic, không phải giờ hệ thống (xem ProjectPortfolioProvenance).
        provenance: { ...MOCK_PORTFOLIO_PROVENANCE, loadedInBrowserAt: new Date().toISOString() },
        metadata: createIllustrativeMetadata(),
      },
    };
  }
}

/** Alias tương thích ngược — mã nguồn cũ (nếu còn) tham chiếu tên trước Phase 2. Không dùng cho code
 * mới; dùng `IllustrativeProjectPortfolioSource` hoặc `createProjectPortfolioSource()`
 * (`src/app/createProjectPortfolioSource.ts`). */
export const BundledProjectPortfolioSource = IllustrativeProjectPortfolioSource;
