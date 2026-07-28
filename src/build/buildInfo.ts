import type { PortfolioDeploymentMode } from '../entities/project/adapters/ProjectPortfolioSource';

export interface BuildInfoInput {
  applicationVersion: string;
  gitCommit: string | undefined;
  buildTimestamp: string;
  datasetVersion: string;
  datasetSnapshot: string;
  /** Xem docs/project-data-import/04-deployment-profiles-design.md và
   * src/app/portfolioDataModes.ts — trục "nguồn dữ liệu project-portfolio" (demo/internal-static/
   * public-static), KHÔNG phải trục auth "public"/"secure" của docs/deployment-profiles.md. */
  portfolioDataMode: PortfolioDeploymentMode;
  /** Phase 6 — đường dẫn module `resolveActivePortfolioSourceModule(portfolioDataMode)` ĐÃ được
   * alias `#active-portfolio-source` tới ở lần build này. Đây là bằng chứng CẤU HÌNH (không phụ
   * thuộc nội dung dữ liệu) mà `scripts/validate_portfolio_data_mode.mjs` dùng làm nguồn xác thực
   * chính, thay cho grep ID dữ liệu cố định — xem `src/app/portfolioModePolicy.ts`. */
  activePortfolioSourceModule: string;
}

export interface BuildInfo {
  applicationVersion: string;
  gitCommit: string;
  buildTimestamp: string;
  datasetVersion: string;
  datasetSnapshot: string;
  portfolioDataMode: PortfolioDeploymentMode;
  activePortfolioSourceModule: string;
}

export function createBuildInfo(input: BuildInfoInput): BuildInfo {
  const gitCommit = input.gitCommit?.trim();
  return {
    applicationVersion: input.applicationVersion,
    gitCommit: gitCommit || 'unknown',
    buildTimestamp: new Date(input.buildTimestamp).toISOString(),
    datasetVersion: input.datasetVersion,
    datasetSnapshot: input.datasetSnapshot,
    portfolioDataMode: input.portfolioDataMode,
    activePortfolioSourceModule: input.activePortfolioSourceModule,
  };
}
