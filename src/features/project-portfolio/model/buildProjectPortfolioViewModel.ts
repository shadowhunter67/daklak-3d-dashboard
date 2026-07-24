/**
 * Read-model cho Project Portfolio (Phase 2B1, spec D5) — theo đúng pattern
 * `buildExecutiveOverview.ts`: hàm thuần nhận `{ bundles, context }`-shaped input + `asOf` tường
 * minh (qua `context.asOf`), trả về một model đã sẵn sàng render. Component KHÔNG được tự chọn
 * snapshot/tính KPI/xếp hạng lý do cần chú ý — tất cả đi qua đây, tái dùng domain layer
 * (`disbursementRate`, `dataFreshness`, `assessPortfolio`, `pickPrimaryReason`) thay vì tính lại.
 */
import { dataFreshness, disbursementRate } from '../../../entities/project/kpi';
import { assessPortfolio } from '../../../entities/project/portfolioAssessment';
import {
  pickPrimaryReason,
  ATTENTION_REASON_LABEL,
} from '../../../entities/project/attentionReason';
import { PROJECT_SECTOR_LABELS, PROJECT_STATUS_LABELS } from '../../../entities/project/labels';
import type { ProjectBundle } from '../../../entities/project/types';
import type { DataQualityContext } from '../../../entities/project/validation/dataQualityRules';
import type {
  ProjectPortfolioFilterOption,
  ProjectPortfolioModel,
  ProjectPortfolioRow,
} from './projectPortfolioTypes';

export interface BuildProjectPortfolioInput {
  bundles: readonly ProjectBundle[];
  context: DataQualityContext;
}

function countBy<T extends string>(values: readonly T[]): Map<T, number> {
  const counts = new Map<T, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}

export function buildProjectPortfolioViewModel({
  bundles,
  context,
}: BuildProjectPortfolioInput): ProjectPortfolioModel {
  const { asOf } = context;
  const assessment = assessPortfolio(bundles, context);
  const invalidProjectIds = new Set(
    assessment.validationErrors.filter((e) => e.entityType === 'project').map((e) => e.entityId),
  );
  const validBundles = bundles.filter((b) => !invalidProjectIds.has(b.project.id));

  const rows: ProjectPortfolioRow[] = validBundles.map((bundle) => {
    const { project } = bundle;
    const reasonCategory = pickPrimaryReason(project.id, assessment);
    return {
      projectId: project.id,
      code: project.code,
      name: project.name,
      sector: project.sector,
      sectorLabel: PROJECT_SECTOR_LABELS[project.sector],
      status: project.status,
      statusLabel: PROJECT_STATUS_LABELS[project.status],
      plannedProgress: project.plannedProgress,
      overallProgress: project.overallProgress,
      disbursementRate: disbursementRate(bundle, asOf),
      plannedCompletionDate: project.plannedCompletionDate ?? null,
      dataFreshnessDays: dataFreshness(bundle, asOf),
      primaryReason: reasonCategory ? ATTENTION_REASON_LABEL[reasonCategory] : null,
      reasonCategory,
      administrativeAreaCodes: project.administrativeAreaCodes,
    };
  });

  const statusCounts = countBy(rows.map((r) => r.status));
  const sectorCounts = countBy(rows.map((r) => r.sector));
  const areaCounts = countBy(rows.flatMap((r) => r.administrativeAreaCodes));

  const statusOptions: ProjectPortfolioFilterOption[] = [...statusCounts.entries()]
    .map(([value, count]) => ({ value, label: PROJECT_STATUS_LABELS[value], count }))
    .sort((a, b) => a.label.localeCompare(b.label, 'vi'));
  const sectorOptions: ProjectPortfolioFilterOption[] = [...sectorCounts.entries()]
    .map(([value, count]) => ({ value, label: PROJECT_SECTOR_LABELS[value], count }))
    .sort((a, b) => a.label.localeCompare(b.label, 'vi'));
  const areaOptions: ProjectPortfolioFilterOption[] = [...areaCounts.entries()]
    .map(([value, count]) => ({ value, label: value, count }))
    .sort((a, b) => a.value.localeCompare(b.value, 'vi'));

  return {
    generatedAt: asOf.toISOString(),
    totalCount: rows.length,
    rows,
    filterOptions: { status: statusOptions, sector: sectorOptions, area: areaOptions },
  };
}
