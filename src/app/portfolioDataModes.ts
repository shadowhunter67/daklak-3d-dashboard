/**
 * Danh sách data mode hợp lệ + hằng số mặc định — tách khỏi `createProjectPortfolioSource.ts` vì
 * file này KHÔNG dùng `import.meta.env` (chỉ type + hàm thuần), nên dùng được cả từ code chạy trong
 * browser (`createProjectPortfolioSource.ts`) lẫn từ `vite.config.ts` (chạy trong Node ở build
 * time, nơi `import.meta.env` không tồn tại) — một nguồn sự thật duy nhất cho danh sách mode hợp lệ,
 * tránh vite.config.ts và composition root có hai danh sách lệch nhau.
 */
import type { PortfolioDeploymentMode } from '../entities/project/adapters/ProjectPortfolioSource';

export const PORTFOLIO_DATA_MODES: readonly PortfolioDeploymentMode[] = [
  'demo',
  'internal-static',
  'public-static',
];

export const DEFAULT_PORTFOLIO_DATA_MODE: PortfolioDeploymentMode = 'demo';

export function isPortfolioDeploymentMode(value: string): value is PortfolioDeploymentMode {
  return (PORTFOLIO_DATA_MODES as readonly string[]).includes(value);
}

/** Ba giá trị `mode` mặc định Vite/Vitest tự truyền khi KHÔNG có cờ `--mode` tường minh — coi là
 * "chưa chọn data mode", rơi về `DEFAULT_PORTFOLIO_DATA_MODE`. Xem
 * `resolvePortfolioDataModeFromViteMode` và `vite.config.ts`. */
export const VITE_BUILTIN_DEFAULT_MODES: ReadonlySet<string> = new Set([
  'development',
  'production',
  'test',
]);

/**
 * Ánh xạ `mode` thô của Vite/Vitest sang `PortfolioDeploymentMode` — tách khỏi `vite.config.ts` để
 * unit-test được (Node config file không dễ import trong Vitest theo cách thông thường). Ba giá
 * trị mặc định của Vite/Vitest ('development'/'production'/'test') rơi về `demo` (mặc định an
 * toàn); bất kỳ `--mode <x>` nào khác không khớp `demo`/`internal-static`/`public-static` đều throw
 * — "giá trị lạ phải fail build rõ ràng, không âm thầm chọn mode khác".
 */
export function resolvePortfolioDataModeFromViteMode(mode: string): PortfolioDeploymentMode {
  if (VITE_BUILTIN_DEFAULT_MODES.has(mode)) return DEFAULT_PORTFOLIO_DATA_MODE;
  if (isPortfolioDeploymentMode(mode)) return mode;
  throw new Error(
    `--mode '${mode}' không phải data mode hợp lệ cho project-portfolio. Giá trị hợp lệ: ` +
      `'demo' | 'internal-static' | 'public-static' (hoặc bỏ trống --mode để dùng mặc định 'demo'). ` +
      `Xem docs/project-data-import/04-deployment-profiles-design.md.`,
  );
}
