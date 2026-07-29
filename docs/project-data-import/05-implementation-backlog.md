# Implementation backlog — Phase 2 → 7

Trạng thái: **Phase 2, 3, 4, 5, 6 hoàn thành** — xem [ADR 0005](../adr/0005-project-portfolio-source-abstraction.md),
[ADR 0006](../adr/0006-canonical-project-portfolio-data-contract.md),
[ADR 0007](../adr/0007-offline-project-data-importer-and-last-known-good-promotion.md),
[ADR 0008](../adr/0008-demo-scenario-strategy-and-data-readiness-experience.md),
[ADR 0009](../adr/0009-public-projection-and-ui-review-gate.md),
[ADR 0010](../adr/0010-representative-pilot-and-fail-closed-publication-decisions.md). "Phase 6" trong
tài liệu này (mục cuối, "Integration kit and hardening") là đề xuất GỐC, đã lỗi thời — phần lớn nội
dung của nó được kéo lên làm ở Phase 5 (xem ADR 0008). Phase 6 THẬT SỰ đã triển khai là public
projection engine + leakage-guard hardening + authoritative-snapshot explanation + Codex UI review
gate — xem ADR 0009, không phải đề xuất còn lại bên dưới mục "Phase 6" của file này. Phase 7 (mới,
xem cuối file) đóng 5 finding của một bản review độc lập chạy sau Phase 6: representative pilot
rehearsal qua importer thật (F-001), publication-decision fail-closed (F-002), CI gate còn thiếu
(F-003), UI verification với dữ liệu pilot (F-004 một phần), approval receipt buộc checksum (F-005).

## Phase 2 — Source abstraction and profiles — ĐÃ LÀM

Triển khai thật khác 2 điểm so với danh sách gốc dưới đây (chi tiết + lý do ở ADR 0005):
`getMetadata()` được thêm vào interface (mục 3 gốc quyết định không thêm); composition root dùng
`resolve.alias` của Vite (`src/app/resolveActivePortfolioSourceModule.ts` +
`src/data/activePortfolioSource.{demo,generatedJson}.ts`) thay vì `switch` runtime đọc
`import.meta.env` — một `switch` runtime không đủ để Rollup tree-shake dữ liệu minh hoạ khỏi bundle
`internal-static`, xác nhận bằng build thật trước khi đổi cơ chế. Danh sách gốc (mục 1-9 dưới đây)
giữ nguyên làm hồ sơ — đối chiếu với ADR 0005 để biết phần nào đã đổi khi thực làm.

1. Đổi tên `BundledProjectPortfolioSource` → `IllustrativeProjectPortfolioSource` (file
   `src/data/projectPortfolioSource.ts`), giữ alias export tạm nếu cần.
2. Thêm `ProjectPortfolioBundleMetadata` + field `metadata` vào `ProjectPortfolio`
   (`src/entities/project/adapters/ProjectPortfolioSource.ts`) — additive.
3. Viết `GeneratedJsonProjectPortfolioSource` (chưa có input thật để đọc ở Phase 2 — dùng fixture
   JSON tối thiểu để test, chưa cần importer thật xong; Phase 4 mới nối importer thật).
4. Viết `HttpProjectPortfolioSourceContract` — interface + JSDoc only, đặt cạnh
   `ProjectPortfolioSource.ts`.
5. `src/app/createProjectPortfolioSource.ts` — composition root, đọc `import.meta.env`.
6. Sửa 3 call site (`ExecutiveOverview.tsx`, `ProjectPortfolioView.tsx`, `ProjectDetailView.tsx`) từ
   `new BundledProjectPortfolioSource()` sang `createProjectPortfolioSource()`.
7. Mở rộng `importBoundary.test.ts`: cấm domain layer import bất kỳ file `adapters/*Source*` nào.
8. Boundary test mới: build với `VITE_PORTFOLIO_PROFILE=internal-static` không được resolve
   `IllustrativeProjectPortfolioSource`/`illustrativeProjectPortfolio.ts` vào graph import.
9. Chạy `npm run quality` đầy đủ trước khi merge — không bỏ qua bước này (00-gap-analysis.md §6 ghi
   rõ lần chạy đầy đủ gần nhất đã xanh, nhưng Phase 2 thay đổi code thật nên phải chạy lại).

## Phase 3 — Canonical schemas and templates — ĐÃ LÀM

Triển khai thật khớp gần hoàn toàn danh sách gốc dưới đây, trừ: (a) không đăng ký `DatasetDescriptor`
riêng cho work-packages/milestones/agencies/contractors/evidence/reference-documents/audit-events —
canonical schema đủ để `GeneratedJsonProjectPortfolioSource` hoạt động mà không cần 7 descriptor mới
(chỉ 1 descriptor tổng cho fixture generated-json, đã có từ Phase 2); (b) thư mục schema thật là
`data-templates/schemas/definitions/` (không phải `.../project-domain/`); (c) `data-templates/README.md`
KHÔNG được sửa (tài liệu Phase 3 mới nằm ở `docs/project-data-import/` thay vì mở rộng file đó) — xem
[ADR 0006](../adr/0006-canonical-project-portfolio-data-contract.md) cho đầy đủ lý do từng quyết
định. Danh sách gốc giữ nguyên làm hồ sơ:

1. Thêm field provenance additive vào `types.ts`: `WorkPackage`/`Milestone` (mới hoàn toàn),
   `ProjectIssue`/`ProgressSnapshot` (bổ sung phần thiếu), `Agency`/`Contractor` (tối giản),
   `Evidence`/`ReferenceDocument` (theo 02-canonical-schema-proposal.md §2-3).
2. Export `isValidVndAmount` khỏi `validateProject.ts` (đổi 1 từ khoá).
3. Thêm `ProjectLineGeometry` vào `ProjectGeometry` union + `ProjectGeometryMetadata` sibling field
   (02-canonical-schema-proposal.md §4) — mở rộng `isValidProjectGeometry` tương ứng.
4. Viết 10 JSON Schema dưới `data-templates/schemas/project-domain/` + 1 schema wire-format bundle.
5. Viết `projectSchemaDriftGuard.test.ts` (mirror `schemaDriftGuard.test.ts`), fixture
   `data-templates/fixtures/project-domain/{valid,invalid}/`.
6. Đăng ký `DatasetDescriptor` mới cho các dataset chưa có (work-packages, milestones, agencies,
   contractors, evidence, reference-documents, audit-events-demo) trong
   `src/data-platform/catalog/datasets.ts`, theo đúng cách 3 dataset Phase 1.5 đã làm.
7. Viết `data-templates/README.md` bổ sung section cho project-domain (không thay thế nội dung cũ).
8. CSV template + `field-mapping-guide.md`-style column doc cho từng entity (nội dung chi tiết đưa
   vào `integration-kit/field-mapping-guide.md` ở Phase 6, nhưng cấu trúc CSV mẫu cần có từ Phase 3
   để Phase 4 (importer) có input thật để test).

## Phase 4 — Importer — ĐÃ LÀM

Triển khai thật khác danh sách gốc dưới đây ở vài điểm (chi tiết + lý do ở
[ADR 0007](../adr/0007-offline-project-data-importer-and-last-known-good-promotion.md)): chạy
TypeScript trực tiếp qua `tsx` thay vì build step riêng; import all-or-nothing theo TOÀN BỘ lần chạy
(không per-record partial-drop) thay vì "6. FK/duplicate-PK check + tiếp tục" ngầm định partial-accept;
phát hiện và vá một khoảng trống thật ở mapper Phase 3 (orphan child record bị mapper âm thầm loại bỏ
khỏi mọi bundle, không lỗi) bằng một integrity check riêng ở tầng importer. Danh sách gốc giữ nguyên
làm hồ sơ:

1. CSV/JSON reader thuần (unit test riêng, không phụ thuộc phần còn lại).
2. Normalize/trim/null-coercion/date-parser/VND-parser (unit test riêng).
3. Mapper CSV row → domain object (chưa validate nghiệp vụ).
4. FK/duplicate-PK/sourceRecordId/administrative-code check (đặc thù importer, không có ở domain
   layer hiện tại).
5. Nối `validateProjectRecord`/`runDataQualityRules`/`selectAuthoritativeSnapshot` (import trực
   tiếp từ `src/entities/project/`, qua `ssrLoadModule` — xem 03-importer-design.md §1).
6. Deterministic serialize + checksum (tái dùng `scripts/data-refresh/checksum.mjs`).
7. Manifest/report/rejected-records/summary generator.
8. CLI flag handling (`--dry-run`/`--as-of`/`--strict`) + exit code + last-known-good protection.
9. `npm run import:data` script alias trong `package.json`.
10. Test suite đầy đủ theo 03-importer-design.md §8, bao gồm golden-file integration test dựa trên
    `data-templates/examples/`.
11. `integration-kit/import-runbook.md` (nội dung chi tiết ở Phase 6, nhưng bản nháp runbook nên viết
    song song khi xây importer, không để dồn cuối).

## Phase 5 — Demo completeness, Data Readiness UI, integration kit — ĐÃ LÀM (thu hẹp phạm vi)

Triển khai thật khác đáng kể so với đề xuất đầy đủ dưới đây — xem
[ADR 0008](../adr/0008-demo-scenario-strategy-and-data-readiness-experience.md) cho lý do từng quyết
định thu hẹp phạm vi (24-40 project → 5 project bổ sung; không sửa `ProjectDetailView`/Executive
Overview reorder). Đã làm: `canonicalIntegrity.ts` (reusable integrity validator) + benchmark
deterministic + staging script test + `scenarioFactory.ts` + 5 project bổ sung + Data Readiness route
(`#/data-readiness`) + `integration-kit/` đầy đủ (đã chạy thật qua importer). Danh sách gốc dưới đây
giữ nguyên làm hồ sơ:

0. Việc hoãn từ Phase 4 (xem ADR 0007 + `docs/project-data-import/csv-contract.md`):
   - CSV header alias mapping (config `{"projects": {"project_code": "code"}}`) — Phase 4 chỉ chấp
     nhận canonical column name.
   - XLSX input format — chưa đánh giá dependency (license/security) vì chưa có nhu cầu vận hành cụ
     thể.
   - Per-record partial-import/quarantine (thay vì all-or-nothing theo toàn bộ lần chạy) — cần thiết
     kế lại rejected-records/report format nếu triển khai.
   - `geometry_json` CSV cell (JSON string trong 1 cột) cho geometry qua CSV — hiện phải dùng JSON
     mode nếu cần geometry.
   - Đổi tên `src/assets/data/project-portfolio.generated-fixture-demo.json` (tên kế thừa Phase 2/3,
     giờ có thể chứa dữ liệu import thật) — kéo theo sửa checksum/config/test tham chiếu path đó.
   - `--source-registry`/DATASET_CATALOG: chưa có UI/CLI để tự thêm `DatasetDescriptor` mới cho một
     `sourceDatasetId` lạ — vẫn phải sửa `src/data-platform/catalog/datasets.ts` thủ công.
   - `--last-known-good` auto-promote (tuỳ chọn copy `--output` mới vào vị trí baseline) — hiện chỉ
     so sánh, không ghi (xem `last-known-good-policy.md`).
1. Scenario factory (`src/entities/project/scenarioFactory.ts` hoặc tương tự) — hàm thuần sinh
   `ProjectBundle` theo tham số scenario, KHÔNG thay thế 9 project viết tay hiện có, chỉ **thêm**
   project mới qua factory để phủ 10 scenario còn thiếu (00-gap-analysis.md §3.6): unverified
   (`verificationStatus: 'raw'`), confidence `'unknown'`, multiple-verification-stage trong chính
   fixture (không chỉ unit test), conflicting progress sources, high-disbursement/low-progress, low
   disbursement (case tách biệt rõ), budget-exposure (xác nhận rõ project nào), route/line project
   (cần Phase 3 xong LineString trước), approximate geometry + geometry metadata, invalid-fixture
   file riêng cho test (`data-templates/fixtures/project-domain/invalid/`, không lẫn vào demo bundle).
2. Kiểm tra performance budget sau khi tăng số project minh hoạ — không vượt ngân sách hiện có
   (`npm run check:budget`).
3. Data Readiness UI (panel mới, ví dụ `src/features/data-readiness/` hoặc mở rộng
   `DataHealthPanel.tsx`): thêm asOf riêng biệt, bundle version, lần import gần nhất, completeness
   rate/verification rate (tính %, không chỉ đếm thô), "nguồn nào đang dùng cho KPI", link validation
   report — theo đúng field list 00-gap-analysis.md §3.7. Phải phân biệt validation error / quality
   warning / business alert **không chỉ bằng màu** (icon/label riêng, đã có tiền lệ `AlertList.tsx`
   phân biệt `kind`).
4. Project detail: thêm `verificationStatus`, `sourceRecordId`, `dataOwner` render, freshness badge,
   missing-inputs-per-KPI text, authoritative-snapshot explanation + danh sách non-selected
   snapshots, quality-issues section riêng (khác attention reasons), `ReferenceDocument`/`Evidence`
   render (00-gap-analysis.md §3.8).
5. Executive overview: rà lại thứ tự exception-first đã yêu cầu (dự án cần chú ý → cảnh báo nghiêm
   trọng → dữ liệu quá hạn → dữ liệu chưa xác minh → thay đổi từ kỳ trước → KPI tổng hợp → bản đồ) —
   đối chiếu với `ExecutiveOverview.tsx`/`executiveOverviewSelectors.ts` hiện tại, phần lớn đã đúng
   thứ tự theo ADR 0001 nhưng "thay đổi đáng kể từ kỳ trước" (so kỳ) **chưa có khái niệm** trong domain
   hiện tại (không có "kỳ trước" để so — cần ít nhất 2 bundle theo thời gian, phụ thuộc scenario
   factory sinh dữ liệu multi-period nếu muốn demo được mục này thật).

## Phase 6 — Integration kit and hardening

**Lưu ý**: mục 1 dưới đây (`integration-kit/`) thực ra đã được làm SỚM HƠN, ở Phase 5 (theo yêu cầu
thực tế của người vận hành đưa việc này vào Phase 5 thay vì Phase 6 như đề xuất gốc) — xem
`integration-kit/` đã tồn tại + [ADR 0008](../adr/0008-demo-scenario-strategy-and-data-readiness-experience.md).
Các mục 2+ dưới đây (leakage guard public-static, hardening) vẫn là đề xuất, chưa triển khai. Bổ sung
từ Phase 5 (việc bị hoãn có chủ đích, xem ADR 0008 quyết định 1):

0. Phase độ phủ scenario đầy đủ (24-40 project theo ma trận spec Phase 5 §B2, thay vì 5 project đã
   thêm) — nếu có nhu cầu demo phong phú hơn.
1. `ProjectDetailView` hiển thị đầy đủ authoritative-snapshot explanation per-project (snapshot được
   chọn/lý do chọn/snapshot cạnh tranh/KPI nào dùng) — hiện chỉ có ở mức business-alert message trong
   Data Readiness, chưa có UI per-project trong Project Detail (ADR 0008 quyết định 1, mục 2).
2. Rà soát lại thứ tự exception-first của Executive Overview theo spec Phase 5 §C7 — chỉ nếu có phản
   hồi thực tế cho thấy thứ tự hiện tại (đã quyết theo ADR 0001) cần đổi.
3. Sửa `scripts/validate_portfolio_data_mode.mjs` (Phase 2 leakage guard) để không dựa vào marker
   string cố định (`gen-fixture-001`) khi kiểm tra "build internal-static thực sự dùng
   GeneratedJsonProjectPortfolioSource" — phát hiện khi chạy `integration-kit/example-input/` qua
   importer thật + `stage:internal-portfolio` (Phase 5), guard báo false positive vì fixture thật đã
   thay marker đó. Cần kiểm tra cấu trúc build (import graph) thay vì nội dung string cụ thể.

4. Tạo `integration-kit/` đầy đủ (README, source-assessment-checklist, field-mapping-guide,
   canonical-data-dictionary, import-runbook, validation-rules, common-errors, deployment-profiles,
   example-input/, expected-output/) — phần lớn nội dung đã có bản nháp rải rác từ Phase 3-4, Phase 6
   là gom + hoàn thiện + review chéo, không viết từ số 0.
5. `config/public-project-fields.json` (hoặc mở rộng `config/public-data-files.json`) +
   `scripts/validate_internal_static_build.mjs` (không có dữ liệu minh hoạ lọt vào internal-static) +
   mở rộng leakage guard cho `public-static` (04-deployment-profiles-design.md §2).
6. Test leakage 2 chiều: "demo data không lọt vào internal-static", "field nội bộ không lọt vào
   public-static" — cả hai đều là test mới, không sửa test leakage cũ (`validate_public_build.mjs`
   giữ nguyên mục đích ban đầu của nó).
7. Chạy lại toàn bộ `npm run quality` + `npm run check:budget` + accessibility test hiện có, xác nhận
   không regression sau khi tăng scenario/thêm UI.
8. End-to-end import demonstration: một lần chạy thật `npm run import:data` trên
   `integration-kit/example-input/` → build `internal-static` → so sánh thủ công với
   `integration-kit/expected-output/` — ghi lại kết quả thật (không tuyên bố nếu chưa chạy).
9. README cập nhật 5 mục đã yêu cầu (How to replace illustrative data / import offline / build
   internal-static / build public-static / What this demo does not provide) — thêm mới, không xoá
   nội dung README hiện có.
10. ADR mới (0005 trở đi — số thứ tự xác nhận lại tại thời điểm viết, vì có thể có ADR khác được thêm
    giữa các phase): canonical import format, offline importer, deployment profiles (nguồn dữ liệu),
    project portfolio source abstraction, demo scenario strategy — mỗi ADR viết SAU khi phần tương
    ứng đã triển khai xong (đúng convention 4 ADR hiện có, luôn mô tả quyết định đã chốt, không mô tả
    dự định).

## Phase 7 — Representative pilot rehearsal, fail-closed publication decisions — ĐÃ LÀM (thu hẹp phạm vi)

Xem [ADR 0010](../adr/0010-representative-pilot-and-fail-closed-publication-decisions.md) cho lý do
quyết định. Triển khai thật:

1. `PublicationDecisionSet` (`src/entities/project/publicProjection/publicationDecision.ts`) +
   `requirePublicationDecisions` option trên `projectCanonicalBundleToPublic` — record không có quyết
   định bị loại (fail-closed) thay vì mặc định public khi bật; tắt (mặc định) giữ nguyên hành vi
   Phase 6.
2. `PublicApprovalReceipt` (`approvalReceipt.ts`) buộc chặt phê duyệt thủ công vào checksum chính xác
   của output — `stage_public_portfolio_bundle.ts --require-approval-receipt` từ chối stage khi
   receipt thiếu hoặc không khớp.
3. Pilot rehearsal CSV thật (`data-templates/pilot/phase7-integration-rehearsal/`) chạy qua
   `import:data` (strict) → `project:public-data` (fail-closed) → `stage:public-portfolio`
   (approval-receipt) — lần đầu tiên importer THẬT (không phải fixture JSON viết tay) đi qua public
   projection engine, xem `docs/project-data-import/phase7-pilot-rehearsal.md`.
4. CI job `contract-and-modes` mới (`.github/workflows/quality.yml`) chạy
   `validate:project-data-contract` + `test:public-projection` + `verify:portfolio-data-modes`.
5. UI verification thủ công (không phải Codex loop đầy đủ — Phase 7 không thêm UI mới, chỉ nạp dữ
   liệu pilot vào UI hiện có): build `internal-static` thật với bundle pilot, xác nhận không lỗi
   console/tràn layout/authoritative-snapshot chọn đúng bản `approved`, rồi khôi phục fixture thật qua
   `git checkout`.

**Có chủ đích KHÔNG làm** (do phạm vi review Phase 7 gốc quá rộng cho một phase, xem "Do-not-do
list"): độ phủ 5 viewport × Codex loop đầy đủ (F-004 — không có UI mới nên rủi ro thấp, hoãn tới khi
có thay đổi UI thật cần review); negative-path fixture riêng cho pilot (đã có 11 fixture ở
`data-templates/examples/invalid/`, không lặp lại); record-level classification thật trong canonical
JSON Schema (publication-decision set là artifact TÁCH RIÊNG, không sửa schema — vẫn đúng quyết định
"backlog nếu cần" của ADR 0009, Phase 7 chọn giải pháp không sửa schema).

## Rủi ro xuyên suốt backlog (nhắc lại để không quên giữa các phase)

- Đặt tên "internal-static" dễ bị hiểu nhầm là tương đương "secure" (docs cũ) — mỗi tài liệu mới viết
  ở Phase 6 phải dẫn lại disclaimer, không giả định người đọc nhớ phân biệt 2 trục.
- Tăng scenario ở Phase 5 có thể đụng performance budget — kiểm tra sớm, không để dồn tới cuối Phase 6
  mới phát hiện vượt ngân sách.
- Mọi field mới trong `types.ts` phải additive — nếu một phiên làm việc sau thấy cần đổi field bắt
  buộc/đổi tên, đó là dấu hiệu thiết kế ở tài liệu này cần được xét lại, không tự ý phá invariant "domain
  type không tự động là wire contract" đã ghi trong domain-model.md.
