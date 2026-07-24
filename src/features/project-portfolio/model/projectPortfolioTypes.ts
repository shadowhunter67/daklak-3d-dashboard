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
  status: ProjectStatus;
  plannedProgress: number;
  overallProgress: number;
  disbursementRate: KpiResult;
  plannedCompletionDate: string | null;
  dataFreshnessDays: KpiResult;
  reasonCategory: AttentionReasonCategory | null;
  administrativeAreaCodes: string[];
}

/** `value` is the raw enum/code — components resolve its display label via `t()` (e.g.
 * `status.${value}`/`sector.${value}`), never a pre-baked Vietnamese string (see docs/adr/
 * 0003-internationalization.md and `ProjectPortfolioView.tsx`). */
export interface ProjectPortfolioFilterOption {
  value: string;
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
