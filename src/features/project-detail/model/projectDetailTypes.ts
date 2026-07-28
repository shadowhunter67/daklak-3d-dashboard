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
import type { ProjectPortfolioProvenance } from '../../../entities/project/adapters/ProjectPortfolioSource';
import type { AuthoritativeSnapshotExplanation } from '../../../entities/project/validation/authoritativeSnapshotExplanation';

export interface ProjectDetailProvenanceEntry {
  sourceDatasetId: string;
  dataset: DatasetDescriptor | null;
}

export interface ProjectDetailAttentionReason {
  category: AttentionReasonCategory;
}

export interface ProjectDetailProgressPoint {
  observedAt: string;
  plannedPhysicalProgress: number;
  physicalProgress: number;
  financialProgress: number;
}

export interface ProjectDetailModel {
  generatedAt: string;
  /** Bốn+một mốc thời gian thật của snapshot dữ liệu (xem `ProjectPortfolioProvenance`) — không
   * suy ra "cập nhật hôm nay" từ `generatedAt`, vốn chỉ là thời điểm tính lại view model. */
  dataTimeline: ProjectPortfolioProvenance;
  header: {
    projectId: string;
    code: string;
    name: string;
    sector: ProjectSector;
    status: ProjectStatus;
    priority: ProjectPriority;
    dataUpdatedAt: string;
    confidence: string;
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
  /** Phase 6 (C1-C2) — giải thích authoritative snapshot cho lần quan sát tiến độ gần nhất. Xem
   * JSDoc `authoritativeSnapshotExplanation.ts` về vì sao `affectedKpis` KHÔNG có nghĩa "tính trực
   * tiếp từ snapshot này". */
  snapshotExplanation: AuthoritativeSnapshotExplanation;
}

export type ProjectDetailLookupResult =
  { status: 'found'; model: ProjectDetailModel } | { status: 'not-found' };
