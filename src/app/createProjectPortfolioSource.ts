/**
 * Composition root DUY NHẤT chọn `ProjectPortfolioSource` cụ thể — Phase 2
 * (docs/project-data-import/01-target-architecture.md §3, 04-deployment-profiles-design.md).
 * Không component/feature nào được tự đọc `import.meta.env`/tự `new` một concrete source; mọi nơi
 * chỉ import `defaultProjectPortfolioSource` từ đây.
 *
 * Import qua alias `#active-portfolio-source` (cấu hình tại `vite.config.ts`, ánh xạ bởi
 * `resolveActivePortfolioSourceModule()`) — KHÔNG import trực tiếp cả
 * `IllustrativeProjectPortfolioSource` lẫn `GeneratedJsonProjectPortfolioSource` rồi rẽ nhánh bằng
 * `switch` runtime trong file này. Lý do: một `switch` runtime khiến Rollup không thể chứng minh
 * nhánh nào chết, nên CẢ HAI class (và 839 dòng `illustrativeProjectPortfolio.ts`) vẫn nằm trong
 * `dist/` của build `internal-static` dù chỉ một nhánh thực sự chạy — đã xác nhận bằng build thật
 * trước khi đổi sang alias (xem JSDoc `resolveActivePortfolioSourceModule.ts`). Alias buộc Rollup
 * chỉ thấy đúng MỘT module nguồn trong đồ thị build — loại trừ vật lý, không phụ thuộc
 * dead-code-elimination "đoán" đúng.
 */
import { ActivePortfolioSource } from '#active-portfolio-source';
import type { ProjectPortfolioSource } from '../entities/project/adapters/ProjectPortfolioSource';

/**
 * Instance DUY NHẤT dùng bởi toàn bộ ứng dụng khi không có `source` được tiêm qua prop (test/story).
 * Là một module-level singleton (ES module chỉ evaluate một lần) — được tính ngay khi module này
 * lần đầu được import.
 */
export const defaultProjectPortfolioSource: ProjectPortfolioSource = new ActivePortfolioSource();
