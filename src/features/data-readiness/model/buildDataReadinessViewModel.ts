/**
 * Data Readiness view model — Phase 5 §C (docs/adr/0008-*.md). Không tự tính lại business rule nào
 * — chỉ gọi lại `validateProjectRecord`/.../`runDataQualityRules` (đã có, Phase 1/1.5) và phân loại
 * kết quả thành 3 nhóm UI phải phân biệt rõ (spec §C3): validation error (Layer 2, structural),
 * data-quality issue (Layer 3 severity=error), business alert (Layer 3 severity=warning — KHÔNG bao
 * giờ hiển thị như lỗi, xem `dataHealth.ts`/`dataQualityRules.ts`).
 */
import type { ProjectBundle } from '../../../entities/project/types';
import {
  validateMilestoneRecord,
  validateProgressSnapshotRecord,
  validateProjectIssueRecord,
  validateProjectRecord,
  validateWorkPackageRecord,
} from '../../../entities/project/validation/validateProject';
import {
  runDataQualityRules,
  type DataQualityContext,
} from '../../../entities/project/validation/dataQualityRules';
import { summarizeDataQuality } from '../../../entities/project/dataQualitySummary';
import type { ProjectPortfolioSourceMetadata } from '../../../entities/project/adapters/ProjectPortfolioSource';
import type { DataReadinessModel } from './dataReadinessTypes';

/** `unverified` = chưa qua bước xác thực có ý nghĩa (raw/validated-automatically) — KHÔNG gồm
 * submitted/reviewed/approved (đã có ai đó xác nhận, dù chưa phải approved cuối cùng). */
const UNVERIFIED_STATUSES = new Set(['raw', 'validated-automatically']);

export function buildDataReadinessViewModel(params: {
  bundles: readonly ProjectBundle[];
  metadata: ProjectPortfolioSourceMetadata;
  context: DataQualityContext;
}): DataReadinessModel {
  const { bundles, metadata, context } = params;

  const validationErrors: string[] = [];
  let workPackageCount = 0;
  let milestoneCount = 0;
  let issueCount = 0;
  let progressSnapshotCount = 0;
  let missingProvenanceChildCount = 0;

  for (const bundle of bundles) {
    validationErrors.push(...validateProjectRecord(bundle.project));
    for (const wp of bundle.workPackages) {
      workPackageCount += 1;
      validationErrors.push(...validateWorkPackageRecord(wp));
      if (!wp.sourceDatasetId) missingProvenanceChildCount += 1;
    }
    for (const ms of bundle.milestones) {
      milestoneCount += 1;
      validationErrors.push(...validateMilestoneRecord(ms));
      if (!ms.sourceDatasetId) missingProvenanceChildCount += 1;
    }
    for (const iss of bundle.issues) {
      issueCount += 1;
      validationErrors.push(...validateProjectIssueRecord(iss));
    }
    for (const snap of bundle.progressSnapshots) {
      progressSnapshotCount += 1;
      validationErrors.push(...validateProgressSnapshotRecord(snap));
    }
  }

  const qualityIssues = runDataQualityRules(bundles, context);
  const dataQualityIssues = qualityIssues.filter((i) => i.severity === 'error');
  const businessAlerts = qualityIssues.filter((i) => i.severity === 'warning');
  const summary = summarizeDataQuality(bundles, context);

  const lowConfidenceProjectCount = bundles.filter((b) => b.project.confidence === 'low').length;
  const unverifiedProjectCount = bundles.filter((b) =>
    UNVERIFIED_STATUSES.has(b.project.verificationStatus),
  ).length;

  return {
    metadata,
    asOf: context.asOf.toISOString(),
    counts: {
      projects: bundles.length,
      workPackages: workPackageCount,
      milestones: milestoneCount,
      issues: issueCount,
      progressSnapshots: progressSnapshotCount,
    },
    validationErrors,
    dataQualityIssues,
    businessAlerts,
    staleProjectCount: summary.staleProjectCount,
    duplicateRecordCount: summary.duplicateRecordCount,
    unmappedAdministrativeCodeCount: summary.unmappedAdministrativeCodeCount,
    lowConfidenceProjectCount,
    unverifiedProjectCount,
    missingProvenanceChildCount,
  };
}
