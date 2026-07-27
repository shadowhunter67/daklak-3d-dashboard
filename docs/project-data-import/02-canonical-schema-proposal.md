# Canonical schema proposal — 10 dataset (Phase 1 design)

Trạng thái: **Phase 3 đã triển khai** — xem
[ADR 0006](../adr/0006-canonical-project-portfolio-data-contract.md) và
[canonical-data-dictionary.md](canonical-data-dictionary.md) cho field list thật (khớp gần như
hoàn toàn với đề xuất dưới đây — sai lệch duy nhất đáng chú ý: canonical bundle KHÔNG mang
`validAdministrativeCodes`, dùng trực tiếp `daklak-labels.json` thay vì nhúng bản sao — xem ADR 0006
quyết định 1). Thư mục thật là `data-templates/schemas/definitions/` + `project-portfolio-bundle.schema.json`
(không phải `data-templates/schemas/project-domain/*` như dự kiến ban đầu). Phần còn lại của tài
liệu Phase 1 dưới đây giữ nguyên làm hồ sơ thiết kế.

## 1. Nguyên tắc bao trùm

- **9 trong 10 canonical dataset đã có TS type tương ứng** trong `src/entities/project/types.ts`
  (`Project`, `WorkPackage`, `Milestone`, `ProjectIssue`, `ProgressSnapshot`, `Agency`, `Contractor`,
  `Evidence`, `ReferenceDocument`). Canonical schema = JSON Schema **mirror tay** của các type này +
  field provenance bổ sung, theo đúng pattern đã chứng minh ở `data-templates/schemas/` (không tự
  sinh JSON Schema từ TS — quyết định đã có tiền lệ trong `docs/data-platform-architecture.md`: "hand-
  written, matching how... `datasetManifest.ts` already works", tránh thêm dependency
  ts-json-schema-generator).
- `audit-events-demo` là dataset thứ 10 — ánh xạ tới `ProjectAuditEvent` (đã có type), nhưng **chưa
  từng được đóng gói như một "dataset" có schemaVersion/canonical form** — đây là phần mới nhất
  trong 10 dataset.
- Mọi thay đổi type đề xuất dưới đây là **additive only** (field mới luôn optional trừ khi ghi rõ) —
  không đổi tên, không đổi kiểu field đã có, để không phá `illustrativeProjectPortfolio.ts`,
  `illustrativeProjectPortfolio.test.ts`, hay bất kỳ test hiện có nào.
- `classification` đặt ở **cấp dataset** (qua `DatasetDescriptor` trong `data-platform/catalog/
datasets.ts`, theo đúng pattern Phase 1.5 đã làm cho `project-portfolio-illustrative` /
  `project-progress-illustrative` / `project-issues-illustrative`), **không** đặt lặp lại trên từng
  record — tránh một khái niệm "canonical" bị định nghĩa hai lần ở hai cấp khác nhau. Mỗi canonical
  dataset mới (work-packages, milestones, agencies, contractors, evidence, reference-documents,
  audit-events-demo) cần một `DatasetDescriptor` riêng, mirror đúng cách 3 dataset hiện có đã đăng ký.

## 2. Bảng 10 dataset

| #   | Canonical dataset id  | TS type             | Trạng thái field provenance hiện tại                                                                   | Field cần thêm (additive)                                                                                                                                                                                 |
| --- | --------------------- | ------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `projects`            | `Project`           | Đầy đủ: `dataUpdatedAt`, `dataOwner`, `sourceDatasetId`, `confidence`, `verificationStatus`            | Không cần thêm — chỉ cần JSON Schema mirror                                                                                                                                                               |
| 2   | `work-packages`       | `WorkPackage`       | **Không có field provenance nào**                                                                      | `sourceDatasetId`, `sourceRecordId?`, `observedAt?`, `verificationStatus?`, `confidence?`, `dataOwner?`                                                                                                   |
| 3   | `milestones`          | `Milestone`         | **Không có field provenance nào**                                                                      | Giống work-packages                                                                                                                                                                                       |
| 4   | `project-issues`      | `ProjectIssue`      | Có `sourceDatasetId` (Phase 1.5)                                                                       | `sourceRecordId?`, `observedAt?` (dùng `openedAt` làm mặc định nếu thiếu), `verificationStatus?`, `confidence?`, `dataOwner?`                                                                             |
| 5   | `progress-snapshots`  | `ProgressSnapshot`  | Đầy đủ: `sourceDatasetId`, `sourceRecordId`, `importedAt`, `verificationStatus`, `observedAt`          | `confidence?`, `dataOwner?`                                                                                                                                                                               |
| 6   | `agencies`            | `Agency`            | Không có                                                                                               | `sourceDatasetId?`, `dataOwner?` (agency/contractor là dữ liệu tham chiếu ít thay đổi — provenance có thể lỏng hơn, xem mục 3)                                                                            |
| 7   | `contractors`         | `Contractor`        | Không có                                                                                               | Giống agencies                                                                                                                                                                                            |
| 8   | `evidence`            | `Evidence`          | `sourceDatasetId?` (đã optional)                                                                       | `capturedAt` nên bắt buộc thay vì optional khi qua importer (ghi rõ trong template là "khuyến nghị bắt buộc"), `dataOwner?`                                                                               |
| 9   | `reference-documents` | `ReferenceDocument` | Không có                                                                                               | `sourceDatasetId?`, `verificationStatus?` (khác `legalStatus` đã có — hai trục độc lập, xem docs/data-classification.md "Evidence level vs verification status" áp dụng tương tự ở đây)                   |
| 10  | `audit-events-demo`   | `ProjectAuditEvent` | Có `occurredAt`, không có `sourceDatasetId`/`confidence` (hợp lý — audit event không cần "độ tin cậy") | Không thêm field nghiệp vụ; chỉ cần khung dataset (`schemaVersion`, `DatasetDescriptor` riêng, `classification: 'internal'` mặc định vì đây luôn là dữ liệu minh hoạ mô phỏng, không phải audit log thật) |

## 3. Vì sao Agency/Contractor không cần provenance đầy đủ như Project

Agency/Contractor là **dữ liệu tham chiếu** (reference data — tên cơ quan, mã số thuế nhà thầu), gần
với "danh mục" hơn là "quan sát tại một thời điểm". Áp `observedAt`/`verificationStatus` đầy đủ như
`ProgressSnapshot` sẽ tạo ra field vô nghĩa (một cơ quan quản lý không có "verification status" theo
nghĩa dữ liệu vận hành). Đề xuất: chỉ thêm `sourceDatasetId?` (biết bản ghi đến từ import nào) +
`dataOwner?` (ai chịu trách nhiệm cập nhật danh mục này) — đủ để trace, không thừa field.

## 4. Enum bổ sung cần cho geometry (mở rộng `ProjectGeometry`)

Theo gap 3.2 trong 00-gap-analysis.md — đề xuất Phase 3:

```ts
// MỚI — additive, union mở rộng
export interface ProjectLineGeometry {
  type: 'LineString';
  coordinates: [number, number][];
}
export type ProjectGeometry = ProjectPointGeometry | ProjectLineGeometry | ProjectPolygonGeometry;

export const GEOMETRY_SOURCES = [
  'surveyed',
  'design-drawing',
  'administrative-boundary-derived',
  'approximate-manual',
  'unknown',
] as const;
export type GeometrySource = (typeof GEOMETRY_SOURCES)[number];

// MỚI — sibling field ở Project, KHÔNG lồng vào trong ProjectGeometry để giữ ProjectGeometry
// tương thích GeoJSON thuần (component render map có thể tiếp tục dùng project.geometry trực tiếp
// làm GeoJSON mà không cần bóc tách field lạ ra trước).
export interface ProjectGeometryMetadata {
  source: GeometrySource;
  confidence: DataConfidence; // tái dùng enum đã có, không tạo enum "geometry confidence" riêng
  approximate: boolean;
  /** Bắt buộc hiển thị ở UI khi approximate=true — "ranh giới minh hoạ, không phải ranh giới pháp lý
   * chính thức". Không tự suy luận text này trong component — importer/fixture cung cấp câu chữ đã
   * duyệt, tránh mỗi nơi paraphrase một kiểu. */
  legalStatusDisclaimer?: string;
}

// Project.geometry: giữ nguyên. Thêm field mới, optional:
// geometryMetadata?: ProjectGeometryMetadata;
```

## 5. Bundle wire format

```ts
export interface ProjectPortfolioBundleFile {
  schemaVersion: string; // vd "1.0.0" — version của SHAPE bundle này, độc lập bundleVersion
  bundleVersion: string; // vd "2026.07.27-01" — tăng mỗi lần importer chạy thành công
  generatedAt: string; // ISO 8601, thời điểm importer ghi file — KHÔNG dùng làm asOf nghiệp vụ
  asOf: string; // ISO 8601, truyền qua --as-of, điểm neo nghiệp vụ
  bundles: ProjectBundle[];
  agencies: Agency[];
  contractors: Contractor[];
  evidence: Evidence[];
  referenceDocuments: ReferenceDocument[];
  auditEventsDemo: ProjectAuditEvent[];
  validAdministrativeCodes: string[]; // serialize từ Set — JSON không có Set
}
```

`schemaVersion` khác `bundleVersion`: `schemaVersion` đổi khi **cấu trúc** field đổi (breaking cho
consumer), `bundleVersion` đổi ở **mỗi lần chạy importer thành công** kể cả khi schema không đổi
(dùng để so sánh "bundle này có mới hơn bundle trước không" trong Data Readiness UI).

## 6. Quy tắc chung áp cho mọi field khi viết JSON Schema

- Ngày: `"format": "date"` (YYYY-MM-DD) cho field chỉ có ngày (`plannedDate`, `startDate`...), hoặc
  `"format": "date-time"` (ISO 8601 đầy đủ có timezone) cho field có thời điểm (`observedAt`,
  `importedAt`, `occurredAt`). Không trộn hai format trong cùng một field ở các bản ghi khác nhau —
  importer từ chối nếu phát hiện định dạng khác ISO 8601 (xem 03-importer-design.md mục "date
  parsing").
- Tiền tệ: `"type": "integer", "minimum": 0, "maximum": 9007199254740991` (Number.MAX_SAFE_INTEGER) —
  đúng 4 điều kiện `isValidVndAmount()` hiện có, không thêm điều kiện mới.
- Optional field vắng mặt: `null` (JSON `null` tường minh) hoặc key vắng mặt hoàn toàn — **không bao
  giờ** chuỗi rỗng `""` hay số `0` để biểu diễn "thiếu". Importer chịu trách nhiệm coerce cell CSV
  rỗng → `null`/vắng mặt tại field cho phép; nếu field **không** cho phép null (required), cell rỗng
  là **lỗi**, không phải "giá trị mặc định".
- Enum: liệt kê `"enum": [...]` đúng y hệt các mảng `PROJECT_STATUSES`/`WORK_PACKAGE_STATUSES`/...
  hiện có trong `types.ts` — JSON Schema không tự suy ra từ TS `as const`, phải copy tay và có drift
  test (mục 7).
- `required`/optional: theo đúng dấu `?` hiện có trong interface TypeScript — không tự ý nới lỏng
  hay siết chặt so với type hiện tại khi viết schema lần đầu (mọi thay đổi `required` là quyết định
  domain riêng, không phải quyết định "viết schema").

## 7. Drift guard

Mirror đúng pattern `schemaDriftGuard.test.ts`:

```
data-templates/schemas/project-domain/
  project.schema.json
  work-package.schema.json
  milestone.schema.json
  project-issue.schema.json
  progress-snapshot.schema.json
  agency.schema.json
  contractor.schema.json
  evidence.schema.json
  reference-document.schema.json
  audit-event-demo.schema.json
  project-portfolio-bundle.schema.json   # wire format tổng, mục 5

data-templates/fixtures/project-domain/
  valid/    (≥1 file mỗi entity — tối thiểu 10)
  invalid/  (≥1 file mỗi loại lỗi importer phải bắt — xem 03-importer-design.md mục test)
```

Test mới `src/entities/project/validation/projectSchemaDriftGuard.test.ts` — chạy Ajv trên các schema
này + đối chiếu với `validateProjectRecord`/`validateWorkPackageRecord`/... hiện có trên cùng fixture,
y hệt cơ chế `schemaDriftGuard.test.ts` gốc (không phát minh cơ chế thứ hai).

## 8. Việc KHÔNG làm trong canonical schema (giữ đúng phạm vi)

- Không tạo `Money` value object (mục 5, 00-gap-analysis.md).
- Không thêm `classification` per-record.
- Không tự sinh JSON Schema từ TypeScript bằng tool (giữ hand-written, có drift guard bù lại).
- Không thêm field cho các nhu cầu chưa phát sinh (đa tiền tệ, đa đơn vị hành chính ngoài Đắk Lắk,
  approval workflow nhiều bước) — chỉ thêm field 00-gap-analysis.md đã chỉ rõ là gap thật.
