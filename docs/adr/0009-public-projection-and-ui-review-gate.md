# ADR 0009 — Public project-data projection and independent UI review gate

- Status: accepted
- Date: 2026-07-28
- Liên quan: [ADR 0005](0005-project-portfolio-source-abstraction.md) (PortfolioDeploymentMode),
  [ADR 0006](0006-canonical-project-portfolio-data-contract.md) (canonical bundle),
  [ADR 0008](0008-demo-scenario-strategy-and-data-readiness-experience.md) (backlog Phase 6: marker
  cố định + authoritative-snapshot explanation)

## Bối cảnh

ADR 0008 để lại hai khoảng trống cho Phase 6: (1) `scripts/validate_portfolio_data_mode.mjs` dùng
marker ID dữ liệu cố định (`prj-001`/`gen-fixture-001`) — dễ false positive/negative, kiểm tra nội
dung thay vì contract; (2) `public-static` dùng CHUNG bundle chưa lọc với `internal-static` — chưa
có cơ chế nào đảm bảo dữ liệu internal-only không lọt vào bản public. Phase 6 giải quyết cả hai,
cộng thêm authoritative-snapshot explanation cho Project Detail (backlog Quyết định 1 của ADR 0008)
và một quy trình UI review độc lập bằng Codex CLI làm merge gate cho các thay đổi UI.

## Quyết định 1 — Leakage guard chuyển từ marker dữ liệu sang metadata/manifest cấu trúc

Thay `ILLUSTRATIVE_MARKER`/`GENERATED_FIXTURE_MARKER` (chuỗi ID cố định) bằng:

1. `dist/build-info.json.activePortfolioSourceModule` — đường dẫn module Vite đã alias
   `#active-portfolio-source` tới lúc build (`src/app/resolveActivePortfolioSourceModule.ts`) —
   quyết định CẤU HÌNH, không phụ thuộc nội dung dữ liệu.
2. `sourceKind` — literal string ổn định của contract `PortfolioSourceKind`
   (`'illustrative' | 'generated-json' | 'public-projected'`), scan trong `dist/assets/*.js` bằng
   regex chấp nhận cả ba kiểu quote (`"`/`'`/backtick — xác nhận thật từ `npm run build`, minifier
   dùng key không quote + value backtick).

Policy theo mode (`src/app/portfolioModePolicy.ts`, type `PortfolioModePolicy`) khai báo
`allowedSourceModules`/`allowedSourceKinds`/`forbiddenSourceKinds`/`requirePublicProjectionManifest`
cho từng mode — `scripts/validate_portfolio_data_mode.mjs` đọc policy này qua Vite `ssrLoadModule`
(cùng pattern `generate_public_manifest.mjs` đã dùng để load TS module trong script `.mjs` thuần,
không thêm `tsx`/`ts-node`). Hàm quyết định (`evaluateFindings`) tách thành pure function, unit-test
được mà không cần `vite build` thật cho mỗi case.

## Quyết định 2 — Public projection engine: allowlist field trước, record-classification sau, luôn build-time

`src/entities/project/publicProjection/projectPublicBundle.ts` — hàm thuần
`projectCanonicalBundleToPublic(bundle, options)`:

- **Gate cấp bundle**: `classification ∈ {restricted, confidential}` → từ chối toàn bộ projection
  (không có field nào đủ an toàn để cân nhắc khi nguồn đã được đánh dấu ở mức này).
- **Field-level allowlist** (`config/public-project-fields.json`) là cơ chế an toàn CHÍNH — field
  không có trong danh sách của entity đó luôn bị loại, kể cả khi record được coi là "public". Áp
  dụng vô điều kiện, kể cả khi bundle nguồn đã có `classification: 'public'` (test "vẫn áp allowlist
  dù bundle đã public" — không tin classification nguồn thay cho allowlist).
- **Record-level classification** (`recordClassification` optional, field KHÔNG có trong canonical
  JSON Schema hiện tại — dự phòng khi schema thật sự có field này) mặc định là `'public'` khi vắng
  mặt — KHÔNG áp dụng "thiếu = loại" ở mức record, vì an toàn thực sự đã nằm ở field-level allowlist
  (unlisted field luôn bị loại bất kể record được coi là gì). Ghi rõ trong code: đây là đơn giản hoá
  có chủ đích, chưa có per-record classification thật trong schema (backlog Phase 7 nếu cần).
- **Cascade + orphan-pruning**: record project bị loại → cascade loại workPackages/milestones/
  projectIssues/progressSnapshots cùng `projectId`; `projectIssues.evidenceIds` trỏ tới evidence đã
  bị loại được cắt khỏi mảng (không loại cả issue) — không để lại FK hỏng.
- **Deterministic**: checksum (`sha256` qua `stableStringify` — di chuyển từ
  `scripts/import-data/checksum.ts` sang `src/entities/project/publicProjection/deterministicChecksum.ts`
  để tránh phụ thuộc ngược `src/ -> scripts/`) không phụ thuộc `generatedAt`.
- **Re-validate sau projection** (B9): CLI (`scripts/public-projection/cli.ts`) chạy lại JSON Schema
  (`compileCanonicalBundleValidator`) + referential integrity
  (`validateCanonicalReferentialIntegrity`) trên bundle ĐÃ chiếu — fail-closed, không ghi file nào
  nếu bundle public không pass.

Pipeline tách hai bước, cùng triết lý `import:data`/`stage:internal-portfolio` (ADR 0007):
`npm run project:public-data` (projection + validate, ghi `generated-public-data/` — gitignored,
scratch) → review thủ công → `npm run stage:public-portfolio` (validate lại + ghi atomic vào
`src/assets/data/project-portfolio.public-projected.json` +
`...public-projection-manifest.json`). Không script nào tự commit.

## Quyết định 3 — `public-static` có module nguồn RIÊNG, không còn dùng chung `internal-static`

`resolveActivePortfolioSourceModule.ts` thêm nhánh thứ ba
(`ACTIVE_PORTFOLIO_SOURCE_MODULE_PUBLIC_PROJECTED` →
`src/data/activePortfolioSource.publicProjected.ts` →
`PublicProjectedProjectPortfolioSource`) — adapter mới CỐ TÌNH không import
`projectPublicBundle.ts` (chỉ đọc hai JSON đã sinh sẵn), để projection engine và mọi dependency
Node-only của nó (Ajv, `node:crypto` qua `deterministicChecksum.ts`) không lọt vào browser bundle.
`sourceKind: 'public-projected'` + `deploymentCompatibility: ['public-static']` là hai literal mới
trong `PortfolioSourceKind`/dùng bởi guard (Quyết định 1).

## Quyết định 4 — Authoritative-snapshot explanation dùng reason CODE, không phải câu dựng sẵn

`src/entities/project/validation/authoritativeSnapshotExplanation.ts` (`explainLatestAuthoritativeSnapshot`)
gọi lại nguyên vẹn `selectAuthoritativeSnapshot`/`groupSnapshotsByIdentity`/`isUsableForKpi`
(Phase 1.5, không viết lại), chỉ diễn giải kết quả. Bản đầu (trước Codex UI review) trả câu tiếng
Việt viết sẵn cho `selectedReason`/`exclusionReason` — Codex review vòng 1 (UX-003, HIGH,
`reports/ui-review/phase-6/iteration-01/codex-review.md`) phát hiện câu này không dịch được khi
locale UI là `en`. Sửa: trả `{code, ...params}` có cấu trúc
(`SelectionReasonCode`/`ExclusionReasonCode`), UI (`ProjectDetailView.tsx`) dịch qua i18n dictionary
theo locale. KPI tóm tắt (`disbursementRate`/`scheduleVariance`/`budgetVariance`) vẫn đọc trực tiếp
từ `Project.*` (không đổi từ trước) — `affectedKpis` chỉ là danh sách KPI mà snapshot được chọn
CORROBORATE, không phải KPI tính trực tiếp từ snapshot; ghi rõ trong JSDoc để không ai tưởng nhầm
hai khái niệm.

## Quyết định 5 — Data Readiness drill-down: chỉ resolve, không suy đoán

`buildDataReadinessViewModel.ts` thêm `resolveIssueProjectId` — resolve `projectId` thật cho MỌI
`entityType` (`project`/`workPackage`/`milestone`/`issue`/`progressSnapshot`, kể cả hai định dạng
`entityId` khác nhau mà `progressSnapshot` dùng tuỳ rule). Trả `null` nếu không resolve được;
`DataReadinessView.tsx` chỉ render nút "Xem dự án liên quan" khi `linkedProjectId` khác `null` —
không có dead link.

## Quyết định 6 — Codex CLI UI review là merge gate thật, có bằng chứng thật

`codex exec -s read-only -C <repo> -i <screenshot.png> - < prompt.txt` (prompt qua stdin — truyền
prompt nhiều dòng như CLI argument trực tiếp thất bại âm thầm trong shell dùng ở đây). Ba vòng
review thật (`reports/ui-review/phase-6/iteration-0{1,2,3}/`) trên hai route thay đổi UI
(`#/projects/:id` — section snapshot-explanation mới; `#/data-readiness` — nút drill-down mới), phát
hiện 3 HIGH + 3 MEDIUM thật (không phải nhận xét chung chung): KPI thiếu cảnh báo provenance khi
không có snapshot hợp lệ (UX-001), overflow ngang trên mobile do thiếu `overflow-wrap` (UX-002),
câu giải thích tiếng Việt cứng trong locale English (UX-003) — cả ba đã sửa và Codex xác nhận PASS
ở vòng 3. Một giới hạn công cụ thật cũng được phát hiện và xử lý: `take_screenshot` (chrome-devtools
MCP) thỉnh thoảng trả ảnh đen hoàn toàn trên trang có WebGL — mở tab mới (`new_page` thay vì tái sử
dụng tab cũ) khắc phục ổn định; ghi lại để vòng review sau không mất thời gian chẩn đoán lại.

## Hệ quả

- `src/entities/project/publicProjection/` (5 file + 2 test), `scripts/public-projection/` (CLI +
  stage script), `config/public-project-fields.json`, dataset descriptor mới trong
  `src/data-platform/catalog/datasets.ts`, hai file registry mới trong
  `config/public-data-files.json`.
- `scripts/validate_portfolio_data_mode.mjs` viết lại hoàn toàn (structural, không marker dữ liệu),
  `src/app/portfolioModePolicy.ts` mới, `src/build/buildInfo.ts`/`vite.config.ts` thêm field
  `activePortfolioSourceModule`.
- `src/entities/project/validation/authoritativeSnapshotExplanation.ts` (+ test),
  `ProjectDetailView.tsx` (+ section mới), `DataReadinessView.tsx` (+ nút drill-down), i18n
  vi/en mở rộng (~25 key mới).
- `src/entities/project/illustrativeScenarioAdditions.ts` — prj-015, đóng 4 khoảng trống scenario
  coverage (financial/physical mismatch, missing provenance, superseded snapshot, rejected
  snapshot) phát hiện qua audit Phase 5→6.
- `reports/ui-review/phase-6/` — bằng chứng review đầy đủ (brief, screenshot manifest, review
  Codex thật, resolution).
- Không thêm database/backend/authentication/API server/XLSX/fuzzy-mapping/partial-import/upload
  UI nào — đúng phạm vi "Không làm trong Phase 6".
- Backlog thật (chưa làm ở Phase 6, ghi rõ để không tưởng nhầm là đã xong): UX-006 (visual distinction
  giữa competing record được chọn/bị loại, MEDIUM, chấp nhận ship không cần sửa); chỉ 2/5 viewport
  yêu cầu được review trực quan (1440×900, 390×844 — thiếu 1280×800/768×1024/320×700); chưa chụp
  loading/error/degraded state của UI mới; chưa có importer thật (Phase 4) chạy dữ liệu nội bộ THẬT
  qua public projection engine — mới verify bằng canonical fixture Phase 3 (hư cấu 100%).
