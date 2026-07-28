/**
 * Phase 6 (C1-C2) — view-model giải thích LỰA CHỌN authoritative snapshot cho Project Detail. KHÔNG
 * viết lại `selectAuthoritativeSnapshot`/`groupSnapshotsByIdentity`/`isUsableForKpi`
 * (`progressSnapshotSelection.ts`, Phase 1.5) — file này chỉ GỌI LẠI chúng và diễn giải kết quả
 * thành dữ liệu hiển thị được (snapshot nào được chọn, vì sao, các bản ghi cạnh tranh bị loại vì lý
 * do gì).
 *
 * Lưu ý kiến trúc quan trọng: KPI tóm tắt ở đầu Project Detail (`disbursementRate`,
 * `scheduleVariance`, `budgetVariance` — `entities/project/kpi/index.ts`) đọc trực tiếp từ field
 * `Project.overallProgress`/`financialProgress`/`disbursedAmount`, KHÔNG đọc từ `ProgressSnapshot`.
 * `affectedKpis` ở đây liệt kê các KPI mà snapshot được chọn CORROBORATE (số liệu Project nên khớp
 * với quan sát tiến độ mới nhất này nếu record được cập nhật đồng bộ) — không phải các KPI được TÍNH
 * TRỰC TIẾP từ snapshot. Không tuyên bố sai lệch giữa hai khái niệm này.
 */
import type { ProgressSnapshot } from '../types';
import {
  groupSnapshotsByIdentity,
  isUsableForKpi,
  progressSnapshotIdentityKey,
  selectAuthoritativeSnapshot,
} from './progressSnapshotSelection';

export interface CompetingSnapshotExplanation {
  snapshot: ProgressSnapshot;
  selected: boolean;
  exclusionReason?: string;
}

export interface AuthoritativeSnapshotExplanation {
  /** `null` khi dự án không có bất kỳ progress snapshot nào. */
  identityKey: string | null;
  observedAt: string | null;
  selectedSnapshot: ProgressSnapshot | null;
  selectionRule: string;
  /** `null` khi không có snapshot nào được chọn (toàn bộ nhóm mới nhất bị rejected/superseded, hoặc
   * không có snapshot nào). */
  selectedReason: string | null;
  /** Các bản ghi CÙNG identity (projectId+observedAt+sourceDatasetId) với snapshot mới nhất — bao
   * gồm cả bản được chọn, để UI hiển thị đầy đủ các verification stage. */
  competingSnapshots: readonly CompetingSnapshotExplanation[];
  /** Các `observedAt` khác (không phải nhóm mới nhất), mới nhất trước — cho UI biết còn lịch sử nào
   * khác ngoài quan sát hiện tại. */
  otherObservationDates: readonly string[];
  affectedKpis: readonly string[];
}

const AFFECTED_KPIS_WHEN_SELECTED: readonly string[] = [
  'overallProgress',
  'plannedProgress',
  'financialProgress',
  'disbursementRate',
  'scheduleVariance',
  'budgetVariance',
];

const SELECTION_RULE_DESCRIPTION =
  'Ưu tiên verificationStatus (approved > reviewed > submitted > validated-automatically > raw); ' +
  'rejected/superseded không bao giờ được chọn. Cùng mức ưu tiên: importedAt gần nhất thắng; vẫn ' +
  'trùng: sourceRecordId theo thứ tự alphabet thắng (xem selectAuthoritativeSnapshot).';

function exclusionReasonFor(
  snapshot: ProgressSnapshot,
  selected: ProgressSnapshot | null,
): string | undefined {
  if (selected && snapshot === selected) return undefined;
  if (!isUsableForKpi(snapshot.verificationStatus)) {
    return snapshot.verificationStatus === 'rejected'
      ? "verificationStatus='rejected' — số liệu đã được xác định là sai, không dùng cho KPI."
      : "verificationStatus='superseded' — đã có bản ghi mới hơn thay thế cho cùng lần quan sát này.";
  }
  return `Cùng lần quan sát nhưng thua bản ghi được chọn theo thứ tự ưu tiên (${SELECTION_RULE_DESCRIPTION})`;
}

/** Nhóm mới nhất theo `observedAt` trong `groups` — không quan tâm nhóm đó có snapshot usable hay
 * không (một nhóm toàn `rejected` vẫn là nhóm "mới nhất" nếu observedAt của nó lớn nhất; UI vẫn cần
 * hiển thị lý do KHÔNG có snapshot nào được chọn cho lần quan sát gần nhất). */
function pickLatestGroup(
  groups: Map<string, ProgressSnapshot[]>,
): { key: string; group: ProgressSnapshot[] } | null {
  let latest: { key: string; group: ProgressSnapshot[] } | null = null;
  for (const [key, group] of groups) {
    const observedAt = group[0]?.observedAt;
    if (!observedAt) continue;
    if (!latest || observedAt > latest.group[0].observedAt) latest = { key, group };
  }
  return latest;
}

export function explainLatestAuthoritativeSnapshot(
  snapshots: readonly ProgressSnapshot[],
): AuthoritativeSnapshotExplanation {
  if (snapshots.length === 0) {
    return {
      identityKey: null,
      observedAt: null,
      selectedSnapshot: null,
      selectionRule: SELECTION_RULE_DESCRIPTION,
      selectedReason: null,
      competingSnapshots: [],
      otherObservationDates: [],
      affectedKpis: [],
    };
  }

  const groups = groupSnapshotsByIdentity(snapshots);
  const latest = pickLatestGroup(groups);
  if (!latest) {
    return {
      identityKey: null,
      observedAt: null,
      selectedSnapshot: null,
      selectionRule: SELECTION_RULE_DESCRIPTION,
      selectedReason: null,
      competingSnapshots: [],
      otherObservationDates: [],
      affectedKpis: [],
    };
  }

  const selected = selectAuthoritativeSnapshot(latest.group);
  const competingSnapshots: CompetingSnapshotExplanation[] = latest.group.map((snapshot) => ({
    snapshot,
    selected: snapshot === selected,
    exclusionReason: exclusionReasonFor(snapshot, selected),
  }));

  const otherObservationDates = [...groups.keys()]
    .filter((key) => key !== latest.key)
    .map((key) => groups.get(key)![0].observedAt)
    .sort((a, b) => b.localeCompare(a));

  return {
    identityKey: latest.key,
    observedAt: latest.group[0].observedAt,
    selectedSnapshot: selected,
    selectionRule: SELECTION_RULE_DESCRIPTION,
    selectedReason: selected
      ? `verificationStatus='${selected.verificationStatus}' là mức ưu tiên cao nhất trong ${latest.group.length} bản ghi cùng lần quan sát (identity: ${progressSnapshotIdentityKey(selected)}).`
      : null,
    competingSnapshots,
    otherObservationDates,
    affectedKpis: selected ? AFFECTED_KPIS_WHEN_SELECTED : [],
  };
}
