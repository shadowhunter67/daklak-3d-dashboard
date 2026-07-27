# Nhập dữ liệu dự án nội bộ thật — tài liệu thiết kế (Phase 1) + triển khai (Phase 2-3)

Trạng thái: **Phase 1 (assessment/design), Phase 2 (source abstraction and profiles) và Phase 3
(canonical JSON schemas and data templates) đã hoàn thành.** Phase 4-6 vẫn là đề xuất, chưa triển
khai. Xem [ADR 0005](../adr/0005-project-portfolio-source-abstraction.md) (Phase 2) và
[ADR 0006](../adr/0006-canonical-project-portfolio-data-contract.md) (Phase 3) cho quyết định đã
chốt + sai lệch phát hiện so với thiết kế Phase 1 (ghi chú trực tiếp trong 01/02/04/05-*.md).

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

Tài liệu Phase 3 (mới): [canonical-data-dictionary.md](canonical-data-dictionary.md) — field list
đầy đủ 10 dataset · [schema-versioning-policy.md](schema-versioning-policy.md) ·
[geometry-contract.md](geometry-contract.md) · [null-and-missing-semantics.md](null-and-missing-semantics.md).

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

## Điều chưa làm, cố ý (Phase 4 trở đi)

- Importer CLI (CSV/XLSX parsing), scenario factory, Data Readiness UI, integration kit — vẫn là đề
  xuất trong 03-importer-design.md/05-implementation-backlog.md, chưa có code.
- `HttpProjectPortfolioSourceContract` vẫn chỉ là interface — không implementation, không API thật.
- `public-static` dùng chung bundle với `internal-static` — chưa có bước lọc public-projection
  (Phase 6).
- Không có `DatasetDescriptor` riêng cho 9/10 dataset (chỉ dataset tổng cho fixture generated-json
  đã đăng ký từ Phase 2) — đủ cho `GeneratedJsonProjectPortfolioSource` hoạt động, chưa cần thêm ở
  Phase 3.
