/**
 * Phase 6 — thay thế cơ chế leakage-guard dựa trên marker ID dữ liệu cố định (Phase 2, xem lịch sử
 * git `scripts/validate_portfolio_data_mode.mjs`) bằng một policy CÓ CẤU TRÚC, dựa trên metadata/
 * manifest thay vì grep một chuỗi ID tuỳ ý. Vấn đề của marker cũ (`prj-001`/`gen-fixture-001`):
 * false positive khi dữ liệu import thật vô tình trùng ID, false negative khi fixture đổi ID, và về
 * bản chất là kiểm tra NỘI DUNG DỮ LIỆU thay vì kiểm tra CONTRACT.
 *
 * Policy này dùng hai nguồn sự thật KHÔNG phụ thuộc nội dung dữ liệu:
 *   1. `activePortfolioSourceModule` — đường dẫn module Vite alias `#active-portfolio-source` TỚI
 *      lúc build (`resolveActivePortfolioSourceModule.ts`), ghi vào `dist/build-info.json` bởi plugin
 *      `build-info` (`vite.config.ts`). Đây là quyết định CẤU HÌNH, không phải nội dung — không đổi
 *      dù dữ liệu bên trong module đổi thế nào.
 *   2. `sourceKind` — literal string ổn định của TypeScript contract (`PortfolioSourceKind`:
 *      'illustrative' | 'generated-json' | 'public-projected'), không phải một ID dữ liệu tuỳ ý. Giá
 *      trị này chỉ đổi khi có thay đổi CONTRACT (đã có test coverage riêng, xem
 *      `ProjectPortfolioSource.ts`), không đổi khi ai đó sửa nội dung fixture.
 *
 * `scripts/validate_portfolio_data_mode.mjs` đọc cả hai từ `dist/build-info.json` + scan
 * `dist/assets/*.js` tìm literal `"sourceKind":"<kind>"` — KHÔNG còn grep ID dự án nào.
 */
import type {
  PortfolioDeploymentMode,
  PortfolioSourceKind,
} from '../entities/project/adapters/ProjectPortfolioSource';
import {
  ACTIVE_PORTFOLIO_SOURCE_MODULE_DEMO,
  ACTIVE_PORTFOLIO_SOURCE_MODULE_GENERATED_JSON,
  ACTIVE_PORTFOLIO_SOURCE_MODULE_PUBLIC_PROJECTED,
} from './resolveActivePortfolioSourceModule';

export interface PortfolioModePolicy {
  /** Module (đường dẫn alias) DUY NHẤT được phép active cho mode này. */
  allowedSourceModules: readonly string[];
  /** `sourceKind` được phép xuất hiện trong dist bundle cho mode này. */
  allowedSourceKinds: readonly PortfolioSourceKind[];
  /** `sourceKind` TUYỆT ĐỐI không được xuất hiện trong dist bundle cho mode này — rò rỉ nếu có. */
  forbiddenSourceKinds: readonly PortfolioSourceKind[];
  /** Mode này có bắt buộc dist bundle chứa một public projection manifest đã nhúng hay không (Phase
   * 6 — chỉ `public-static`; xem `ProjectPortfolioSourceMetadata.publicProjectionManifest`). */
  requirePublicProjectionManifest: boolean;
}

export const PORTFOLIO_MODE_POLICIES: Record<PortfolioDeploymentMode, PortfolioModePolicy> = {
  demo: {
    allowedSourceModules: [ACTIVE_PORTFOLIO_SOURCE_MODULE_DEMO],
    allowedSourceKinds: ['illustrative'],
    forbiddenSourceKinds: ['generated-json', 'public-projected'],
    requirePublicProjectionManifest: false,
  },
  'internal-static': {
    allowedSourceModules: [ACTIVE_PORTFOLIO_SOURCE_MODULE_GENERATED_JSON],
    allowedSourceKinds: ['generated-json'],
    forbiddenSourceKinds: ['illustrative', 'public-projected'],
    requirePublicProjectionManifest: false,
  },
  'public-static': {
    allowedSourceModules: [ACTIVE_PORTFOLIO_SOURCE_MODULE_PUBLIC_PROJECTED],
    allowedSourceKinds: ['public-projected'],
    forbiddenSourceKinds: ['illustrative', 'generated-json'],
    requirePublicProjectionManifest: true,
  },
};
