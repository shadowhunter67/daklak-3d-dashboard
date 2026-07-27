# Nhập dữ liệu dự án nội bộ thật — tài liệu thiết kế (Phase 1) + triển khai (Phase 2-4)

Trạng thái: **Phase 1 (assessment/design), Phase 2 (source abstraction and profiles), Phase 3
(canonical JSON schemas and data templates) và Phase 4 (offline importer CLI) đã hoàn thành.** Phase
5-6 vẫn là đề xuất, chưa triển khai. Xem [ADR 0005](../adr/0005-project-portfolio-source-abstraction.md)
(Phase 2), [ADR 0006](../adr/0006-canonical-project-portfolio-data-contract.md) (Phase 3) và
[ADR 0007](../adr/0007-offline-project-data-importer-and-last-known-good-promotion.md) (Phase 4) cho
quyết định đã chốt + sai lệch phát hiện so với thiết kế Phase 1 (ghi chú trực tiếp trong
01/02/03/04/05-*.md).

Mục tiêu tổng thể: biến repo thành một static production-shaped demo, sẵn sàng tiếp nhận dữ liệu dự
án nội bộ thật (Excel/CSV/JSON) qua một importer/adapter, mà không cần viết lại UI/KPI/validation/
domain/bản đồ, và **không** thêm database, backend, hay authentication.

Đây là bộ tài liệu Phase 1 duy nhất cho nhiệm vụ này. Đọc theo thứ tự:

1. [00-gap-analysis.md](00-gap-analysis.md) — repo đã có gì (nhiều hơn dự kiến), thiếu gì thật sự,
   bất biến nào bắt buộc giữ nguyên, baseline đã chạy thật.
2. [01-target-architecture.md](01-target-architecture.md) — mở rộng `ProjectPortfolioSource` hiện
   có (không tạo interface mới), 3 implementation, composition root.
3. [02-canonical-schema-proposal.md](02-canonical-schema-proposal.md) — field list cho 10 dataset,
   ánh xạ vào type đã có, field cần thêm.
4. [03-importer-design.md](03-importer-design.md) — CLI, các giai đoạn, output, test plan.
5. [04-deployment-profiles-design.md](04-deployment-profiles-design.md) — demo/internal-static/
   public-static, và vì sao đây là trục khác với "public/secure" đã có trong
   `docs/deployment-profiles.md`.
6. [05-implementation-backlog.md](05-implementation-backlog.md) — backlog cụ thể theo Phase 2 → 6.

Tài liệu Phase 3: [canonical-data-dictionary.md](canonical-data-dictionary.md) — field list
đầy đủ 10 dataset · [schema-versioning-policy.md](schema-versioning-policy.md) ·
[geometry-contract.md](geometry-contract.md) · [null-and-missing-semantics.md](null-and-missing-semantics.md).

Tài liệu Phase 4 (mới): [import-runbook.md](import-runbook.md) — cách chạy CLI thật ·
[csv-contract.md](csv-contract.md) · [importer-error-codes.md](importer-error-codes.md) ·
[importer-security-notes.md](importer-security-notes.md) · [last-known-good-policy.md](last-known-good-policy.md).

## Điều quan trọng nhất rút ra từ Phase 1

Repo **không** ở trạng thái greenfield cho nhiệm vụ này. `src/data-platform/` (dataset catalog,
classification, leakage guard, schema-drift-guard pattern) và `src/entities/project/` (domain,
validation, KPI, data-access boundary `ProjectPortfolioSource`) đã cung cấp phần lớn hạ tầng cần
thiết — kể cả `docs/domain-model.md` đã tự ghi trước một "Phase 3 — API contract gate" mô tả gần
đúng nhiệm vụ hiện tại. Phần việc thật sự còn thiếu là: canonical JSON Schema cho domain dự án
(chưa tồn tại), importer CLI (chưa tồn tại), và nối các phần đã có lại với nhau qua một composition
root tập trung — không phải xây lại từ đầu.

## Phase 2 — đã triển khai

`IllustrativeProjectPortfolioSource` (đổi tên từ `BundledProjectPortfolioSource`) +
`GeneratedJsonProjectPortfolioSource` (mới, đọc fixture JSON test) + `HttpProjectPortfolioSourceContract`
(interface-only) + composition root (`src/app/createProjectPortfolioSource.ts`, chọn qua
`resolve.alias` của Vite theo `--mode`, không phải `switch` runtime — xem ADR 0005 lý do) + 3 npm
script build mode (`build`/`build:internal-static`/`build:public-static`) + leakage-guard script
(`scripts/validate_portfolio_data_mode.mjs`, `npm run verify:portfolio-data-modes`) + boundary test
mới (`src/app/portfolioSourceBoundary.test.ts`, mở rộng `importBoundary.test.ts`). Xem
[ADR 0005](../adr/0005-project-portfolio-source-abstraction.md) cho chi tiết đầy đủ.

## Phase 3 — đã triển khai

Canonical bundle versioned (`CanonicalProjectPortfolioBundle`,
`src/entities/project/canonicalBundle.ts`) + JSON Schema mirror
(`data-templates/schemas/definitions/*.schema.json` + `project-portfolio-bundle.schema.json`, $ref
cross-file) + drift guard (`projectSchemaDriftGuard.ts`/`.test.ts`, 118 test) + 13 example bundle
(minimal-valid/representative-valid/11 invalid, mỗi file đúng 1 lỗi ở đúng 1 layer) + 9 CSV template
(header-only, geometry deferred sang JSON) + `GeneratedJsonProjectPortfolioSource` đọc canonical
bundle thật qua mapper tường minh (`groupCanonicalDatasetsIntoProjectBundles`) + script
`npm run validate:project-data-contract` (wired vào `quality:frontend`). Xem
[ADR 0006](../adr/0006-canonical-project-portfolio-data-contract.md) cho chi tiết đầy đủ.

## Phase 4 — đã triển khai

`npm run import:data` (`scripts/import-data/`, chạy qua `tsx`) — nhận canonical JSON bundle HOẶC thư
mục CSV (9 dataset, header canonical từ Phase 3), qua pipeline discover → checksum → parse → normalize
→ assemble → schema-version gate → JSON Schema (Layer 1) → mapper (Phase 3, không viết lại) → domain
validator (Layer 2, không viết lại) → cross-record quality rule (Layer 3, không viết lại) + một
orphan-reference check bổ sung (bù khoảng trống thật phát hiện ở mapper Phase 3) → 6 output file
(`project-portfolio.bundle.json` + 5 report) ghi atomic, all-or-nothing (không partial-import).
`npm run stage:internal-portfolio` đưa bundle đã validate vào vị trí `build:internal-static` đọc,
không tự commit. Xem [ADR 0007](../adr/0007-offline-project-data-importer-and-last-known-good-promotion.md)
cho chi tiết đầy đủ + [import-runbook.md](import-runbook.md) cho hướng dẫn vận hành.

## Điều chưa làm, cố ý (Phase 5 trở đi)

- XLSX input, CSV header alias mapping, per-record partial-import, `geometry_json` CSV cell — xem
  05-implementation-backlog.md "Phase 5, mục 0" cho danh sách đầy đủ việc Phase 4 hoãn có chủ đích.
- Scenario factory, Data Readiness UI, integration kit — vẫn là đề xuất trong
  05-implementation-backlog.md, chưa có code.
- `HttpProjectPortfolioSourceContract` vẫn chỉ là interface — không implementation, không API thật.
- `public-static` dùng chung bundle với `internal-static` — chưa có bước lọc public-projection
  (Phase 6). Importer output KHÔNG tự động là public-approved output.
- Không có `DatasetDescriptor` riêng cho 9/10 dataset (chỉ dataset tổng cho fixture generated-json
  đã đăng ký từ Phase 2) — đủ cho `GeneratedJsonProjectPortfolioSource` hoạt động.
