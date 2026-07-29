/**
 * Canonical wire-format cho toàn bộ project portfolio — Phase 3
 * (docs/project-data-import/02-canonical-schema-proposal.md, ADR 0006). Đây là DTO/transport shape,
 * KHÔNG phải domain type — domain type (`Project`, `WorkPackage`, ...) trong `types.ts` không tự
 * động là wire contract (xem "API contract gate" trong docs/domain-model.md). File này chỉ định
 * hình dạng JSON mà một canonical bundle phải có; JSON Schema mirror tay nằm ở
 * `data-templates/schemas/project-portfolio-bundle.schema.json` + `data-templates/schemas/definitions/`.
 *
 * Khác với ví dụ tham khảo ban đầu (schemaVersion/bundleVersion là sibling của `metadata`): quyết
 * định giữ `schemaVersion`/`bundleVersion` ở TOP-LEVEL (không lồng trong `metadata`) để một consumer
 * có thể kiểm tra tương thích phiên bản TRƯỚC KHI phải parse phần còn lại của payload — đây là lý do
 * thực dụng, không phải khác biệt tuỳ tiện. `metadata` chỉ chứa các field mô tả CÒN LẠI, không lặp
 * lại schemaVersion/bundleVersion.
 *
 * `validAdministrativeCodes` KHÔNG có mặt trong bundle — quyết định khác với wire format tạm thời
 * của Phase 2 (`GeneratedProjectPortfolioBundleFile` trong generatedJsonProjectPortfolioSource.ts).
 * Lý do: danh sách mã hành chính hợp lệ đã có sẵn trong GIS artifact (`daklak-labels.json`) mà
 * `IllustrativeProjectPortfolioSource` đã dùng — nhúng lại một bản sao trong mỗi canonical bundle
 * tạo ra hai nguồn sự thật có thể lệch nhau (đúng rủi ro đã ghi trong
 * docs/project-data-import/03-importer-design.md mục "Mã hành chính"). `administrativeCodeVersion`
 * trong metadata chỉ là một khai báo tham chiếu ("bundle này được kiểm tra theo phiên bản mã hành
 * chính nào"), không phải bản thân tập mã.
 */
import type {
  Agency,
  Contractor,
  Evidence,
  Milestone,
  ProgressSnapshot,
  Project,
  ProjectAuditEvent,
  ProjectIssue,
  ReferenceDocument,
  WorkPackage,
} from './types';

export const CANONICAL_BUNDLE_CLASSIFICATIONS = [
  'public',
  'internal',
  'confidential',
  'restricted',
] as const;
/** Bốn giá trị giống hệt `DataClassification` (`src/data-platform/schemas/dataset.ts`) — cố tình
 * KHÔNG import type đó: domain dự án độc lập với data-platform theo nguyên tắc đã ghi ở đầu
 * `types.ts` ("không tái dùng enum của nhau dù có vẻ giống nhau bề mặt"). Bốn giá trị này ổn định
 * (đã là taxonomy chuẩn toàn repo, xem docs/data-classification.md), rủi ro drift giữa hai union
 * 4-giá-trị giống hệt thấp hơn rủi ro import chéo layer. */
export type CanonicalBundleClassification = (typeof CANONICAL_BUNDLE_CLASSIFICATIONS)[number];

/**
 * Metadata mô tả bundle như một artifact — KHÔNG lặp lại `schemaVersion`/`bundleVersion` (đã ở
 * top-level, xem JSDoc đầu file).
 */
export interface CanonicalBundleMetadata {
  /** Thời điểm bundle được ghi ra (importer chạy / fixture được viết) — KHÔNG dùng làm điểm neo
   * nghiệp vụ, xem `asOf`. */
  generatedAt: string;
  /** Điểm neo nghiệp vụ "số liệu tính đến ngày nào" — deterministic, không phải `Date.now()`. */
  asOf: string;
  /** Dataset id (resolve qua `src/data-platform/catalog/datasets.ts`) đã góp phần vào bundle này. */
  sourceDatasetIds: readonly string[];
  /** Bundle này được validate administrativeAreaCodes theo phiên bản/checksum nào của
   * `daklak-labels.json` — KHÔNG phải bản thân danh sách mã (xem JSDoc đầu file). */
  administrativeCodeVersion: string;
  /** Classification ở CẤP BUNDLE, không lặp lại trên từng record (quyết định Phase 1, xem
   * docs/project-data-import/02-canonical-schema-proposal.md §1). */
  classification: CanonicalBundleClassification;
  /** Hệ thống/quy trình nào sinh ra bundle này — vd 'phase3-manual-example',
   * 'phase4-importer@1.2.0'. Chuỗi tự do có ý nghĩa, không phải enum kín (không dự đoán hết mọi
   * producer tương lai). */
  producer: string;
  description?: string;
}

/**
 * 10 nhóm dữ liệu theo phạm vi Phase 3. `auditEvents` optional/deferred — `ProjectAuditEvent` chưa
 * có UI hay use case tiêu thụ thật nào (không có emitter, không có consumer) ngoài việc tồn tại như
 * một type — xem ADR 0006 mục "auditEvents deferred".
 */
export interface CanonicalProjectPortfolioDatasets {
  agencies: Agency[];
  contractors: Contractor[];
  projects: Project[];
  workPackages: WorkPackage[];
  milestones: Milestone[];
  projectIssues: ProjectIssue[];
  progressSnapshots: ProgressSnapshot[];
  evidence: Evidence[];
  referenceDocuments: ReferenceDocument[];
  auditEvents?: ProjectAuditEvent[];
}

export interface CanonicalProjectPortfolioBundle {
  schemaVersion: string;
  bundleVersion: string;
  metadata: CanonicalBundleMetadata;
  datasets: CanonicalProjectPortfolioDatasets;
}

/** Chín nhóm dataset có thể chiếu (project) sang public bundle (Phase 6) — cố tình KHÔNG gồm
 * `auditEvents` (không bao giờ public, xem docs/project-data-import/public-projection-policy.md).
 * Tách khỏi `keyof CanonicalProjectPortfolioDatasets` để dùng được làm runtime value (danh sách lặp
 * qua được), không chỉ type-level. */
export const CANONICAL_ENTITY_KINDS = [
  'agencies',
  'contractors',
  'projects',
  'workPackages',
  'milestones',
  'projectIssues',
  'progressSnapshots',
  'evidence',
  'referenceDocuments',
] as const;
export type CanonicalEntityKind = (typeof CANONICAL_ENTITY_KINDS)[number];

/**
 * Schema-versioning policy (ADR 0006, docs/project-data-import/schema-versioning-policy.md):
 * - Major thay đổi khi: xoá field, đổi kiểu field, thu hẹp enum, đổi semantics phá compatibility.
 * - `SUPPORTED_CANONICAL_SCHEMA_VERSIONS` là allowlist tường minh — một version không có trong danh
 *   sách này (kể cả version "tương lai" lớn hơn) bị từ chối, không được parse "best-effort".
 */
export const CANONICAL_PROJECT_PORTFOLIO_SCHEMA_VERSION = '1.0.0';
export const SUPPORTED_CANONICAL_SCHEMA_VERSIONS: readonly string[] = ['1.0.0'];

export function isSupportedCanonicalSchemaVersion(version: string): boolean {
  return SUPPORTED_CANONICAL_SCHEMA_VERSIONS.includes(version);
}
