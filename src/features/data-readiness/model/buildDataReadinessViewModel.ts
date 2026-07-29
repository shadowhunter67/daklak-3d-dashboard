/**
 * Data Readiness view model — Phase 5 §C (docs/adr/0008-*.md). Không tự tính lại business rule nào
 * — chỉ gọi lại `validateProjectRecord`/.../`runDataQualityRules` (đã có, Phase 1/1.5) và phân loại
 * kết quả thành 3 nhóm UI phải phân biệt rõ (spec §C3): validation error (Layer 2, structural),
 * data-quality issue (Layer 3 severity=error), business alert (Layer 3 severity=warning — KHÔNG bao
 * giờ hiển thị như lỗi, xem `dataHealth.ts`/`dataQualityRules.ts`).
 */
import type { DataQualityIssue, ProjectBundle } from '../../../entities/project/types';
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
import type { DataReadinessIssueWithProjectLink, DataReadinessModel } from './dataReadinessTypes';

/**
 * Phase 6 (C6) — resolve projectId thật cho một `DataQualityIssue` để Data Readiness có thể điều
 * hướng thẳng sang Project Detail. KHÔNG suy đoán: chỉ trả một id khi id đó THẬT SỰ tồn tại trong
 * `bundles` — nếu không resolve được, trả `null` (component phải không render link trong trường hợp
 * này, xem C6 "Không tạo dead link cho issue không gắn project").
 *
 * `entityId` cho `progressSnapshot` có hai định dạng tuỳ rule sinh ra nó (xem dataQualityRules.ts):
 * `${projectId}@${observedAt}` (dangling-project-reference) hoặc identity key
 * `${projectId}::${observedAt}::${sourceDatasetId}` (duplicate/multiple-verification-stage) — cả hai
 * đều bắt đầu bằng projectId, tách bằng ký tự đầu tiên trong `@`/`::`.
 */
function resolveIssueProjectId(
  bundles: readonly ProjectBundle[],
  issue: DataQualityIssue,
): string | null {
  const projectIds = new Set(bundles.map((b) => b.project.id));

  if (issue.entityType === 'project') {
    return projectIds.has(issue.entityId) ? issue.entityId : null;
  }
  if (issue.entityType === 'progressSnapshot') {
    const candidateProjectId = issue.entityId.split(/@|::/)[0];
    return projectIds.has(candidateProjectId) ? candidateProjectId : null;
  }
  for (const bundle of bundles) {
    if (
      issue.entityType === 'workPackage' &&
      bundle.workPackages.some((wp) => wp.id === issue.entityId)
    )
      return bundle.project.id;
    if (
      issue.entityType === 'milestone' &&
      bundle.milestones.some((ms) => ms.id === issue.entityId)
    )
      return bundle.project.id;
    if (issue.entityType === 'issue' && bundle.issues.some((i) => i.id === issue.entityId))
      return bundle.project.id;
  }
  return null;
}

function withProjectLink(
  bundles: readonly ProjectBundle[],
  issues: readonly DataQualityIssue[],
): DataReadinessIssueWithProjectLink[] {
  return issues.map((issue) => ({
    ...issue,
    linkedProjectId: resolveIssueProjectId(bundles, issue),
  }));
}

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
  const dataQualityIssues = withProjectLink(
    bundles,
    qualityIssues.filter((i) => i.severity === 'error'),
  );
  const businessAlerts = withProjectLink(
    bundles,
    qualityIssues.filter((i) => i.severity === 'warning'),
  );
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
