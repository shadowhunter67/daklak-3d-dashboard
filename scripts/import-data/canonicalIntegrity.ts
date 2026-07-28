/**
 * Reusable canonical referential-integrity validator — Phase 5 (docs/adr/0008-*.md). Extracted from
 * Phase 4's `checkOrphanedProjectReferences` (ADR 0007 quyết định 4) và mở rộng để phủ mọi tham
 * chiếu/duplicate-ID theo yêu cầu Phase 5 §A2 — CHẠY TRÊN `CanonicalProjectPortfolioDatasets` THÔ,
 * TRƯỚC `groupCanonicalDatasetsIntoProjectBundles` (Phase 3, không viết lại).
 *
 * Lý do phải chạy trước mapper (không phải sau, như `dataQualityRules.ts` — Phase 1.5, cũng không
 * viết lại): mapper nhóm record con THEO `projectId` — một record có `projectId` không khớp bất kỳ
 * project nào bị loại khỏi MỌI `ProjectBundle`, không lỗi không cảnh báo ở tầng mapper (thiết kế
 * Phase 3 đúng ý đồ — mapper chỉ "group", không validate). Hệ quả: MỌI rule trong
 * `dataQualityRules.ts` vận hành trên `bundle.workPackages`/`bundle.milestones`/... (đã lọc theo
 * mapper) không bao giờ nhìn thấy một record orphan thật — kể cả duplicate-ID hay
 * duplicate-progress-identity của MỘT record orphan cũng lọt lưới theo cách tương tự. Function này
 * là nguồn xác thực DUY NHẤT cho các rule liệt kê dưới đây (importer dùng nó thay vì phần tương ứng
 * của `dataQualityRules.ts` — xem `pipeline.ts` lọc `qualityIssues` để tránh báo trùng); các rule
 * KHÔNG bị ảnh hưởng bởi khoảng trống orphan (`unmapped-administrative-code` — đọc trực tiếp
 * `project.administrativeAreaCodes`, không phụ thuộc con nào; `stale-data` — tương tự) vẫn tiếp tục
 * là trách nhiệm của `dataQualityRules.ts`, không trùng lặp ở đây.
 *
 * KHÔNG viết lại `selectAuthoritativeSnapshot`/business rule nào — chỉ dùng
 * `groupSnapshotsByIdentity`/`isUsableForKpi` (đã có, Phase 1.5) để phát hiện trùng lặp/multi-stage,
 * không tự quyết định bản ghi nào "đúng".
 */
import type { CanonicalProjectPortfolioDatasets } from '../../src/entities/project/canonicalBundle';
import { groupSnapshotsByIdentity } from '../../src/entities/project/validation/progressSnapshotSelection';
import type { ImportIssue } from './errorCodes';

function findDuplicates(ids: readonly string[]): Set<string> {
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
  dataset: string,
  recordId: string,
  message: string,
  code: ImportIssue['code'] = 'foreign-key-unresolved',
): ImportIssue {
  return { code, severity: 'error', layer: 'quality', dataset, recordId, message };
}

export function validateCanonicalReferentialIntegrity(
  datasets: CanonicalProjectPortfolioDatasets,
): ImportIssue[] {
  const issues: ImportIssue[] = [];
  const projectIds = new Set(datasets.projects.map((p) => p.id));
  const workPackageIds = new Set(datasets.workPackages.map((wp) => wp.id));
  const agencyIds = new Set(datasets.agencies.map((a) => a.id));
  const contractorIds = new Set(datasets.contractors.map((c) => c.id));
  const evidenceIds = new Set(datasets.evidence.map((e) => e.id));

  // --- Duplicate primary key, theo TOÀN BỘ dataset thô (không chỉ record đã lọt vào một bundle). ---
  for (const id of findDuplicates(datasets.projects.map((p) => p.id)))
    issues.push(issue('projects', id, `Trùng project id: ${id}`, 'duplicate-primary-key'));
  for (const id of findDuplicates(datasets.workPackages.map((wp) => wp.id)))
    issues.push(issue('workPackages', id, `Trùng work package id: ${id}`, 'duplicate-primary-key'));
  for (const id of findDuplicates(datasets.milestones.map((m) => m.id)))
    issues.push(issue('milestones', id, `Trùng milestone id: ${id}`, 'duplicate-primary-key'));
  for (const id of findDuplicates(datasets.projectIssues.map((i) => i.id)))
    issues.push(issue('projectIssues', id, `Trùng issue id: ${id}`, 'duplicate-primary-key'));
  for (const id of findDuplicates(datasets.agencies.map((a) => a.id)))
    issues.push(issue('agencies', id, `Trùng agency id: ${id}`, 'duplicate-primary-key'));
  for (const id of findDuplicates(datasets.contractors.map((c) => c.id)))
    issues.push(issue('contractors', id, `Trùng contractor id: ${id}`, 'duplicate-primary-key'));

  // --- projectId dangling reference (4 dataset con) — khoảng trống chính mapper để lại. ---
  for (const wp of datasets.workPackages) {
    if (!projectIds.has(wp.projectId))
      issues.push(issue('workPackages', wp.id, `projectId không tồn tại: ${wp.projectId}`));
    if (wp.contractorId && contractorIds.size && !contractorIds.has(wp.contractorId))
      issues.push(issue('workPackages', wp.id, `contractorId không tồn tại: ${wp.contractorId}`));
  }
  for (const ms of datasets.milestones) {
    if (!projectIds.has(ms.projectId))
      issues.push(issue('milestones', ms.id, `projectId không tồn tại: ${ms.projectId}`));
    if (ms.workPackageId && !workPackageIds.has(ms.workPackageId))
      issues.push(issue('milestones', ms.id, `workPackageId không tồn tại: ${ms.workPackageId}`));
  }
  for (const pi of datasets.projectIssues) {
    if (!projectIds.has(pi.projectId))
      issues.push(issue('projectIssues', pi.id, `projectId không tồn tại: ${pi.projectId}`));
    for (const evidenceId of pi.evidenceIds) {
      if (evidenceIds.size && !evidenceIds.has(evidenceId))
        issues.push(issue('projectIssues', pi.id, `evidenceId không tồn tại: ${evidenceId}`));
    }
  }
  for (const snap of datasets.progressSnapshots) {
    const label = `${snap.projectId}@${snap.observedAt}`;
    if (!projectIds.has(snap.projectId))
      issues.push(issue('progressSnapshots', label, `projectId không tồn tại: ${snap.projectId}`));
  }

  // --- Project-level agency reference — KHÔNG phụ thuộc mapper (project luôn "có mặt"), nhưng gộp
  // vào đây để một nguồn xác thực DUY NHẤT cho mọi FK check (importer không gọi lại phần tương ứng
  // của dataQualityRules.ts — xem pipeline.ts). ---
  for (const project of datasets.projects) {
    if (agencyIds.size && !agencyIds.has(project.managingAuthorityId))
      issues.push(
        issue(
          'projects',
          project.id,
          `managingAuthorityId không tồn tại: ${project.managingAuthorityId}`,
        ),
      );
    if (agencyIds.size && !agencyIds.has(project.investorId))
      issues.push(issue('projects', project.id, `investorId không tồn tại: ${project.investorId}`));
  }

  // --- Duplicate / multi-verification-stage progress-snapshot identity — reuse
  // groupSnapshotsByIdentity (Phase 1.5, không viết lại selection logic). ---
  for (const [key, group] of groupSnapshotsByIdentity(datasets.progressSnapshots)) {
    if (group.length <= 1) continue;
    const distinctRecordIds = new Set(group.map((s) => s.sourceRecordId));
    if (distinctRecordIds.size === 1) {
      issues.push(
        issue(
          'progressSnapshots',
          key,
          `Trùng progress snapshot (cùng projectId+observedAt+sourceDatasetId+sourceRecordId): ${key}`,
          'duplicate-primary-key',
        ),
      );
    } else {
      issues.push({
        code: 'business-multiple-verification-stage',
        severity: 'warning',
        layer: 'business',
        dataset: 'progressSnapshots',
        recordId: key,
        message: `Nhiều bản ghi cho cùng identity (${key}) ở các giai đoạn xác thực khác nhau — dùng selectAuthoritativeSnapshot để chọn bản ghi tính KPI.`,
      });
    }
  }

  return issues;
}
