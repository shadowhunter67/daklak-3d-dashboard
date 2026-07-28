import type { ProjectPortfolioSourceMetadata } from '../../../entities/project/adapters/ProjectPortfolioSource';
import type { DataQualityIssue } from '../../../entities/project/types';

export interface DataReadinessCounts {
  projects: number;
  workPackages: number;
  milestones: number;
  issues: number;
  progressSnapshots: number;
}

/** Phase 6 (C6) — `DataQualityIssue` mở rộng với projectId đã resolve (nếu xác định được), để UI
 * điều hướng thẳng sang Project Detail. `linkedProjectId: null` khi issue không gắn với project nào
 * xác định được (KHÔNG suy đoán — chỉ null khi không thể resolve, không bao giờ hiển thị link chết). */
export interface DataReadinessIssueWithProjectLink extends DataQualityIssue {
  linkedProjectId: string | null;
}

export interface DataReadinessModel {
  metadata: ProjectPortfolioSourceMetadata;
  asOf: string;
  counts: DataReadinessCounts;
  validationErrors: string[];
  dataQualityIssues: DataReadinessIssueWithProjectLink[];
  businessAlerts: DataReadinessIssueWithProjectLink[];
  staleProjectCount: number;
  duplicateRecordCount: number;
  unmappedAdministrativeCodeCount: number;
  lowConfidenceProjectCount: number;
  unverifiedProjectCount: number;
  missingProvenanceChildCount: number;
}
