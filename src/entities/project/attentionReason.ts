/**
 * "Lý do cần chú ý" (primary attention reason) cho một dự án — logic dùng chung giữa Executive
 * Overview (`buildExecutiveOverview.ts`) và Project Portfolio (Phase 2B1,
 * `src/features/project-portfolio/model/`). Trước Phase 2B1, `buildExecutiveOverview.ts` định nghĩa
 * `pickPrimaryReason`/`REASON_RANK` cục bộ — được chuyển ra đây (không đổi hành vi) để Portfolio
 * không phải viết lại cùng một quy tắc xếp hạng.
 *
 * Nguyên tắc (không đổi từ Phase 2A): mỗi dự án chỉ mang đúng MỘT lý do chính, chọn theo thứ tự ưu
 * tiên cố định `REASON_RANK` — không phải điểm số tổng hợp không giải thích được ("AI score").
 */
import type { assessPortfolio } from './portfolioAssessment';

export type AttentionReasonCategory =
  'overdue-critical-issue' | 'delayed' | 'at-risk' | 'stale-data' | 'budget-exposure';

export const ATTENTION_REASON_LABEL: Record<AttentionReasonCategory, string> = {
  'overdue-critical-issue': 'Có vướng mắc nghiêm trọng quá hạn',
  delayed: 'Đang chậm tiến độ',
  'at-risk': 'Có nguy cơ chậm tiến độ',
  'stale-data': 'Dữ liệu đã quá hạn cập nhật',
  'budget-exposure': 'Giải ngân vượt tiến độ khối lượng',
};

/** Thấp hơn = nghiêm trọng hơn = hiện trước. */
export const REASON_RANK: Record<AttentionReasonCategory, number> = {
  'overdue-critical-issue': 0,
  delayed: 1,
  'at-risk': 2,
  'stale-data': 3,
  'budget-exposure': 4,
};

/** Chọn lý do chính cho một dự án từ kết quả `assessPortfolio`. Trả `null` nếu dự án không có lý do
 * nào cần chú ý (không xuất hiện trong danh sách "cần chú ý" của Executive Overview hay Portfolio). */
export function pickPrimaryReason(
  projectId: string,
  assessment: ReturnType<typeof assessPortfolio>,
): AttentionReasonCategory | null {
  const projectBusinessAlerts = assessment.businessAlerts.filter((a) => a.projectId === projectId);
  const projectQualityIssues = assessment.qualityIssues.filter(
    (i) => i.entityType === 'project' && i.entityId === projectId,
  );

  const candidates: AttentionReasonCategory[] = [];
  if (projectBusinessAlerts.some((a) => a.category === 'overdue-critical-issue'))
    candidates.push('overdue-critical-issue');
  if (projectBusinessAlerts.some((a) => a.category === 'schedule-delay'))
    candidates.push('delayed');
  if (projectBusinessAlerts.some((a) => a.category === 'at-risk')) candidates.push('at-risk');
  if (projectQualityIssues.some((i) => i.rule === 'stale-data')) candidates.push('stale-data');
  if (projectBusinessAlerts.some((a) => a.category === 'budget-exposure'))
    candidates.push('budget-exposure');

  if (candidates.length === 0) return null;
  return candidates.sort((a, b) => REASON_RANK[a] - REASON_RANK[b])[0];
}
