/**
 * Module đích của alias `#active-portfolio-source` khi data mode là `public-static` (Phase 6 — trước
 * đó dùng chung module với `internal-static`, xem lịch sử git). Đối xứng với
 * `activePortfolioSource.demo.ts`/`activePortfolioSource.generatedJson.ts` — cùng tên export
 * `ActivePortfolioSource`, khác class đứng sau.
 */
export { PublicProjectedProjectPortfolioSource as ActivePortfolioSource } from './publicProjectedProjectPortfolioSource';
