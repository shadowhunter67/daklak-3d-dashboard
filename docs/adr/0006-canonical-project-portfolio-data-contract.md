# ADR 0006 — Canonical project portfolio data contract

- Status: accepted
- Date: 2026-07-27
- Liên quan: [ADR 0005](0005-project-portfolio-source-abstraction.md),
  [docs/project-data-import/](../project-data-import/) (Phase 1-3),
  [docs/domain-model.md](../domain-model.md) ("Phase 3 — API contract gate")

## Bối cảnh

Sau Phase 2, `GeneratedJsonProjectPortfolioSource` đọc một wire-format tạm thời
(`GeneratedProjectPortfolioBundleFile`) — dataset đã gom sẵn theo `bundles: ProjectBundle[]`
(project-oriented), không versioned, không có JSON Schema, không phân biệt rõ ràng giữa validation
cấu trúc và validation nghiệp vụ. `docs/domain-model.md` đã tự ghi trước điều kiện "API contract
gate": cần JSON Schema có version + mapper DTO→domain tường minh + contract test trước khi có nguồn
dữ liệu khác ngoài bundled fixture — Phase 2's wire format tạm thời chưa thoả điều kiện này đầy đủ.

Mục tiêu Phase 3: một canonical data contract versioned, machine-readable, đủ để Phase 4 xây offline
importer mà không sửa domain/UI.

## Quyết định 1 — Canonical bundle dataset-oriented, không project-oriented

```ts
interface CanonicalProjectPortfolioBundle {
  schemaVersion: string;
  bundleVersion: string;
  metadata: CanonicalBundleMetadata;
  datasets: {
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
  };
}
```

Khác với ví dụ tham khảo ban đầu ở hai điểm, cả hai đều có lý do thực dụng, không phải khác biệt tuỳ
tiện:

1. **`schemaVersion`/`bundleVersion` ở TOP-LEVEL, không lồng trong `metadata`** — một consumer có
   thể kiểm tra tương thích phiên bản (allowlist) TRƯỚC KHI phải parse phần còn lại của payload.
2. **Không có field `validAdministrativeCodes`** — danh sách mã hành chính hợp lệ đã có sẵn trong
   GIS artifact thật (`daklak-labels.json`), mà `IllustrativeProjectPortfolioSource` đã dùng. Nhúng
   một bản sao trong mỗi canonical bundle tạo ra hai nguồn sự thật có thể lệch nhau —
   `GeneratedJsonProjectPortfolioSource` (Phase 3) đọc CÙNG file GIS đó, không đọc từ bundle.
   `metadata.administrativeCodeVersion` chỉ là một khai báo tham chiếu phiên bản, không phải bản
   thân dữ liệu.

Dataset-oriented (mảng phẳng theo loại entity, không gom sẵn theo project) được chọn vì đây là hình
dạng tự nhiên của CSV/import thật (Phase 4) — mỗi file CSV tương ứng một mảng. Một mapper tường minh
(`groupCanonicalDatasetsIntoProjectBundles`,
`src/entities/project/canonicalBundleMapper.ts`) chuyển sang `ProjectBundle[]` (project-oriented) mà
domain KPI/validation hiện có tiêu thụ — đúng điều kiện #2 của "API contract gate": không dùng domain
type trực tiếp làm response shape, luôn có bước map tường minh.

## Quyết định 2 — Ba lớp kiểm định tách biệt, không gộp

```text
Layer 1 (JSON Schema, data-templates/schemas/)         → shape, type, enum, required field
Layer 2 (validateProject.ts, đã có, KHÔNG viết lại)     → semantic một record độc lập
Layer 3 (dataQualityRules.ts, đã có, KHÔNG viết lại)    → cross-record: FK, trùng khoá, mã hành chính, stale
```

`GeneratedJsonProjectPortfolioSource` chỉ thêm Layer 1 (nhẹ, không phải Ajv đầy đủ — xem quyết định 3) rồi GỌI LẠI nguyên vẹn Layer 2 (`validateProjectRecord`/...) — không viết song song bất kỳ business
rule nào. Ba file ví dụ invalid (`broken-foreign-key.json`, `duplicate-id.json`,
`invalid-administrative-code.json`) cố tình PASS Layer 1 để minh hoạ ranh giới này — xem
`data-templates/examples/README.md`.

## Quyết định 3 — Ajv chỉ chạy Node tooling/test, không vào browser bundle (Option A)

`GeneratedJsonProjectPortfolioSource.ts` (browser-reachable) KHÔNG import `ajv`/`ajv-formats` — chỉ
có một type-guard tối thiểu (đủ để không throw khi truy cập field) + kiểm tra
`schemaVersion` nằm trong allowlist. JSON Schema validation ĐẦY ĐỦ chạy ở
`scripts/validate_project_data_contract.mjs` (Node, dev-time/CI), theo đúng tiền lệ
`schemaDriftGuard.test.ts` đã dùng Ajv chỉ trong `devDependencies`, không reachable từ
`src/main.tsx` — `npm run validate:public-build` xác nhận điều này không đổi.

## Quyết định 4 — Enum trong JSON Schema copy tay từ `types.ts`, cross-check bằng drift guard

`data-templates/schemas/definitions/*.schema.json` là JSON Schema hand-written (draft-07), mirror
tay từ `src/entities/project/types.ts` — không tự sinh từ TypeScript (theo tiền lệ
`docs/data-platform-architecture.md` đã quyết định cho data-platform, áp dụng lại ở đây, không phát
minh cách khác). Drift guard (`src/entities/project/validation/projectSchemaDriftGuard.ts` +
`.test.ts`) là một mirror TS THỨ HAI (không phải cùng file với domain validator) lấy enum TRỰC TIẾP
từ `types.ts` (không copy tay giá trị lần hai) — nếu JSON Schema (copy tay) và `types.ts` (nguồn
thật) lệch nhau, fixture enum-mutation trong test sẽ lộ ra ngay vì hai validator bất đồng.

## Quyết định 5 — `auditEvents` deferred/optional trong canonical bundle

`ProjectAuditEvent` có type đầy đủ (`types.ts`) nhưng KHÔNG có emitter thật, không có UI tiêu thụ,
không có test nào ngoài schema drift guard. Canonical schema VẪN bao gồm nó (theo đúng phạm vi "10
nhóm dữ liệu" yêu cầu — dataset thứ 10, `project-audit-events-demo`) nhưng đánh dấu optional ở cả
TypeScript (`auditEvents?:`) lẫn JSON Schema — không bắt buộc mọi bundle phải có mảng này. Đây là
schema cho một dataset **demo/tương lai**, không phải một dataset đang được dùng thật.

## Quyết định 6 — Provenance field mở rộng: additive, optional, không đồng loạt required

`WorkPackage`/`Milestone` trước Phase 3 không có field provenance nào. Thêm
`sourceDatasetId?`/`sourceRecordId?`/`observedAt?`/`verificationStatus?`/`confidence?`/`dataOwner?`
— TẤT CẢ optional, không phải required. Lý do: bắt buộc required sẽ phá vỡ
`illustrativeProjectPortfolio.ts` (839 dòng, ~19 record WorkPackage/Milestone không có các field
này) ngay lập tức, đòi hỏi một lần sửa hàng loạt không có use case cụ thể ở Phase 3 (rule "không thêm
provenance field vào mọi entity nếu chưa có use case và compatibility analysis" — use case THẬT chỉ
xuất hiện ở Phase 4 khi có dữ liệu ngoài cần trace). `ProgressSnapshot`/`ProjectIssue` (đã có
provenance một phần từ trước) chỉ được bổ sung phần thiếu (`confidence?`/`dataOwner?`), cùng nguyên
tắc additive.

## Quyết định 7 — Mở rộng geometry: `LineString` + `geometryMetadata`

Xem [docs/project-data-import/geometry-contract.md](../project-data-import/geometry-contract.md)
cho chi tiết. Tóm tắt quyết định: `ProjectGeometry` mở rộng thêm `LineString` (route/tuyến — gap cấu
trúc thật đã ghi từ Phase 1), `geometryMetadata` là sibling field riêng (không lồng vào geometry) để
giữ `project.geometry` là GeoJSON thuần cho component render bản đồ.

## Quyết định 8 — Error kind mới: `unsupported-schema-version`

`ProjectDataErrorKind` (đã có từ Phase 2A) mở rộng thêm `unsupported-schema-version`, tách khỏi
`schema-invalid` (sai HÌNH DẠNG) — một bundle có `schemaVersion` hợp lệ về cú pháp (semver) nhưng
không nằm trong `SUPPORTED_CANONICAL_SCHEMA_VERSIONS` trả kind riêng này, không parse "best-effort".
`ERROR_KIND_MESSAGE_KEY` (`ExecutiveOverview.tsx`) đã có fallback `?? .unknown` từ trước — kind mới
không cần thêm message key riêng ngay (không sửa UI ngoài phần cần thiết).

## Hệ quả

- `data-templates/schemas/` có cấu trúc `definitions/` (10 entity + `common.schema.json` shared) +
  `project-portfolio-bundle.schema.json` top-level, dùng $ref cross-file (test xác nhận resolve
  đúng, xem `projectSchemaDriftGuard.test.ts` "compiles every entity schema").
- `data-templates/fixtures/project-domain/{valid}/` (10 fixture + 1 bundle) +
  `data-templates/examples/{minimal-valid,representative-valid,invalid}/` (13 file) +
  `data-templates/csv/` (9 template header-only, geometry deferred sang JSON — xem
  `field-mapping-guide.md` khi Phase 4/6 viết).
- `npm run validate:project-data-contract` (mới) — deterministic, offline, wired vào
  `quality:frontend`.
- `GeneratedJsonProjectPortfolioSource` tiêu thụ canonical bundle qua
  `groupCanonicalDatasetsIntoProjectBundles` — fixture Phase 2 (dataset đã gom sẵn) được thay bằng
  fixture Phase 3 (dataset-oriented, canonical shape thật).
- Không thêm database/backend/authentication/importer CLI hoàn chỉnh — importer CSV/XLSX parsing vẫn
  là Phase 4, chưa triển khai.
