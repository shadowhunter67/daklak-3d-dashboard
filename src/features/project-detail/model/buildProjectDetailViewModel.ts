/**
 * Read-model cho Project Detail (Phase 2B1, spec D5) — cùng nguyên tắc với
 * `buildProjectPortfolioViewModel.ts`: hàm thuần, không component nào tự chọn snapshot/tính
 * KPI/xếp hạng lý do/tra cứu provenance. `lookupProjectDetail` là điểm vào duy nhất — xử lý luôn
 * trường hợp "không tìm thấy dự án" (spec D4 loader requirement) để component không phải tự viết
 * logic tìm kiếm mảng.
 */
import {
  budgetVariance,
  disbursementRate,
  forecastDelayInDays,
  overdueIssueCount,
  scheduleVariance,
} from '../../../entities/project/kpi';
import { assessPortfolio } from '../../../entities/project/portfolioAssessment';
import {
  pickPrimaryReason,
  ATTENTION_REASON_LABEL,
} from '../../../entities/project/attentionReason';
import { PROJECT_SECTOR_LABELS, PROJECT_STATUS_LABELS } from '../../../entities/project/labels';
import { getDatasetById } from '../../../data-platform/catalog/datasets';
import type { ProjectBundle, ProjectIssue } from '../../../entities/project/types';
import type { DataQualityContext } from '../../../entities/project/validation/dataQualityRules';
import type { ProjectDetailLookupResult, ProjectDetailModel } from './projectDetailTypes';

const CONFIDENCE_LABEL: Record<string, string> = {
  verified: 'Đã xác thực',
  high: 'Cao',
  medium: 'Trung bình',
  low: 'Thấp',
  unknown: 'Chưa rõ',
};

const ISSUE_SEVERITIES: ProjectIssue['severity'][] = ['critical', 'high', 'medium', 'low'];

export interface LookupProjectDetailInput {
  bundles: readonly ProjectBundle[];
  context: DataQualityContext;
  projectId: string;
}

function groupIssuesBySeverity(
  issues: readonly ProjectIssue[],
): Record<ProjectIssue['severity'], ProjectIssue[]> {
  const grouped: Record<ProjectIssue['severity'], ProjectIssue[]> = {
    critical: [],
    high: [],
    medium: [],
    low: [],
  };
  for (const issue of issues) grouped[issue.severity].push(issue);
  for (const severity of ISSUE_SEVERITIES) {
    grouped[severity].sort((a, b) => a.openedAt.localeCompare(b.openedAt));
  }
  return grouped;
}

export function lookupProjectDetail({
  bundles,
  context,
  projectId,
}: LookupProjectDetailInput): ProjectDetailLookupResult {
  const bundle = bundles.find((b) => b.project.id === projectId);
  if (!bundle) return { status: 'not-found' };

  const { asOf } = context;
  const { project } = bundle;
  const assessment = assessPortfolio(bundles, context);
  const isInvalid = assessment.validationErrors.some(
    (e) => e.entityType === 'project' && e.entityId === projectId,
  );
  if (isInvalid) return { status: 'not-found' };

  const reasonCategory = pickPrimaryReason(projectId, assessment);
  const attentionReasons = reasonCategory
    ? [{ category: reasonCategory, label: ATTENTION_REASON_LABEL[reasonCategory] }]
    : [];

  const dataQualityIssueCount = assessment.qualityIssues.filter(
    (i) => i.entityType === 'project' && i.entityId === projectId,
  ).length;

  const sourceDatasetIds = new Set<string>([
    project.sourceDatasetId,
    ...bundle.progressSnapshots.map((s) => s.sourceDatasetId),
    ...bundle.issues.map((i) => i.sourceDatasetId),
  ]);

  const model: ProjectDetailModel = {
    generatedAt: asOf.toISOString(),
    header: {
      projectId: project.id,
      code: project.code,
      name: project.name,
      sector: project.sector,
      sectorLabel: PROJECT_SECTOR_LABELS[project.sector],
      status: project.status,
      statusLabel: PROJECT_STATUS_LABELS[project.status],
      priority: project.priority,
      dataUpdatedAt: project.dataUpdatedAt,
      confidence: project.confidence,
      confidenceLabel: CONFIDENCE_LABEL[project.confidence] ?? project.confidence,
    },
    summary: {
      approvedBudget: project.approvedBudget,
      adjustedBudget: project.adjustedBudget ?? null,
      disbursedAmount: project.disbursedAmount,
      disbursementRate: disbursementRate(bundle, asOf),
      overallProgress: project.overallProgress,
      plannedProgress: project.plannedProgress,
      scheduleVariance: scheduleVariance(bundle, asOf),
      budgetVariance: budgetVariance(bundle, asOf),
      plannedCompletionDate: project.plannedCompletionDate ?? null,
      forecastCompletionDate: project.forecastCompletionDate ?? null,
      forecastDelayInDays: forecastDelayInDays(bundle, asOf),
    },
    attentionReasons,
    workPackages: [...bundle.workPackages].sort((a, b) =>
      a.plannedStart.localeCompare(b.plannedStart),
    ),
    milestones: [...bundle.milestones].sort((a, b) => a.plannedDate.localeCompare(b.plannedDate)),
    progressHistory: [...bundle.progressSnapshots]
      .sort((a, b) => a.observedAt.localeCompare(b.observedAt))
      .map((s) => ({
        observedAt: s.observedAt,
        plannedPhysicalProgress: s.plannedPhysicalProgress,
        physicalProgress: s.physicalProgress,
        financialProgress: s.financialProgress,
      })),
    issues: {
      all: bundle.issues,
      bySeverity: groupIssuesBySeverity(bundle.issues),
      overdueIssueCount: overdueIssueCount(bundle.issues, asOf),
    },
    geography: {
      administrativeAreaCodes: project.administrativeAreaCodes,
      geometry: project.geometry ?? null,
      hasGeometry: Boolean(project.geometry),
    },
    provenance: [...sourceDatasetIds].map((id) => ({
      sourceDatasetId: id,
      dataset: getDatasetById(id) ?? null,
    })),
    dataQualityIssueCount,
  };

  return { status: 'found', model };
}
