import type { ProjectSector, ProjectStatus } from '../../../entities/project/types';
import type { KpiResult } from '../../../entities/project/kpi/types';
import type { AttentionReasonCategory } from '../../../entities/project/attentionReason';
import type { PortfolioFilters, PortfolioSortKey } from '../../../routing/hashRoute';

/** Một dòng trong Project Portfolio — read-model, không phải `Project` thô: mọi giá trị dẫn xuất
 * (KPI, lý do cần chú ý) đã được tính sẵn bởi `buildProjectPortfolioViewModel`, component chỉ
 * render. Danh tính hiển thị là mã/tên dự án — không dùng geometry hay ward làm identity chính
 * (spec D3). */
export interface ProjectPortfolioRow {
  projectId: string;
  code: string;
  name: string;
  sector: ProjectSector;
  sectorLabel: string;
  status: ProjectStatus;
  statusLabel: string;
  plannedProgress: number;
  overallProgress: number;
  disbursementRate: KpiResult;
  plannedCompletionDate: string | null;
  dataFreshnessDays: KpiResult;
  primaryReason: string | null;
  reasonCategory: AttentionReasonCategory | null;
  administrativeAreaCodes: string[];
}

export interface ProjectPortfolioFilterOption {
  value: string;
  label: string;
  count: number;
}

export interface ProjectPortfolioModel {
  generatedAt: string;
  totalCount: number;
  rows: ProjectPortfolioRow[];
  filterOptions: {
    status: ProjectPortfolioFilterOption[];
    sector: ProjectPortfolioFilterOption[];
    area: ProjectPortfolioFilterOption[];
  };
}

export type { PortfolioFilters, PortfolioSortKey };
