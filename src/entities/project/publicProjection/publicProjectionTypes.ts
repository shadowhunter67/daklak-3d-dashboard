/**
 * Types cho public projection engine (Phase 6 — docs/project-data-import/public-projection-policy.md).
 * Projection là bước build-time/offline THUẦN (không chạy trong browser) biến một
 * `CanonicalProjectPortfolioBundle` internal thành bundle "public-safe" theo field allowlist
 * (`config/public-project-fields.json`) — xem `projectPublicBundle.ts` cho hàm thuần thực thi.
 */
import type { CanonicalEntityKind } from '../canonicalBundle';

/**
 * Ba mức classification áp dụng ở mức RECORD cho mục đích projection — tái sử dụng đúng ba giá trị
 * đầu của `CANONICAL_BUNDLE_CLASSIFICATIONS` (`canonicalBundle.ts`), KHÔNG tạo taxonomy mới. Canonical
 * schema hiện tại (Phase 3-5) chưa mang classification riêng ở mức từng record — chỉ có
 * `CanonicalBundleMetadata.classification` ở mức BUNDLE. Phase 6 tái dùng giá trị bundle-level đó làm
 * classification mặc định cho MỌI record trong bundle (`resolveRecordClassification` bên dưới); một
 * record CÓ THỂ tự khai báo classification riêng qua field optional `recordClassification` (không có
 * trong canonical JSON Schema hiện tại — dự phòng cho khi schema thật sự thêm field này, xem ADR 0009
 * "Record-level classification hiện là bundle-level, chưa phải per-record thật"). `confidential` của
 * bundle-level được coi tương đương `restricted` ở mức projection (cả hai đều "không bao giờ public").
 */
export type PublicRecordClassification = 'public' | 'internal' | 'restricted';

export interface HasOptionalRecordClassification {
  recordClassification?: PublicRecordClassification;
}

export interface PublicFieldAllowlist {
  policyVersion: string;
  entities: Record<CanonicalEntityKind, readonly string[]>;
}

export type ProjectionRemovalKind = 'record-removed' | 'field-removed';

export interface ProjectionReportEntry {
  entityKind: CanonicalEntityKind;
  recordId: string;
  kind: ProjectionRemovalKind;
  fieldName?: string;
  reason: string;
  classification: PublicRecordClassification;
  policyRule: string;
}

export interface ProjectionReport {
  projectionVersion: string;
  generatedAt: string;
  entries: readonly ProjectionReportEntry[];
}

export type ProjectionCountsByEntity = Record<CanonicalEntityKind, number>;

export interface ProjectionManifest {
  projectionVersion: string;
  schemaVersion: string;
  sourceBundleVersion: string;
  generatedAt: string;
  sourceNormalizedContentChecksum: string;
  projectedContentChecksum: string;
  allowedFieldPolicyVersion: string;
  recordCountsBefore: ProjectionCountsByEntity;
  recordCountsAfter: ProjectionCountsByEntity;
  fieldRemovalCounts: ProjectionCountsByEntity;
  recordRemovalCounts: ProjectionCountsByEntity;
  sourceDatasetIds: readonly string[];
  outputDatasetIds: readonly string[];
  /** Checksum của publication-decision set đã dùng (xem `publicationDecision.ts`, Phase 7) — `null`
   * khi projection chạy KHÔNG kèm publication-decision set (hành vi Phase 6 gốc: mọi record mặc định
   * public trừ khi tự khai `recordClassification`). Field optional để không phá manifest cũ đã ghi
   * trước Phase 7 (đọc lại một manifest Phase 6 vẫn hợp lệ, chỉ thiếu field này). */
  publicationDecisionSetChecksum?: string | null;
}

/** Phiên bản của CHÍNH cơ chế projection (thuật toán/quy tắc cascade) — khác `allowedFieldPolicyVersion`
 * (chỉ đổi khi nội dung allowlist đổi). Bump khi thay đổi thuật toán projection theo cách ảnh hưởng
 * tới output (vd. thêm bước cascade mới) — cho phép so sánh hai bundle được sinh bởi hai phiên bản
 * engine khác nhau mà không cần diff nội dung. */
export const PROJECTION_ENGINE_VERSION = '1.0.0';
