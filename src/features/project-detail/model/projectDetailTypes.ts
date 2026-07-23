import type {
  Milestone,
  ProjectGeometry,
  ProjectIssue,
  ProjectPriority,
  ProjectSector,
  ProjectStatus,
  WorkPackage,
} from '../../../entities/project/types';
import type { KpiResult } from '../../../entities/project/kpi/types';
import type { AttentionReasonCategory } from '../../../entities/project/attentionReason';
import type { DatasetDescriptor } from '../../../data-platform/schemas/dataset';

export interface ProjectDetailProvenanceEntry {
  sourceDatasetId: string;
  dataset: DatasetDescriptor | null;
}

export interface ProjectDetailAttentionReason {
  category: AttentionReasonCategory;
  label: string;
}

export interface ProjectDetailProgressPoint {
  observedAt: string;
  plannedPhysicalProgress: number;
  physicalProgress: number;
  financialProgress: number;
}

export interface ProjectDetailModel {
  generatedAt: string;
  header: {
    projectId: string;
    code: string;
    name: string;
    sector: ProjectSector;
    sectorLabel: string;
    status: ProjectStatus;
    statusLabel: string;
    priority: ProjectPriority;
    dataUpdatedAt: string;
    confidence: string;
    confidenceLabel: string;
  };
  summary: {
    approvedBudget: number;
    adjustedBudget: number | null;
    disbursedAmount: number;
    disbursementRate: KpiResult;
    overallProgress: number;
    plannedProgress: number;
    scheduleVariance: KpiResult;
    budgetVariance: KpiResult;
    plannedCompletionDate: string | null;
    forecastCompletionDate: string | null;
    forecastDelayInDays: KpiResult;
  };
  attentionReasons: ProjectDetailAttentionReason[];
  workPackages: WorkPackage[];
  milestones: Milestone[];
  progressHistory: ProjectDetailProgressPoint[];
  issues: {
    all: ProjectIssue[];
    bySeverity: Record<ProjectIssue['severity'], ProjectIssue[]>;
    overdueIssueCount: KpiResult;
  };
  geography: {
    administrativeAreaCodes: string[];
    geometry: ProjectGeometry | null;
    hasGeometry: boolean;
  };
  provenance: ProjectDetailProvenanceEntry[];
  dataQualityIssueCount: number;
}

export type ProjectDetailLookupResult =
  { status: 'found'; model: ProjectDetailModel } | { status: 'not-found' };
