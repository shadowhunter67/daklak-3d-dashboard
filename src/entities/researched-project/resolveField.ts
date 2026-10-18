import { parseIsoDate } from './isoDate';
import type { EvidenceLevel, FieldObservation } from './types';

/** Thứ tự ưu tiên khi nguồn mâu thuẫn: văn bản/dữ liệu chính thống thắng, rồi mới tới mới-nhất. */
const EVIDENCE_RANK: Record<EvidenceLevel, number> = {
  official: 4,
  'verified-open-data': 3,
  derived: 2,
  illustrative: 1,
  unknown: 0,
};

export interface ResolvedField<T> {
  resolved: FieldObservation<T> | undefined;
  /** Các quan sát khác giá trị với `resolved` — không bị xoá, UI hiển thị trong "Lịch sử thay đổi". */
  conflicts: FieldObservation<T>[];
}

/** Ngày hỏng xếp cuối (cũ nhất) để sắp xếp luôn tất định; validator báo lỗi riêng. */
const timeOf = (o: { observedAt: string }) => parseIsoDate(o.observedAt) ?? -Infinity;

export function resolveField<T>(history: readonly FieldObservation<T>[]): ResolvedField<T> {
  if (history.length === 0) return { resolved: undefined, conflicts: [] };
  const resolved = [...history].sort(
    (a, b) =>
      EVIDENCE_RANK[b.status] - EVIDENCE_RANK[a.status] ||
      (timeOf(b) === timeOf(a) ? 0 : timeOf(b) > timeOf(a) ? 1 : -1),
  )[0];
  const conflicts = history.filter((o) => o !== resolved && o.value !== resolved.value);
  return { resolved, conflicts };
}
