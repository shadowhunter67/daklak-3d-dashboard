/**
 * Module đích của alias `#active-portfolio-source` khi data mode là `demo` (xem
 * `vite.config.ts`, `src/app/resolveActivePortfolioSourceModule.ts`). File riêng, chỉ re-export một
 * tên chung `ActivePortfolioSource` — để `vite.config.ts` alias sang module KHÁC
 * (`activePortfolioSource.generatedJson.ts`) khi build `internal-static`/`public-static` mà không
 * cần đổi code ở `src/app/createProjectPortfolioSource.ts`.
 */
export { IllustrativeProjectPortfolioSource as ActivePortfolioSource } from './projectPortfolioSource';
