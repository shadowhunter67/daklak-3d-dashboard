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
}

export interface BuildInfo {
  applicationVersion: string;
  gitCommit: string;
  buildTimestamp: string;
  datasetVersion: string;
  datasetSnapshot: string;
  portfolioDataMode: PortfolioDeploymentMode;
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
  };
}
