/**
 * Publication-decision set — Phase 7 (docs/adr/0010-real-data-pilot-and-fail-closed-publication-
 * decisions.md). Cơ chế fail-closed thay thế phần "record classification mặc định public khi vắng
 * mặt" của Phase 6 (xem JSDoc cũ trong `projectPublicBundle.ts`/`publicProjectionTypes.ts`) CHO một
 * bundle THẬT (không phải fixture hư cấu): một artifact JSON riêng, versioned, key theo
 * `entityKind:recordId`, quyết định RÕ RÀNG record nào được public. `requirePublicationDecisions:
 * true` (projectCanonicalBundleToPublic) làm record KHÔNG có quyết định bị loại (fail-closed), thay
 * vì mặc định public như hành vi Phase 6 cũ (hành vi cũ vẫn giữ nguyên khi flag này false/vắng mặt —
 * không phá test/demo hiện có).
 *
 * Đây KHÔNG phải workflow phê duyệt runtime — vẫn là artifact tĩnh, sinh/ký thủ công offline, đúng
 * kiến trúc "không backend" của toàn bộ pipeline (xem ADR 0009).
 */
import { CANONICAL_ENTITY_KINDS, type CanonicalEntityKind } from '../canonicalBundle';
import { computeNormalizedContentChecksum } from './deterministicChecksum';

export type PublicationDecisionValue = 'public' | 'excluded';

export interface PublicationDecisionEntry {
  entityKind: CanonicalEntityKind;
  recordId: string;
  decision: PublicationDecisionValue;
  reason: string;
  decidedBy: string;
  decidedAt: string;
}

export interface PublicationDecisionSet {
  policyVersion: string;
  generatedAt: string;
  decisions: readonly PublicationDecisionEntry[];
}

export class InvalidPublicationDecisionSetError extends Error {}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const CANONICAL_ENTITY_KIND_SET: ReadonlySet<string> = new Set(CANONICAL_ENTITY_KINDS);

/** Xác thực hình dạng thô (thường đọc từ JSON.parse) thành `PublicationDecisionSet`. Không suy đoán
 * hay chuẩn hoá giá trị mập mờ — bất kỳ entry nào thiếu field bắt buộc hoặc sai kiểu đều throw, để
 * lỗi cấu hình publication-decision (an toàn cao) fail sớm và rõ ràng thay vì âm thầm bị bỏ qua. */
export function parsePublicationDecisionSet(raw: unknown): PublicationDecisionSet {
  if (!isPlainObject(raw)) {
    throw new InvalidPublicationDecisionSetError('Publication decision set phải là object.');
  }
  const { policyVersion, generatedAt, decisions } = raw;
  if (typeof policyVersion !== 'string' || policyVersion.length === 0) {
    throw new InvalidPublicationDecisionSetError('Thiếu hoặc sai kiểu policyVersion (string).');
  }
  if (typeof generatedAt !== 'string' || generatedAt.length === 0) {
    throw new InvalidPublicationDecisionSetError('Thiếu hoặc sai kiểu generatedAt (string ISO).');
  }
  if (!Array.isArray(decisions)) {
    throw new InvalidPublicationDecisionSetError('Thiếu hoặc sai kiểu decisions (mảng).');
  }
  const seenKeys = new Set<string>();
  const parsedDecisions: PublicationDecisionEntry[] = decisions.map((entry, index) => {
    if (!isPlainObject(entry)) {
      throw new InvalidPublicationDecisionSetError(`decisions[${index}] phải là object.`);
    }
    const { entityKind, recordId, decision, reason, decidedBy, decidedAt } = entry;
    if (typeof entityKind !== 'string' || !CANONICAL_ENTITY_KIND_SET.has(entityKind)) {
      throw new InvalidPublicationDecisionSetError(
        `decisions[${index}].entityKind='${String(entityKind)}' không phải một CanonicalEntityKind hợp lệ.`,
      );
    }
    if (typeof recordId !== 'string' || recordId.length === 0) {
      throw new InvalidPublicationDecisionSetError(
        `decisions[${index}].recordId phải là string khác rỗng.`,
      );
    }
    if (decision !== 'public' && decision !== 'excluded') {
      throw new InvalidPublicationDecisionSetError(
        `decisions[${index}].decision='${String(decision)}' phải là 'public' hoặc 'excluded'.`,
      );
    }
    if (typeof reason !== 'string' || reason.length === 0) {
      throw new InvalidPublicationDecisionSetError(
        `decisions[${index}].reason phải là string khác rỗng.`,
      );
    }
    if (typeof decidedBy !== 'string' || decidedBy.length === 0) {
      throw new InvalidPublicationDecisionSetError(
        `decisions[${index}].decidedBy phải là string khác rỗng.`,
      );
    }
    if (typeof decidedAt !== 'string' || decidedAt.length === 0) {
      throw new InvalidPublicationDecisionSetError(
        `decisions[${index}].decidedAt phải là string ISO.`,
      );
    }
    const key = `${entityKind}:${recordId}`;
    if (seenKeys.has(key)) {
      throw new InvalidPublicationDecisionSetError(
        `decisions chứa quyết định trùng lặp cho '${key}' — mỗi record chỉ được có một quyết định.`,
      );
    }
    seenKeys.add(key);
    return {
      entityKind: entityKind as CanonicalEntityKind,
      recordId,
      decision,
      reason,
      decidedBy,
      decidedAt,
    };
  });

  return { policyVersion, generatedAt, decisions: parsedDecisions };
}

/** Index tra cứu O(1) theo `entityKind:recordId` — dùng bởi `projectCanonicalBundleToPublic`. Tách
 * riêng khỏi parse để test có thể xây index trực tiếp từ fixture mà không cần đi qua JSON.parse. */
export function buildPublicationDecisionIndex(
  set: PublicationDecisionSet,
): ReadonlyMap<string, PublicationDecisionEntry> {
  const index = new Map<string, PublicationDecisionEntry>();
  for (const entry of set.decisions) index.set(`${entry.entityKind}:${entry.recordId}`, entry);
  return index;
}

/** Checksum nội dung quyết định, KHÔNG bao gồm `generatedAt` — cùng nguyên tắc với
 * `sourceNormalizedContentChecksum`/`projectedContentChecksum` (deterministicChecksum.ts): cùng nội
 * dung quyết định ở hai thời điểm khác nhau phải cho cùng checksum, để approval receipt (xem
 * `approvalReceipt.ts`) có thể so khớp mà không nhạy cảm với thời điểm regenerate. */
export function computePublicationDecisionSetChecksum(set: PublicationDecisionSet): string {
  return computeNormalizedContentChecksum({
    policyVersion: set.policyVersion,
    decisions: set.decisions,
  });
}
