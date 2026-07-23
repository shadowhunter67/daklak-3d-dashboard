/**
 * Ba nhóm kết quả tách biệt cho một tập ProjectBundle (Phase 1.5 hardening — spec §3):
 *
 * - `validationErrors`: record hoặc quan hệ không hợp lệ (từ `validateProject.ts`) — dữ liệu SAI,
 *   không nên dùng để tính KPI.
 * - `qualityIssues`: dữ liệu ĐÚNG nhưng đáng chú ý về mặt chất lượng (từ `dataQualityRules.ts`) —
 *   stale, thiếu trường tuỳ chọn, mã hành chính không map được, trùng snapshot...
 * - `businessAlerts`: tình trạng NGHIỆP VỤ của một dự án hợp lệ — chậm tiến độ, vướng mắc quá hạn,
 *   nguy cơ vượt ngân sách. Một dự án chậm tiến độ không phải "invalid data" — nó là dữ liệu hoàn
 *   toàn hợp lệ đang mô tả một tình trạng xấu; nhầm hai khái niệm này sẽ khiến UI dashboard hiển thị
 *   dự án đang có vấn đề thật như thể dữ liệu bị lỗi.
 */
import type { DataQualityIssue, ProjectBundle, ProjectIssue } from './types';
import { runDataQualityRules, type DataQualityContext } from './validation/dataQualityRules';
import {
  validateMilestoneRecord,
  validateProgressSnapshotRecord,
  validateProjectIssueRecord,
  validateProjectRecord,
  validateWorkPackageRecord,
} from './validation/validateProject';

export interface ValidationError {
  id: string;
  entityType: DataQualityIssue['entityType'];
  entityId: string;
  message: string;
}

export type ProjectAlertSeverity = 'critical' | 'warning';

export type ProjectAlertCategory =
  'schedule-delay' | 'at-risk' | 'suspended' | 'overdue-critical-issue' | 'budget-exposure';

export interface ProjectAlert {
  id: string;
  projectId: string;
  severity: ProjectAlertSeverity;
  category: ProjectAlertCategory;
  message: string;
  /** ISO timestamp — luôn bằng `asOf` truyền vào `assessPortfolio`, không phải thời điểm thực thi. */
  detectedAt: string;
}

export interface PortfolioAssessment {
  validationErrors: ValidationError[];
  qualityIssues: DataQualityIssue[];
  businessAlerts: ProjectAlert[];
  asOf: string;
}

function collectValidationErrors(bundle: ProjectBundle): ValidationError[] {
  const errors: ValidationError[] = [];
  const push = (
    entityType: ValidationError['entityType'],
    entityId: string,
    messages: string[],
  ) => {
    for (const message of messages)
      errors.push({
        id: `${entityType}:${entityId}:${errors.length}`,
        entityType,
        entityId,
        message,
      });
  };

  push('project', bundle.project.id, validateProjectRecord(bundle.project));
  for (const wp of bundle.workPackages) push('workPackage', wp.id, validateWorkPackageRecord(wp));
  for (const ms of bundle.milestones) push('milestone', ms.id, validateMilestoneRecord(ms));
  for (const iss of bundle.issues) push('issue', iss.id, validateProjectIssueRecord(iss));
  for (const snap of bundle.progressSnapshots)
    push(
      'progressSnapshot',
      `${snap.projectId}@${snap.observedAt}`,
      validateProgressSnapshotRecord(snap),
    );

  return errors;
}

function isOverdueOpenIssue(issue: ProjectIssue, asOf: Date): boolean {
  if (!issue.dueAt) return false;
  if (issue.status === 'resolved' || issue.status === 'closed') return false;
  return new Date(issue.dueAt).getTime() < asOf.getTime();
}

/**
 * Ngưỡng "giải ngân nhanh hơn khối lượng thực hiện" tính bằng điểm phần trăm — được chọn làm
 * ngưỡng cảnh báo rủi ro tạm ứng vượt khối lượng, không phải một con số tuyệt đối chính xác về mặt
 * tài chính. 15 điểm được chọn vì đây là mức lệch đủ lớn để loại trừ sai số làm tròn/độ trễ báo cáo
 * thông thường (thường dưới 5 điểm trong dữ liệu minh hoạ), không phải một hằng số đã kiểm định
 * bằng dữ liệu thật — cần xem lại khi có nguồn dữ liệu vận hành thật.
 */
const BUDGET_EXPOSURE_VARIANCE_THRESHOLD_POINTS = 15;

function collectBusinessAlerts(bundle: ProjectBundle, asOf: Date): ProjectAlert[] {
  const alerts: ProjectAlert[] = [];
  const { project, issues } = bundle;
  const detectedAt = asOf.toISOString();
  const push = (
    category: ProjectAlertCategory,
    severity: ProjectAlertSeverity,
    message: string,
    key: string,
  ) =>
    alerts.push({
      id: `${project.id}:${category}:${key}`,
      projectId: project.id,
      severity,
      category,
      message,
      detectedAt,
    });

  if (project.status === 'suspended')
    push('suspended', 'critical', `Dự án đang tạm dừng (status=suspended).`, 'status');
  else if (project.status === 'delayed')
    push('schedule-delay', 'critical', `Dự án đang chậm tiến độ (status=delayed).`, 'status');
  else if (project.status === 'at-risk')
    push('at-risk', 'warning', `Dự án có nguy cơ chậm tiến độ (status=at-risk).`, 'status');

  for (const issue of issues) {
    if (issue.severity === 'critical' && isOverdueOpenIssue(issue, asOf))
      push(
        'overdue-critical-issue',
        'critical',
        `Vướng mắc mức độ nghiêm trọng đã quá hạn xử lý: "${issue.title}" (hạn ${issue.dueAt}).`,
        issue.id,
      );
  }

  if (project.financialProgress != null && project.overallProgress != null) {
    const variance = project.financialProgress - project.overallProgress;
    if (variance > BUDGET_EXPOSURE_VARIANCE_THRESHOLD_POINTS)
      push(
        'budget-exposure',
        'warning',
        `Tiến độ giải ngân (${project.financialProgress}%) vượt tiến độ khối lượng (${project.overallProgress}%) hơn ${BUDGET_EXPOSURE_VARIANCE_THRESHOLD_POINTS} điểm phần trăm — rủi ro tạm ứng vượt khối lượng thực hiện.`,
        'financial-vs-physical',
      );
  }

  return alerts;
}

/** `context.asOf` bắt buộc (không `new Date()` ngầm) — xem `DataQualityContext`. */
export function assessPortfolio(
  bundles: readonly ProjectBundle[],
  context: DataQualityContext,
): PortfolioAssessment {
  return {
    validationErrors: bundles.flatMap(collectValidationErrors),
    qualityIssues: runDataQualityRules(bundles, context),
    businessAlerts: bundles.flatMap((bundle) => collectBusinessAlerts(bundle, context.asOf)),
    asOf: context.asOf.toISOString(),
  };
}
