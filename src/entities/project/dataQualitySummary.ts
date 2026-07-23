/**
 * Tổng hợp data-quality cho UI (Phase 2's `data-quality` feature sẽ tiêu thụ shape này trực tiếp).
 * Gộp kết quả của `validateProject.ts` (per-record) và `dataQualityRules.ts` (cross-record) thành
 * một bộ đếm duy nhất, theo đúng danh sách spec yêu cầu: valid/invalid/stale/missing/duplicate/
 * unmapped administrative codes/source availability.
 */
import type { ProjectBundle } from './types';
import {
  validateMilestoneRecord,
  validateProgressSnapshotRecord,
  validateProjectIssueRecord,
  validateProjectRecord,
  validateWorkPackageRecord,
} from './validation/validateProject';
import { runDataQualityRules, type DataQualityContext } from './validation/dataQualityRules';

export interface DataQualitySummary {
  totalProjects: number;
  validProjects: number;
  invalidProjects: number;
  staleProjectCount: number;
  duplicateRecordCount: number;
  unmappedAdministrativeCodeCount: number;
  missingRequiredFieldIssueCount: number;
  /** Tổng số vấn đề cross-record (bao gồm cả các loại trên) — dùng cho badge tổng quan. */
  totalDataQualityIssues: number;
  /** true nếu mọi project trong tập đều load được (không có bundle bị thiếu/degraded) — placeholder
   * cho khi có adapter thật trả `degraded`/`error` (Phase 3); với fixture tĩnh luôn là true. */
  sourceAvailable: boolean;
  calculatedAt: string;
}

export function summarizeDataQuality(
  bundles: readonly ProjectBundle[],
  context: DataQualityContext,
  now: Date = context.now ?? new Date(),
): DataQualitySummary {
  const perRecordErrorsByProject = new Map<string, string[]>();
  for (const bundle of bundles) {
    const errors: string[] = [
      ...validateProjectRecord(bundle.project),
      ...bundle.workPackages.flatMap(validateWorkPackageRecord),
      ...bundle.milestones.flatMap(validateMilestoneRecord),
      ...bundle.issues.flatMap(validateProjectIssueRecord),
      ...bundle.progressSnapshots.flatMap(validateProgressSnapshotRecord),
    ];
    perRecordErrorsByProject.set(bundle.project.id, errors);
  }

  const invalidProjects = [...perRecordErrorsByProject.values()].filter(
    (errors) => errors.length > 0,
  ).length;
  const missingRequiredFieldIssueCount = [...perRecordErrorsByProject.values()].reduce(
    (sum, errors) => sum + errors.length,
    0,
  );

  const crossRecordIssues = runDataQualityRules(bundles, { ...context, now });
  const staleProjectCount = crossRecordIssues.filter((i) => i.rule === 'stale-data').length;
  const duplicateRecordCount = crossRecordIssues.filter(
    (i) => i.rule === 'duplicate-primary-key',
  ).length;
  const unmappedAdministrativeCodeCount = crossRecordIssues.filter(
    (i) => i.rule === 'unmapped-administrative-code',
  ).length;

  return {
    totalProjects: bundles.length,
    validProjects: bundles.length - invalidProjects,
    invalidProjects,
    staleProjectCount,
    duplicateRecordCount,
    unmappedAdministrativeCodeCount,
    missingRequiredFieldIssueCount,
    totalDataQualityIssues: missingRequiredFieldIssueCount + crossRecordIssues.length,
    sourceAvailable: true,
    calculatedAt: now.toISOString(),
  };
}
