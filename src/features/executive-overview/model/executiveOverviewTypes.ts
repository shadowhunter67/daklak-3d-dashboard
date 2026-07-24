import type {
  DataConfidence,
  ProjectGeometry,
  ProjectSector,
  ProjectStatus,
} from '../../../entities/project/types';
import type { KpiResult } from '../../../entities/project/kpi/types';
import type { DataQualitySummary } from '../../../entities/project/dataQualitySummary';
import type { ProjectPortfolioProvenance } from '../../../entities/project/adapters/ProjectPortfolioSource';

export type PortfolioStatus = 'healthy' | 'attention' | 'critical' | 'degraded';

export interface ExecutiveOverviewKpis {
  totalProjects: KpiResult;
  totalApprovedBudget: KpiResult;
  disbursementRate: KpiResult;
  onTrackProjects: KpiResult;
  atRiskProjects: KpiResult;
  delayedProjects: KpiResult;
  overdueIssues: KpiResult;
}

/** Dự án cần chú ý — mỗi item mang đúng MỘT lý do chính (`primaryReason`), không phải điểm số
 * tổng hợp không giải thích được ("AI score"). Xem `rankProjectsForAttention` trong
 * `buildExecutiveOverview.ts` cho thứ tự xếp hạng đầy đủ. */
export interface ProjectAttentionItem {
  projectId: string;
  projectName: string;
  projectCode: string;
  sector: ProjectSector;
  status: ProjectStatus;
  statusLabel: string;
  overallProgress: number;
  disbursementRate: KpiResult;
  primaryReason: string;
  reasonCategory:
    'overdue-critical-issue' | 'delayed' | 'at-risk' | 'stale-data' | 'budget-exposure';
  dataUpdatedAt: string;
  administrativeAreaCodes: string[];
  geometry?: ProjectGeometry;
}

export type PortfolioAlertKind = 'business' | 'data-quality';
export type PortfolioAlertSeverity = 'critical' | 'warning';

/** Hợp nhất `ProjectAlert` (nghiệp vụ) và `DataQualityIssue` (chất lượng dữ liệu) thành một shape
 * UI tiêu thụ được, nhưng `kind` giữ chúng phân biệt rõ — spec: "Không trộn data-quality alert với
 * business alert mà không phân biệt". */
export interface PortfolioAlert {
  id: string;
  kind: PortfolioAlertKind;
  severity: PortfolioAlertSeverity;
  category: string;
  message: string;
  projectId?: string;
}

export interface DataHealthSummary extends DataQualitySummary {
  confidenceBreakdown: Record<DataConfidence, number>;
}

export interface ExecutiveOverviewModel {
  generatedAt: string;
  /** Bốn+một mốc thời gian thật của snapshot dữ liệu (hiệu lực/nguồn công bố/hệ thống thu thập/
   * publish lên dashboard/trình duyệt nạp) — không suy ra "cập nhật hôm nay" từ `generatedAt`,
   * vốn chỉ là thời điểm tính toán lại view model, không phải thời điểm dữ liệu thay đổi. */
  dataTimeline: ProjectPortfolioProvenance;
  portfolioStatus: PortfolioStatus;
  kpis: ExecutiveOverviewKpis;
  /** Số dự án hợp lệ theo từng `ProjectStatus` — nguồn cho biểu đồ phân bố trạng thái (spec §E).
   * Luôn có đủ mọi status key (giá trị 0 nếu không có dự án nào), để UI không phải tự suy luận
   * key nào tồn tại. */
  statusDistribution: Record<ProjectStatus, number>;
  priorityProjects: ProjectAttentionItem[];
  alerts: PortfolioAlert[];
  dataHealth: DataHealthSummary;
}
