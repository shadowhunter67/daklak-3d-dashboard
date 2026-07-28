import type { ProjectPortfolioSourceMetadata } from '../../../entities/project/adapters/ProjectPortfolioSource';
import type { DataQualityIssue } from '../../../entities/project/types';

export interface DataReadinessCounts {
  projects: number;
  workPackages: number;
  milestones: number;
  issues: number;
  progressSnapshots: number;
}

export interface DataReadinessModel {
  metadata: ProjectPortfolioSourceMetadata;
  asOf: string;
  counts: DataReadinessCounts;
  validationErrors: string[];
  dataQualityIssues: DataQualityIssue[];
  businessAlerts: DataQualityIssue[];
  staleProjectCount: number;
  duplicateRecordCount: number;
  unmappedAdministrativeCodeCount: number;
  lowConfidenceProjectCount: number;
  unverifiedProjectCount: number;
  missingProvenanceChildCount: number;
}
