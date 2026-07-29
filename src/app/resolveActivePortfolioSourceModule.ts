/**
 * Ánh xạ THUẦN (không phụ thuộc Vite) từ data mode sang đường dẫn module cần alias — tách riêng để
 * unit-test được logic chọn module mà không cần chạy một `vite build` thật cho mỗi test case.
 * `vite.config.ts` gọi hàm này để cấu hình `resolve.alias`; xem
 * docs/project-data-import/04-deployment-profiles-design.md.
 *
 * LÝ DO CẦN ALIAS (không chỉ dùng switch runtime trong composition root): một `switch(mode)` runtime
 * gọi cả hai nhánh `new Illustrative...()`/`new Generated...()` trong CÙNG một module khiến Rollup
 * không thể chứng minh nhánh nào chết — cả hai class (và 839 dòng
 * `illustrativeProjectPortfolio.ts`) vẫn nằm trong `dist/` của build `internal-static`, đã xác nhận
 * bằng build thật (`grep prj-001 dist/assets/*.js` tìm thấy trước khi sửa). Alias buộc Rollup chỉ
 * bao giờ thấy MỘT trong hai file nguồn trong đồ thị module của một lần build — loại trừ vật lý,
 * không phụ thuộc dead-code-elimination có "đoán" đúng hay không.
 */
import type { PortfolioDeploymentMode } from '../entities/project/adapters/ProjectPortfolioSource';

export const ACTIVE_PORTFOLIO_SOURCE_MODULE_DEMO = './src/data/activePortfolioSource.demo.ts';
export const ACTIVE_PORTFOLIO_SOURCE_MODULE_GENERATED_JSON =
  './src/data/activePortfolioSource.generatedJson.ts';
/** Phase 6 — module riêng cho `public-static`, đọc bundle ĐÃ qua public projection engine (xem
 * `src/entities/project/publicProjection/`, `src/data/publicProjectedProjectPortfolioSource.ts`).
 * Trước Phase 6, `public-static` dùng chung module với `internal-static` (xem lịch sử git) — từ Phase
 * 6 trở đi, hai mode này KHÔNG còn dùng chung module nữa (xem `portfolioModePolicy.ts`). */
export const ACTIVE_PORTFOLIO_SOURCE_MODULE_PUBLIC_PROJECTED =
  './src/data/activePortfolioSource.publicProjected.ts';

/** `mode` đã được chuẩn hoá về `PortfolioDeploymentMode` hợp lệ trước khi gọi hàm này (xem
 * `isPortfolioDeploymentMode`/`DEFAULT_PORTFOLIO_DATA_MODE` trong `portfolioDataModes.ts`) — hàm
 * này không tự xử lý giá trị lạ. */
export function resolveActivePortfolioSourceModule(mode: PortfolioDeploymentMode): string {
  if (mode === 'demo') return ACTIVE_PORTFOLIO_SOURCE_MODULE_DEMO;
  if (mode === 'public-static') return ACTIVE_PORTFOLIO_SOURCE_MODULE_PUBLIC_PROJECTED;
  return ACTIVE_PORTFOLIO_SOURCE_MODULE_GENERATED_JSON;
}
