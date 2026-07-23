/**
 * Structural, single-record validation cho domain Project — kiểm tra shape/ràng buộc nội tại của
 * MỘT record (không cần biết tới các record khác). Ràng buộc liên-record (project tồn tại, mã
 * hành chính tồn tại, duplicate id, staleness...) nằm ở `dataQualityRules.ts`, vì chúng cần nhìn
 * toàn bộ tập dữ liệu cùng lúc.
 *
 * Theo đúng pattern `catalogValidation.ts`/`scripts/validate_daklak_data.py`: hàm thuần, nhận input
 * tường minh, dễ unit test với dữ liệu giả xấu — không dùng AJV/Zod runtime (xem
 * docs/adr/0001-project-centric-domain.md).
 */
import type {
  Milestone,
  MilestoneStatus,
  Project,
  ProjectGeometry,
  ProjectIssue,
  ProjectPriority,
  ProjectSector,
  ProjectStatus,
  ProgressSnapshot,
  WorkPackage,
  WorkPackageStatus,
} from '../types';
import {
  MILESTONE_STATUSES,
  PROJECT_PRIORITIES,
  PROJECT_SECTORS,
  PROJECT_STATUSES,
  WORK_PACKAGE_STATUSES,
} from '../types';

function isPercentage(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 100;
}

function isIsoDate(value: string): boolean {
  return !Number.isNaN(new Date(value).getTime());
}

function isBefore(a: string, b: string): boolean {
  return new Date(a).getTime() <= new Date(b).getTime();
}

/**
 * VND amount contract (Phase 1.5 — see "Chuẩn hoá tiền tệ" in docs/domain-model.md, Option A):
 * finite, integer, non-negative, within `Number.MAX_SAFE_INTEGER`. No fractional VND exists at
 * project-budget scale, so a non-integer value is always a data error, never legitimate precision.
 */
function isValidVndAmount(value: number): boolean {
  return (
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= Number.MAX_SAFE_INTEGER
  );
}

/** Rule §8 (spec): geometry phải hợp lệ ở mức validation hiện có — kiểm tra cấu trúc/toạ độ, không
 * phải một GIS geometry engine đầy đủ (topology/self-intersection nằm ngoài phạm vi frontend, xem
 * AGENTS.md "không đưa xử lý GeoPandas/Shapely nặng vào browser"). */
export function isValidProjectGeometry(geometry: ProjectGeometry): string[] {
  const errors: string[] = [];
  const isValidLonLat = ([lon, lat]: [number, number]): boolean =>
    Number.isFinite(lon) &&
    Number.isFinite(lat) &&
    lon >= -180 &&
    lon <= 180 &&
    lat >= -90 &&
    lat <= 90;

  if (geometry.type === 'Point') {
    if (!isValidLonLat(geometry.coordinates))
      errors.push('Point geometry có toạ độ ngoài phạm vi hợp lệ');
    return errors;
  }

  if (geometry.type === 'Polygon') {
    if (geometry.coordinates.length === 0) errors.push('Polygon geometry không có ring nào');
    for (const [ringIndex, ring] of geometry.coordinates.entries()) {
      if (ring.length < 4) {
        errors.push(`Polygon ring #${ringIndex} có ít hơn 4 điểm (không thể khép kín)`);
        continue;
      }
      const [first] = ring;
      const last = ring[ring.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1])
        errors.push(`Polygon ring #${ringIndex} không khép kín (điểm đầu khác điểm cuối)`);
      const invalidPoint = ring.find((point) => !isValidLonLat(point));
      if (invalidPoint) errors.push(`Polygon ring #${ringIndex} có toạ độ ngoài phạm vi hợp lệ`);
    }
    return errors;
  }

  return errors;
}

export function validateProjectRecord(project: Project): string[] {
  const errors: string[] = [];
  const label = project.id || '(id trống)';

  if (!project.id) errors.push('Project thiếu id');
  if (!project.code) errors.push(`Project ${label} thiếu code`);
  if (!project.name) errors.push(`Project ${label} thiếu name`);
  if (!PROJECT_SECTORS.includes(project.sector as ProjectSector))
    errors.push(`Project ${label} có sector không hợp lệ: ${project.sector}`);
  if (!PROJECT_STATUSES.includes(project.status as ProjectStatus))
    errors.push(`Project ${label} có status không hợp lệ: ${project.status}`);
  if (!PROJECT_PRIORITIES.includes(project.priority as ProjectPriority))
    errors.push(`Project ${label} có priority không hợp lệ: ${project.priority}`);

  // Rule §2: progress nằm trong 0-100.
  for (const [field, value] of [
    ['overallProgress', project.overallProgress],
    ['plannedProgress', project.plannedProgress],
    ['financialProgress', project.financialProgress],
  ] as const) {
    if (!isPercentage(value))
      errors.push(`Project ${label} có ${field}=${value} ngoài khoảng 0-100`);
  }

  // Rule §1: disbursedAmount không vượt adjustedBudget hoặc approvedBudget.
  const budgetCeiling = project.adjustedBudget ?? project.approvedBudget;
  if (Number.isFinite(budgetCeiling) && project.disbursedAmount > budgetCeiling)
    errors.push(
      `Project ${label} có disbursedAmount (${project.disbursedAmount}) vượt ngân sách cho phép (${budgetCeiling})`,
    );
  if (!isValidVndAmount(project.approvedBudget))
    errors.push(
      `Project ${label} có approvedBudget không phải số nguyên VND hợp lệ (không âm, ≤ MAX_SAFE_INTEGER): ${project.approvedBudget}`,
    );
  if (project.adjustedBudget !== undefined && !isValidVndAmount(project.adjustedBudget))
    errors.push(
      `Project ${label} có adjustedBudget không phải số nguyên VND hợp lệ: ${project.adjustedBudget}`,
    );
  if (!isValidVndAmount(project.disbursedAmount))
    errors.push(
      `Project ${label} có disbursedAmount không phải số nguyên VND hợp lệ: ${project.disbursedAmount}`,
    );

  for (const [field, value] of [
    ['startDate', project.startDate],
    ['plannedCompletionDate', project.plannedCompletionDate],
    ['forecastCompletionDate', project.forecastCompletionDate],
    ['actualCompletionDate', project.actualCompletionDate],
  ] as const) {
    if (value !== undefined && !isIsoDate(value))
      errors.push(`Project ${label} có ${field} không phải ngày hợp lệ: ${value}`);
  }
  if (
    project.startDate &&
    project.plannedCompletionDate &&
    !isBefore(project.startDate, project.plannedCompletionDate)
  )
    errors.push(`Project ${label} có plannedCompletionDate trước startDate`);

  if (project.geometry)
    errors.push(...isValidProjectGeometry(project.geometry).map((e) => `Project ${label}: ${e}`));

  if (!project.administrativeAreaCodes || project.administrativeAreaCodes.length === 0)
    errors.push(
      `Project ${label} không có administrativeAreaCodes nào (dự án cần ít nhất một bộ lọc không gian)`,
    );

  if (!isIsoDate(project.dataUpdatedAt))
    errors.push(`Project ${label} có dataUpdatedAt không hợp lệ`);
  if (!project.dataOwner) errors.push(`Project ${label} thiếu dataOwner`);
  if (!project.sourceDatasetId) errors.push(`Project ${label} thiếu sourceDatasetId`);

  return errors;
}

export function validateWorkPackageRecord(workPackage: WorkPackage): string[] {
  const errors: string[] = [];
  const label = workPackage.id || '(id trống)';

  if (!workPackage.id) errors.push('WorkPackage thiếu id');
  if (!workPackage.projectId) errors.push(`WorkPackage ${label} thiếu projectId`);
  if (!WORK_PACKAGE_STATUSES.includes(workPackage.status as WorkPackageStatus))
    errors.push(`WorkPackage ${label} có status không hợp lệ: ${workPackage.status}`);

  for (const [field, value] of [
    ['plannedProgress', workPackage.plannedProgress],
    ['actualProgress', workPackage.actualProgress],
  ] as const) {
    if (!isPercentage(value))
      errors.push(`WorkPackage ${label} có ${field}=${value} ngoài khoảng 0-100`);
  }

  if (!isIsoDate(workPackage.plannedStart) || !isIsoDate(workPackage.plannedEnd))
    errors.push(`WorkPackage ${label} có plannedStart/plannedEnd không hợp lệ`);
  // Rule §4: plannedEnd không trước plannedStart.
  else if (!isBefore(workPackage.plannedStart, workPackage.plannedEnd))
    errors.push(`WorkPackage ${label} có plannedEnd trước plannedStart`);

  // Rule §3: actualEnd không trước actualStart.
  if (workPackage.actualStart && workPackage.actualEnd) {
    if (!isIsoDate(workPackage.actualStart) || !isIsoDate(workPackage.actualEnd))
      errors.push(`WorkPackage ${label} có actualStart/actualEnd không hợp lệ`);
    else if (!isBefore(workPackage.actualStart, workPackage.actualEnd))
      errors.push(`WorkPackage ${label} có actualEnd trước actualStart`);
  }

  if (workPackage.paidAmount > workPackage.budget)
    errors.push(
      `WorkPackage ${label} có paidAmount (${workPackage.paidAmount}) vượt budget (${workPackage.budget})`,
    );
  if (!isValidVndAmount(workPackage.budget))
    errors.push(
      `WorkPackage ${label} có budget không phải số nguyên VND hợp lệ: ${workPackage.budget}`,
    );
  if (!isValidVndAmount(workPackage.paidAmount))
    errors.push(
      `WorkPackage ${label} có paidAmount không phải số nguyên VND hợp lệ: ${workPackage.paidAmount}`,
    );

  return errors;
}

export function validateMilestoneRecord(milestone: Milestone): string[] {
  const errors: string[] = [];
  const label = milestone.id || '(id trống)';

  if (!milestone.id) errors.push('Milestone thiếu id');
  if (!milestone.projectId) errors.push(`Milestone ${label} thiếu projectId`);
  if (!milestone.name) errors.push(`Milestone ${label} thiếu name`);
  if (!MILESTONE_STATUSES.includes(milestone.status as MilestoneStatus))
    errors.push(`Milestone ${label} có status không hợp lệ: ${milestone.status}`);
  if (!isIsoDate(milestone.plannedDate))
    errors.push(`Milestone ${label} có plannedDate không hợp lệ`);

  return errors;
}

export function validateProjectIssueRecord(issue: ProjectIssue): string[] {
  const errors: string[] = [];
  const label = issue.id || '(id trống)';

  if (!issue.id) errors.push('ProjectIssue thiếu id');
  if (!issue.projectId) errors.push(`ProjectIssue ${label} thiếu projectId`);
  if (!issue.title) errors.push(`ProjectIssue ${label} thiếu title`);
  if (!issue.sourceDatasetId) errors.push(`ProjectIssue ${label} thiếu sourceDatasetId`);
  if (!isIsoDate(issue.openedAt)) errors.push(`ProjectIssue ${label} có openedAt không hợp lệ`);
  if (
    issue.dueAt &&
    issue.openedAt &&
    isIsoDate(issue.dueAt) &&
    !isBefore(issue.openedAt, issue.dueAt)
  )
    errors.push(`ProjectIssue ${label} có dueAt trước openedAt`);
  if (issue.resolvedAt && issue.status !== 'resolved' && issue.status !== 'closed')
    errors.push(`ProjectIssue ${label} có resolvedAt nhưng status vẫn là '${issue.status}'`);
  if (issue.relatedGeometry)
    errors.push(
      ...isValidProjectGeometry(issue.relatedGeometry).map((e) => `ProjectIssue ${label}: ${e}`),
    );

  return errors;
}

export function validateProgressSnapshotRecord(snapshot: ProgressSnapshot): string[] {
  const errors: string[] = [];
  const label = `${snapshot.projectId}@${snapshot.observedAt}`;

  if (!snapshot.projectId) errors.push('ProgressSnapshot thiếu projectId');
  if (!isIsoDate(snapshot.observedAt))
    errors.push(`ProgressSnapshot ${label} có observedAt không hợp lệ`);
  for (const [field, value] of [
    ['plannedPhysicalProgress', snapshot.plannedPhysicalProgress],
    ['physicalProgress', snapshot.physicalProgress],
    ['financialProgress', snapshot.financialProgress],
  ] as const) {
    if (!isPercentage(value))
      errors.push(`ProgressSnapshot ${label} có ${field}=${value} ngoài khoảng 0-100`);
  }
  if (!isValidVndAmount(snapshot.disbursedAmount))
    errors.push(
      `ProgressSnapshot ${label} có disbursedAmount không phải số nguyên VND hợp lệ: ${snapshot.disbursedAmount}`,
    );
  if (!snapshot.sourceDatasetId) errors.push(`ProgressSnapshot ${label} thiếu sourceDatasetId`);
  if (!snapshot.sourceRecordId) errors.push(`ProgressSnapshot ${label} thiếu sourceRecordId`);

  return errors;
}
