/**
 * Module đích của alias `#active-portfolio-source` khi data mode là `internal-static`/`public-static`
 * (xem `vite.config.ts`, `src/app/resolveActivePortfolioSourceModule.ts`). Đối xứng với
 * `activePortfolioSource.demo.ts` — cùng tên export `ActivePortfolioSource`, khác class đứng sau.
 */
export { GeneratedJsonProjectPortfolioSource as ActivePortfolioSource } from './generatedJsonProjectPortfolioSource';
