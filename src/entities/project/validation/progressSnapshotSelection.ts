/**
 * Identity và selection rule cho ProgressSnapshot (Phase 1.5 hardening — spec §6).
 *
 * Identity: `projectId + observedAt + sourceDatasetId` — hai bản ghi cùng ba trường này mô tả
 * "cùng một lần quan sát tiến độ, từ cùng một nguồn". Verification workflow được phép sinh nhiều
 * bản ghi cho cùng identity đó khi một quan sát đi qua nhiều giai đoạn (raw → reviewed → approved)
 * và mỗi giai đoạn được lưu lại thay vì ghi đè — `selectAuthoritativeSnapshot` chọn đúng MỘT bản ghi
 * dùng cho KPI theo thứ tự ưu tiên bên dưới; các bản ghi còn lại trong nhóm không bị coi là lỗi,
 * chỉ đơn giản là không được dùng để tính toán.
 */
import type { ProgressSnapshot, VerificationStatus } from '../types';

/**
 * approved > reviewed > submitted > validated-automatically > raw. `superseded` và `rejected`
 * không bao giờ được chọn cho KPI: `superseded` nghĩa là đã có bản ghi mới hơn thay thế; `rejected`
 * nghĩa là số liệu đã được xác định là sai — dùng nó để tính KPI sẽ hiển thị số liệu đã biết là sai.
 */
const VERIFICATION_PRIORITY: Record<VerificationStatus, number> = {
  approved: 5,
  reviewed: 4,
  submitted: 3,
  'validated-automatically': 2,
  raw: 1,
  superseded: -1,
  rejected: -1,
};

export function isUsableForKpi(status: VerificationStatus): boolean {
  return VERIFICATION_PRIORITY[status] >= 0;
}

export function progressSnapshotIdentityKey(snapshot: ProgressSnapshot): string {
  return `${snapshot.projectId}::${snapshot.observedAt}::${snapshot.sourceDatasetId}`;
}

export function groupSnapshotsByIdentity(
  snapshots: readonly ProgressSnapshot[],
): Map<string, ProgressSnapshot[]> {
  const groups = new Map<string, ProgressSnapshot[]>();
  for (const snapshot of snapshots) {
    const key = progressSnapshotIdentityKey(snapshot);
    const group = groups.get(key);
    if (group) group.push(snapshot);
    else groups.set(key, [snapshot]);
  }
  return groups;
}

/**
 * Chọn bản ghi có thẩm quyền nhất trong một nhóm cùng identity. Trả `null` nếu không có bản ghi
 * nào dùng được (toàn bộ nhóm là `superseded`/`rejected`) — caller không được tự suy ra một giá trị
 * thay thế, đúng nguyên tắc "không dùng 0/mặc định thay cho thiếu dữ liệu" áp dụng cho cả lựa chọn
 * bản ghi, không chỉ giá trị số.
 */
export function selectAuthoritativeSnapshot(
  group: readonly ProgressSnapshot[],
): ProgressSnapshot | null {
  const usable = group.filter((s) => isUsableForKpi(s.verificationStatus));
  if (usable.length === 0) return null;
  return [...usable].sort((a, b) => {
    const priorityDiff =
      VERIFICATION_PRIORITY[b.verificationStatus] - VERIFICATION_PRIORITY[a.verificationStatus];
    if (priorityDiff !== 0) return priorityDiff;
    const importedAtDiff = new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime();
    if (importedAtDiff !== 0) return importedAtDiff;
    return a.sourceRecordId.localeCompare(b.sourceRecordId);
  })[0];
}

/** Áp dụng `selectAuthoritativeSnapshot` cho từng nhóm identity trong một tập snapshot — kết quả
 * là tối đa một snapshot cho mỗi (projectId, observedAt, sourceDatasetId), sẵn sàng cho KPI/UI
 * tiêu thụ trực tiếp mà không phải tự xử lý trùng lặp. */
export function selectAuthoritativeSnapshots(
  snapshots: readonly ProgressSnapshot[],
): ProgressSnapshot[] {
  const result: ProgressSnapshot[] = [];
  for (const group of groupSnapshotsByIdentity(snapshots).values()) {
    const chosen = selectAuthoritativeSnapshot(group);
    if (chosen) result.push(chosen);
  }
  return result;
}
