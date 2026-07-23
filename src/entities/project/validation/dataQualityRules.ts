/**
 * Cross-record data-quality rules cho domain Project — khác với `validateProject.ts`
 * (kiểm tra một record độc lập), các rule ở đây cần nhìn toàn bộ tập `ProjectBundle` cùng lúc:
 * tham chiếu tồn tại, mã hành chính hợp lệ, trùng khoá chính, dữ liệu cũ (stale) theo SLA.
 *
 * Trả về `DataQualityIssue[]` thay vì throw — UI data-quality (Phase 2) hiển thị trực tiếp danh
 * sách này, không phải để chặn build (khác với `validateProjectRecord`, dùng cho `npm test`).
 */
import type { Agency, Contractor, DataQualityIssue, Evidence, ProjectBundle } from '../types';
import { groupSnapshotsByIdentity } from './progressSnapshotSelection';

const DEFAULT_FRESHNESS_SLA_MS = 90 * 24 * 60 * 60 * 1000; // 90 ngày — mặc định cho mock/demo.

export interface DataQualityContext {
  validAdministrativeCodes: ReadonlySet<string>;
  agencies?: readonly Agency[];
  contractors?: readonly Contractor[];
  evidence?: readonly Evidence[];
  /** Bắt buộc, không có giá trị mặc định — domain layer không được tự gọi `new Date()` (Phase 1.5
   * hardening). Caller (adapter/UI, Phase 2A) chịu trách nhiệm cung cấp thời điểm tính toán. */
  asOf: Date;
  /** SLA độ mới dữ liệu — mỗi dự án có thể có nhịp cập nhật khác nhau; mặc định 90 ngày khi không
   * khai báo, giống tinh thần `computeFreshness` trong data-platform (không đoán một ngưỡng toàn
   * cục duy nhất, nhưng domain này chưa có refreshPolicy per-project nên dùng một default rõ ràng,
   * ghi chú thành hằng số thay vì số ma thuật rải rác). */
  freshnessSlaMs?: number;
}

function findDuplicateIds(ids: readonly string[]): Set<string> {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const id of ids) {
    if (!id) continue;
    if (seen.has(id)) duplicates.add(id);
    seen.add(id);
  }
  return duplicates;
}

function issue(
  entityType: DataQualityIssue['entityType'],
  entityId: string,
  rule: string,
  message: string,
  severity: DataQualityIssue['severity'] = 'error',
): DataQualityIssue {
  return { id: `${entityType}:${entityId}:${rule}`, entityType, entityId, rule, message, severity };
}

export function runDataQualityRules(
  bundles: readonly ProjectBundle[],
  context: DataQualityContext,
): DataQualityIssue[] {
  const issues: DataQualityIssue[] = [];
  const { asOf } = context;
  const freshnessSlaMs = context.freshnessSlaMs ?? DEFAULT_FRESHNESS_SLA_MS;
  const agencyIds = new Set((context.agencies ?? []).map((a) => a.id));
  const contractorIds = new Set((context.contractors ?? []).map((c) => c.id));
  const evidenceIds = new Set((context.evidence ?? []).map((e) => e.id));

  const projectIds = new Set(bundles.map((b) => b.project.id));

  // Rule §11: duplicate primary key.
  const duplicateProjectIds = findDuplicateIds(bundles.map((b) => b.project.id));
  for (const id of duplicateProjectIds)
    issues.push(issue('project', id, 'duplicate-primary-key', `Trùng project id: ${id}`));

  const allWorkPackageIds = bundles.flatMap((b) => b.workPackages.map((wp) => wp.id));
  for (const id of findDuplicateIds(allWorkPackageIds))
    issues.push(issue('workPackage', id, 'duplicate-primary-key', `Trùng work package id: ${id}`));

  const allMilestoneIds = bundles.flatMap((b) => b.milestones.map((m) => m.id));
  for (const id of findDuplicateIds(allMilestoneIds))
    issues.push(issue('milestone', id, 'duplicate-primary-key', `Trùng milestone id: ${id}`));

  const allIssueIds = bundles.flatMap((b) => b.issues.map((i) => i.id));
  for (const id of findDuplicateIds(allIssueIds))
    issues.push(issue('issue', id, 'duplicate-primary-key', `Trùng issue id: ${id}`));

  for (const bundle of bundles) {
    const { project, workPackages, milestones, issues: projectIssues, progressSnapshots } = bundle;
    const workPackageIds = new Set(workPackages.map((wp) => wp.id));

    // Rule §7: administrative code phải tồn tại.
    for (const code of project.administrativeAreaCodes) {
      if (!context.validAdministrativeCodes.has(code))
        issues.push(
          issue(
            'project',
            project.id,
            'unmapped-administrative-code',
            `Mã hành chính không tồn tại: ${code}`,
          ),
        );
    }

    if (agencyIds.size && !agencyIds.has(project.managingAuthorityId))
      issues.push(
        issue(
          'project',
          project.id,
          'unknown-managing-authority',
          `managingAuthorityId không tồn tại: ${project.managingAuthorityId}`,
        ),
      );
    if (agencyIds.size && !agencyIds.has(project.investorId))
      issues.push(
        issue(
          'project',
          project.id,
          'unknown-investor',
          `investorId không tồn tại: ${project.investorId}`,
        ),
      );

    // Rule §9: stale data theo freshness SLA. Dự án đã completed/cancelled không còn cập nhật
    // theo nhịp vận hành nữa — dataUpdatedAt cũ là đúng bản chất, không phải dữ liệu "cũ" cần cảnh
    // báo (khác với freshness của dataset đang active, nơi dataUpdatedAt cũ thực sự đáng ngờ).
    const isStaticStatus = project.status === 'completed' || project.status === 'cancelled';
    const updatedAtMs = new Date(project.dataUpdatedAt).getTime();
    if (
      !isStaticStatus &&
      !Number.isNaN(updatedAtMs) &&
      asOf.getTime() - updatedAtMs > freshnessSlaMs
    )
      issues.push(
        issue(
          'project',
          project.id,
          'stale-data',
          `Dữ liệu dự án chưa cập nhật quá ${Math.round(freshnessSlaMs / (24 * 60 * 60 * 1000))} ngày (lần cuối: ${project.dataUpdatedAt})`,
          'warning',
        ),
      );

    for (const workPackage of workPackages) {
      // Rule §5: work package phải tham chiếu project tồn tại.
      if (!projectIds.has(workPackage.projectId))
        issues.push(
          issue(
            'workPackage',
            workPackage.id,
            'dangling-project-reference',
            `projectId không tồn tại: ${workPackage.projectId}`,
          ),
        );
      if (
        workPackage.contractorId &&
        contractorIds.size &&
        !contractorIds.has(workPackage.contractorId)
      )
        issues.push(
          issue(
            'workPackage',
            workPackage.id,
            'unknown-contractor',
            `contractorId không tồn tại: ${workPackage.contractorId}`,
          ),
        );
    }

    for (const milestone of milestones) {
      // Rule §6: milestone phải tham chiếu project tồn tại.
      if (!projectIds.has(milestone.projectId))
        issues.push(
          issue(
            'milestone',
            milestone.id,
            'dangling-project-reference',
            `projectId không tồn tại: ${milestone.projectId}`,
          ),
        );
      if (milestone.workPackageId && !workPackageIds.has(milestone.workPackageId))
        issues.push(
          issue(
            'milestone',
            milestone.id,
            'dangling-work-package-reference',
            `workPackageId không tồn tại: ${milestone.workPackageId}`,
          ),
        );
    }

    for (const projectIssue of projectIssues) {
      if (!projectIds.has(projectIssue.projectId))
        issues.push(
          issue(
            'issue',
            projectIssue.id,
            'dangling-project-reference',
            `projectId không tồn tại: ${projectIssue.projectId}`,
          ),
        );
      for (const evidenceId of projectIssue.evidenceIds) {
        if (evidenceIds.size && !evidenceIds.has(evidenceId))
          issues.push(
            issue(
              'issue',
              projectIssue.id,
              'unknown-evidence',
              `evidenceId không tồn tại: ${evidenceId}`,
            ),
          );
      }
    }

    for (const snapshot of progressSnapshots) {
      if (!projectIds.has(snapshot.projectId))
        issues.push(
          issue(
            'progressSnapshot',
            `${snapshot.projectId}@${snapshot.observedAt}`,
            'dangling-project-reference',
            `projectId không tồn tại: ${snapshot.projectId}`,
          ),
        );
    }

    // Rule §6 (spec Phase 1.5): identity = projectId + observedAt + sourceDatasetId (xem
    // progressSnapshotSelection.ts). Cùng identity với cùng sourceRecordId là trùng lặp thật
    // (severity error, ví dụ lỗi import lặp); cùng identity nhưng khác sourceRecordId là nhiều
    // giai đoạn xác thực hợp lệ của cùng một lần quan sát (severity warning) —
    // `selectAuthoritativeSnapshot` chọn bản ghi dùng cho KPI, không phải lỗi dữ liệu.
    for (const [key, group] of groupSnapshotsByIdentity(progressSnapshots)) {
      if (group.length <= 1) continue;
      const distinctRecordIds = new Set(group.map((s) => s.sourceRecordId));
      if (distinctRecordIds.size === 1) {
        issues.push(
          issue(
            'progressSnapshot',
            key,
            'duplicate-primary-key',
            `Trùng progress snapshot (cùng projectId+observedAt+sourceDatasetId+sourceRecordId): ${key}`,
          ),
        );
      } else {
        issues.push(
          issue(
            'progressSnapshot',
            key,
            'multiple-verification-stage-records',
            `Nhiều bản ghi cho cùng identity (${key}) ở các giai đoạn xác thực khác nhau — dùng selectAuthoritativeSnapshot để chọn bản ghi tính KPI.`,
            'warning',
          ),
        );
      }
    }
  }

  return issues;
}
