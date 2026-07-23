/**
 * KPI utilities cho domain Project. Mỗi hàm nhận dữ liệu tường minh (không đọc store/global state
 * — dễ unit test) và trả về `KpiResult` (xem `./types.ts`). Khi input cần thiết bị thiếu hoặc
 * không hợp lệ, trả `status: 'unavailable'` thay vì suy ra 0 — 0 là một giá trị có ý nghĩa nghiệp
 * vụ thật (ví dụ "chưa giải ngân đồng nào"), không được dùng để che giấu "không có dữ liệu".
 */
import type { IssueStatus, ProjectBundle, ProjectIssue } from '../types';
import { availableKpi, unavailableKpi, type KpiResult } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / DAY_MS);
}

function isOpenIssueStatus(status: IssueStatus): boolean {
  return status !== 'resolved' && status !== 'closed';
}

/** Tỷ lệ giải ngân: disbursedAmount / ngân sách hiệu lực (adjustedBudget nếu có, ngược lại
 * approvedBudget). */
export function disbursementRate(bundle: ProjectBundle, now: Date = new Date()): KpiResult {
  const { project } = bundle;
  const ceiling = project.adjustedBudget ?? project.approvedBudget;
  if (!Number.isFinite(ceiling) || ceiling <= 0)
    return unavailableKpi(
      '%',
      ['approvedBudget/adjustedBudget'],
      'Không có ngân sách hợp lệ để tính tỷ lệ giải ngân.',
      now,
    );
  const value = (project.disbursedAmount / ceiling) * 100;
  return availableKpi(
    value,
    '%',
    [project.sourceDatasetId],
    'disbursedAmount / (adjustedBudget hoặc approvedBudget) × 100.',
    now,
  );
}

/** Chênh lệch tiến độ khối lượng so với kế hoạch tại thời điểm hiện tại (điểm phần trăm). Âm =
 * chậm so với kế hoạch. */
export function scheduleVariance(bundle: ProjectBundle, now: Date = new Date()): KpiResult {
  const { project } = bundle;
  if (project.overallProgress == null || project.plannedProgress == null)
    return unavailableKpi(
      'percentage-points',
      ['overallProgress', 'plannedProgress'],
      'Thiếu tiến độ thực tế hoặc kế hoạch.',
      now,
    );
  const value = project.overallProgress - project.plannedProgress;
  return availableKpi(
    value,
    'percentage-points',
    [project.sourceDatasetId],
    'overallProgress − plannedProgress.',
    now,
  );
}

/** Chênh lệch nhịp giải ngân so với nhịp thi công thực tế (điểm phần trăm). Dương = giải ngân
 * nhanh hơn khối lượng thực hiện (rủi ro tạm ứng vượt khối lượng); âm = giải ngân chậm hơn thi
 * công. */
export function progressVariance(bundle: ProjectBundle, now: Date = new Date()): KpiResult {
  const { project } = bundle;
  if (project.financialProgress == null || project.overallProgress == null)
    return unavailableKpi(
      'percentage-points',
      ['financialProgress', 'overallProgress'],
      'Thiếu tiến độ tài chính hoặc khối lượng.',
      now,
    );
  const value = project.financialProgress - project.overallProgress;
  return availableKpi(
    value,
    'percentage-points',
    [project.sourceDatasetId],
    'financialProgress − overallProgress.',
    now,
  );
}

/** Chênh lệch ngân sách điều chỉnh so với ngân sách phê duyệt ban đầu. */
export function budgetVariance(bundle: ProjectBundle, now: Date = new Date()): KpiResult {
  const { project } = bundle;
  if (project.adjustedBudget == null)
    return unavailableKpi(
      'VND',
      ['adjustedBudget'],
      'Dự án chưa có ngân sách điều chỉnh — chưa có căn cứ so sánh.',
      now,
    );
  const value = project.adjustedBudget - project.approvedBudget;
  return availableKpi(
    value,
    'VND',
    [project.sourceDatasetId],
    'adjustedBudget − approvedBudget.',
    now,
  );
}

/** Số ngày dự báo chậm so với kế hoạch (forecastCompletionDate − plannedCompletionDate). Âm nghĩa
 * là dự báo về đích sớm hơn kế hoạch. */
export function forecastDelayInDays(bundle: ProjectBundle, now: Date = new Date()): KpiResult {
  const { project } = bundle;
  if (!project.forecastCompletionDate || !project.plannedCompletionDate)
    return unavailableKpi(
      'days',
      ['forecastCompletionDate', 'plannedCompletionDate'],
      'Thiếu ngày dự báo hoặc ngày kế hoạch hoàn thành.',
      now,
    );
  const value = daysBetween(project.plannedCompletionDate, project.forecastCompletionDate);
  return availableKpi(
    value,
    'days',
    [project.sourceDatasetId],
    'forecastCompletionDate − plannedCompletionDate, tính bằng ngày.',
    now,
  );
}

/** Số vướng mắc quá hạn (dueAt đã qua, chưa resolved/closed) tại thời điểm `now`. */
export function overdueIssueCount(
  issues: readonly ProjectIssue[],
  now: Date = new Date(),
): KpiResult {
  const relevant = issues.filter((i) => i.dueAt);
  if (relevant.length === 0)
    return unavailableKpi(
      'count',
      ['issue.dueAt'],
      'Không có vướng mắc nào khai báo hạn xử lý (dueAt).',
      now,
    );
  const overdue = relevant.filter(
    (i) => isOpenIssueStatus(i.status) && new Date(i.dueAt as string).getTime() < now.getTime(),
  );
  return availableKpi(
    overdue.length,
    'count',
    [...new Set(issues.map((i) => i.projectId))],
    'Số issue có dueAt < hiện tại và status chưa resolved/closed.',
    now,
  );
}

/** Tỷ lệ hoàn thành công tác giải phóng mặt bằng: issue category='land-clearance' đã
 * resolved/closed trên tổng số issue cùng loại. `unavailable` nếu dự án không có issue
 * land-clearance nào (không có nghĩa là 100% hay 0%, mà là "không áp dụng / chưa có dữ liệu"). */
export function landClearanceCompletionRate(
  issues: readonly ProjectIssue[],
  now: Date = new Date(),
): KpiResult {
  const landClearanceIssues = issues.filter((i) => i.category === 'land-clearance');
  if (landClearanceIssues.length === 0)
    return unavailableKpi(
      '%',
      ['issue.category=land-clearance'],
      'Dự án không có vướng mắc giải phóng mặt bằng nào được ghi nhận.',
      now,
    );
  const resolved = landClearanceIssues.filter(
    (i) => i.status === 'resolved' || i.status === 'closed',
  );
  const value = (resolved.length / landClearanceIssues.length) * 100;
  return availableKpi(
    value,
    '%',
    [...new Set(landClearanceIssues.map((i) => i.projectId))],
    'Số issue land-clearance đã resolved/closed / tổng số issue land-clearance × 100.',
    now,
  );
}

/** Độ mới dữ liệu tính bằng số ngày kể từ `project.dataUpdatedAt`. */
export function dataFreshness(bundle: ProjectBundle, now: Date = new Date()): KpiResult {
  const { project } = bundle;
  const updated = new Date(project.dataUpdatedAt);
  if (Number.isNaN(updated.getTime()))
    return unavailableKpi('days', ['dataUpdatedAt'], 'dataUpdatedAt không hợp lệ hoặc trống.', now);
  const ageDays = Math.max(0, Math.round((now.getTime() - updated.getTime()) / DAY_MS));
  return availableKpi(
    ageDays,
    'days',
    [project.sourceDatasetId],
    'Số ngày kể từ dataUpdatedAt tới thời điểm tính.',
    now,
  );
}

/**
 * Tỷ lệ hoàn chỉnh dữ liệu: tỷ lệ field "nên có ở một dự án đang triển khai" thực sự có giá trị.
 * Danh sách field cố định, không đoán field tuỳ theo trạng thái dự án — một dự án `proposed` sẽ tự
 * nhiên có completeness thấp hơn, điều đó là đúng và có ý nghĩa, không phải lỗi.
 */
export function dataCompleteness(bundle: ProjectBundle, now: Date = new Date()): KpiResult {
  const { project } = bundle;
  const checklist: Array<[string, unknown]> = [
    ['projectManagerId', project.projectManagerId],
    ['approvalDecision', project.approvalDecision],
    ['startDate', project.startDate],
    ['plannedCompletionDate', project.plannedCompletionDate],
    ['forecastCompletionDate', project.forecastCompletionDate],
    ['adjustedBudget', project.adjustedBudget],
    ['geometry', project.geometry],
  ];
  const present = checklist.filter(
    ([, value]) => value !== undefined && value !== null && value !== '',
  );
  const value = (present.length / checklist.length) * 100;
  const missingInputs = checklist
    .filter(([, value]) => value === undefined || value === null || value === '')
    .map(([field]) => field);
  return {
    value,
    unit: '%',
    status: 'ok',
    calculatedAt: now.toISOString(),
    sourceDatasetIds: [project.sourceDatasetId],
    missingInputs,
    explanation:
      'Tỷ lệ field khuyến nghị (projectManagerId, approvalDecision, mốc ngày, adjustedBudget, geometry) có giá trị thực.',
  };
}
