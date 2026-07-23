/**
 * Read-model layer cho Executive Overview (spec Phase 2A). Component KHÔNG được tự tính KPI —
 * mọi phép tính đi qua `buildExecutiveOverview`, một hàm thuần nhận dữ liệu + `asOf` tường minh và
 * trả về `ExecutiveOverviewModel` đã sẵn sàng render. Tái sử dụng toàn bộ domain layer Phase 1/1.5
 * (`assessPortfolio`, `kpi/*`, `summarizeDataQuality`) thay vì tính lại logic.
 */
import {
  disbursementRate as disbursementRateKpi,
  overdueIssueCount,
} from '../../../entities/project/kpi';
import { availableKpi } from '../../../entities/project/kpi/types';
import { assessPortfolio } from '../../../entities/project/portfolioAssessment';
import {
  PROJECT_STATUSES,
  type ProjectBundle,
  type ProjectStatus,
} from '../../../entities/project/types';
import { summarizeDataQuality } from '../../../entities/project/dataQualitySummary';
import type { DataQualityContext } from '../../../entities/project/validation/dataQualityRules';
import type {
  DataHealthSummary,
  ExecutiveOverviewModel,
  PortfolioAlert,
  PortfolioStatus,
  ProjectAttentionItem,
} from './executiveOverviewTypes';

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  proposed: 'Đề xuất',
  preparing: 'Đang chuẩn bị',
  approved: 'Đã phê duyệt',
  procurement: 'Đang đấu thầu',
  active: 'Đang triển khai',
  'at-risk': 'Có nguy cơ chậm',
  delayed: 'Chậm tiến độ',
  suspended: 'Tạm dừng',
  completed: 'Hoàn thành',
  cancelled: 'Đã huỷ',
  unknown: 'Chưa xác định',
};

export interface BuildExecutiveOverviewInput {
  bundles: readonly ProjectBundle[];
  context: DataQualityContext;
  /** Trạng thái nguồn dữ liệu (từ `ProjectPortfolioLoadResult`) — `'degraded'` bắt buộc
   * `portfolioStatus: 'degraded'` bất kể nội dung dữ liệu, vì người dùng cần biết ngay là bức
   * tranh đang thiếu một phần, trước khi quan tâm tới việc phần còn lại tốt hay xấu. */
  sourceStatus?: 'ok' | 'degraded';
}

const AGENCY_ALERT_CATEGORY_LABEL: Record<ProjectAttentionItem['reasonCategory'], string> = {
  'overdue-critical-issue': 'Có vướng mắc nghiêm trọng quá hạn',
  delayed: 'Đang chậm tiến độ',
  'at-risk': 'Có nguy cơ chậm tiến độ',
  'stale-data': 'Dữ liệu đã quá hạn cập nhật',
  'budget-exposure': 'Giải ngân vượt tiến độ khối lượng',
};

/** Thứ tự ưu tiên xếp hạng — thấp hơn = nghiêm trọng hơn = hiện trước. Tài liệu hoá tường minh để
 * không ai phải đoán "tại sao dự án A đứng trước dự án B" (spec: không tạo AI score không giải
 * thích được). */
const REASON_RANK: Record<ProjectAttentionItem['reasonCategory'], number> = {
  'overdue-critical-issue': 0,
  delayed: 1,
  'at-risk': 2,
  'stale-data': 3,
  'budget-exposure': 4,
};

function pickPrimaryReason(
  projectId: string,
  assessment: ReturnType<typeof assessPortfolio>,
): ProjectAttentionItem['reasonCategory'] | null {
  const projectBusinessAlerts = assessment.businessAlerts.filter((a) => a.projectId === projectId);
  const projectQualityIssues = assessment.qualityIssues.filter(
    (i) => i.entityType === 'project' && i.entityId === projectId,
  );

  const candidates: ProjectAttentionItem['reasonCategory'][] = [];
  if (projectBusinessAlerts.some((a) => a.category === 'overdue-critical-issue'))
    candidates.push('overdue-critical-issue');
  if (projectBusinessAlerts.some((a) => a.category === 'schedule-delay'))
    candidates.push('delayed');
  if (projectBusinessAlerts.some((a) => a.category === 'at-risk')) candidates.push('at-risk');
  if (projectQualityIssues.some((i) => i.rule === 'stale-data')) candidates.push('stale-data');
  if (projectBusinessAlerts.some((a) => a.category === 'budget-exposure'))
    candidates.push('budget-exposure');

  if (candidates.length === 0) return null;
  return candidates.sort((a, b) => REASON_RANK[a] - REASON_RANK[b])[0];
}

function buildPriorityProjects(
  bundles: readonly ProjectBundle[],
  assessment: ReturnType<typeof assessPortfolio>,
  asOf: Date,
): ProjectAttentionItem[] {
  const invalidProjectIds = new Set(
    assessment.validationErrors.filter((e) => e.entityType === 'project').map((e) => e.entityId),
  );

  const items = bundles
    .filter((b) => !invalidProjectIds.has(b.project.id))
    .map((bundle) => {
      const reasonCategory = pickPrimaryReason(bundle.project.id, assessment);
      if (!reasonCategory) return null;
      const item: ProjectAttentionItem = {
        projectId: bundle.project.id,
        projectName: bundle.project.name,
        projectCode: bundle.project.code,
        sector: bundle.project.sector,
        status: bundle.project.status,
        statusLabel: PROJECT_STATUS_LABELS[bundle.project.status],
        overallProgress: bundle.project.overallProgress,
        disbursementRate: disbursementRateKpi(bundle, asOf),
        primaryReason: AGENCY_ALERT_CATEGORY_LABEL[reasonCategory],
        reasonCategory,
        dataUpdatedAt: bundle.project.dataUpdatedAt,
        administrativeAreaCodes: bundle.project.administrativeAreaCodes,
        geometry: bundle.project.geometry,
      };
      return item;
    })
    .filter((item): item is ProjectAttentionItem => item !== null);

  return items
    .sort((a, b) => {
      const rankDiff = REASON_RANK[a.reasonCategory] - REASON_RANK[b.reasonCategory];
      if (rankDiff !== 0) return rankDiff;
      // Tie-break: dự án có exposure ngân sách lớn hơn (giải ngân cao hơn) nổi lên trước ở cùng
      // mức độ nghiêm trọng — càng nhiều tiền đang "chảy" trong một tình huống rủi ro thì càng
      // đáng chú ý trước.
      const aValue = a.disbursementRate.value ?? -1;
      const bValue = b.disbursementRate.value ?? -1;
      if (aValue !== bValue) return bValue - aValue;
      return a.projectId.localeCompare(b.projectId);
    })
    .slice(0, 5);
}

function buildAlerts(assessment: ReturnType<typeof assessPortfolio>): PortfolioAlert[] {
  const businessAlerts: PortfolioAlert[] = assessment.businessAlerts.map((alert) => ({
    id: alert.id,
    kind: 'business',
    severity: alert.severity,
    category: alert.category,
    message: alert.message,
    projectId: alert.projectId,
  }));
  const qualityAlerts: PortfolioAlert[] = assessment.qualityIssues.map((issue) => ({
    id: issue.id,
    kind: 'data-quality',
    severity: issue.severity === 'error' ? 'critical' : 'warning',
    category: issue.rule,
    message: issue.message,
    projectId: issue.entityType === 'project' ? issue.entityId : undefined,
  }));
  return [...businessAlerts, ...qualityAlerts];
}

function derivePortfolioStatus(
  alerts: PortfolioAlert[],
  sourceStatus: 'ok' | 'degraded',
): PortfolioStatus {
  if (sourceStatus === 'degraded') return 'degraded';
  if (alerts.some((a) => a.severity === 'critical')) return 'critical';
  if (alerts.length > 0) return 'attention';
  return 'healthy';
}

function buildStatusDistribution(bundles: readonly ProjectBundle[]): Record<ProjectStatus, number> {
  const distribution = Object.fromEntries(PROJECT_STATUSES.map((status) => [status, 0])) as Record<
    ProjectStatus,
    number
  >;
  for (const { project } of bundles) distribution[project.status] += 1;
  return distribution;
}

function buildDataHealth(
  bundles: readonly ProjectBundle[],
  context: DataQualityContext,
): DataHealthSummary {
  const summary = summarizeDataQuality(bundles, context);
  const confidenceBreakdown: DataHealthSummary['confidenceBreakdown'] = {
    verified: 0,
    high: 0,
    medium: 0,
    low: 0,
    unknown: 0,
  };
  for (const { project } of bundles) confidenceBreakdown[project.confidence] += 1;
  return { ...summary, confidenceBreakdown };
}

export function buildExecutiveOverview({
  bundles,
  context,
  sourceStatus = 'ok',
}: BuildExecutiveOverviewInput): ExecutiveOverviewModel {
  const { asOf } = context;
  const assessment = assessPortfolio(bundles, context);

  const validBundles = bundles.filter(
    (b) =>
      !assessment.validationErrors.some(
        (e) => e.entityType === 'project' && e.entityId === b.project.id,
      ),
  );

  const totalApprovedBudget = validBundles.reduce((sum, b) => sum + b.project.approvedBudget, 0);
  const totalDisbursed = validBundles.reduce((sum, b) => sum + b.project.disbursedAmount, 0);
  const totalBudgetCeiling = validBundles.reduce(
    (sum, b) => sum + (b.project.adjustedBudget ?? b.project.approvedBudget),
    0,
  );
  const allIssues = validBundles.flatMap((b) => b.issues);

  const alerts = buildAlerts(assessment);

  return {
    generatedAt: asOf.toISOString(),
    portfolioStatus: derivePortfolioStatus(alerts, sourceStatus),
    kpis: {
      totalProjects: availableKpi(
        bundles.length,
        'count',
        [],
        'Tổng số dự án trong danh mục.',
        asOf,
      ),
      totalApprovedBudget: availableKpi(
        totalApprovedBudget,
        'VND',
        [],
        'Tổng approvedBudget của các dự án hợp lệ.',
        asOf,
      ),
      disbursementRate:
        totalBudgetCeiling > 0
          ? availableKpi(
              (totalDisbursed / totalBudgetCeiling) * 100,
              '%',
              [],
              'Tổng disbursedAmount / tổng ngân sách hiệu lực (adjustedBudget hoặc approvedBudget) × 100.',
              asOf,
            )
          : {
              value: null,
              unit: '%',
              status: 'unavailable',
              calculatedAt: asOf.toISOString(),
              sourceDatasetIds: [],
              missingInputs: ['approvedBudget'],
              explanation:
                'Không có dự án nào có ngân sách hợp lệ để tính tỷ lệ giải ngân toàn danh mục.',
            },
      onTrackProjects: availableKpi(
        validBundles.filter((b) => b.project.status === 'active').length,
        'count',
        [],
        "Số dự án status='active' (không ở trạng thái rủi ro/chậm/tạm dừng).",
        asOf,
      ),
      atRiskProjects: availableKpi(
        validBundles.filter((b) => b.project.status === 'at-risk').length,
        'count',
        [],
        "Số dự án status='at-risk'.",
        asOf,
      ),
      delayedProjects: availableKpi(
        validBundles.filter((b) => b.project.status === 'delayed').length,
        'count',
        [],
        "Số dự án status='delayed'.",
        asOf,
      ),
      overdueIssues: overdueIssueCount(allIssues, asOf),
    },
    statusDistribution: buildStatusDistribution(validBundles),
    priorityProjects: buildPriorityProjects(validBundles, assessment, asOf),
    alerts,
    dataHealth: buildDataHealth(bundles, context),
  };
}
