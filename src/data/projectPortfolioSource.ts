/**
 * `BundledProjectPortfolioSource` — nguồn dữ liệu Phase 2A duy nhất: bundled fixture minh hoạ đóng
 * gói cùng ứng dụng (`src/entities/project/mockPortfolio.ts`), giống cách
 * `src/data/datasetManifest.ts` và `loadRoads.ts` đã bọc asset GIS thành API tiêu thụ được — không
 * component nào import fixture trực tiếp (spec Phase 2A "Data access boundary").
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
import { MOCK_PROJECT_BUNDLES } from '../entities/project/mockPortfolio';
import type {
  ProjectPortfolioLoadResult,
  ProjectPortfolioSource,
} from '../entities/project/adapters/ProjectPortfolioSource';

const validAdministrativeCodes = new Set(Object.keys(labels));

export class BundledProjectPortfolioSource implements ProjectPortfolioSource {
  async loadPortfolio(): Promise<ProjectPortfolioLoadResult> {
    return {
      status: 'ok',
      data: {
        bundles: MOCK_PROJECT_BUNDLES,
        validAdministrativeCodes,
        loadedAt: new Date().toISOString(),
      },
    };
  }
}
