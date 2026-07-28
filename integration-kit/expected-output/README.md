# Expected output — `integration-kit/example-input/`

Đã chạy thật lệnh sau (2026-07-27, importer version 1.0.0):

```bash
npm run import:data -- --input integration-kit/example-input --output <tmp> --as-of 2026-07-27T00:00:00.000Z
```

## Kết quả xác nhận thật

```text
status: OK
blocking: false (0 lỗi chặn, 0 cảnh báo)
counts: agencies=1 contractors=1 projects=2 workPackages=1 milestones=0 projectIssues=0
        progressSnapshots=1 evidence=0 referenceDocuments=0
inputPackageChecksum:     69a20474830cb0d1d496011e3860f7c920b16f9bc50b1383c3a8b7c2fcd8fd82
normalizedContentChecksum: 5e39ea6d0e30e6488db41e9173235d2e3585b7379cd87852d8f8483cfd93fd82
```

Không commit toàn bộ 6 file output (chứa `generatedAt` không deterministic theo thời điểm chạy) —
chỉ ghi lại 2 checksum trên làm golden reference. Chạy lại đúng lệnh trên với cùng
`integration-kit/example-input/` phải cho **CHÍNH XÁC** hai checksum này (đã verify: chạy 2 lần liên
tiếp cho cùng kết quả — xem `scripts/import-data/pipeline.test.ts` "determinism").

## Đã verify thêm

- `npm run stage:internal-portfolio -- --bundle <output>/project-portfolio.bundle.json` — thành
  công, ghi vào `src/assets/data/project-portfolio.generated-fixture-demo.json` (sau đó revert lại
  fixture Phase 3 gốc — sample data ở đây KHÔNG được commit thay thế fixture thật).
- `npm run build:internal-static` — build thành công với dữ liệu sample đã stage.
- **Phát hiện hạn chế thật của tooling hiện có**: `scripts/validate_portfolio_data_mode.mjs` (leakage
  guard Phase 2) kiểm tra sự hiện diện của một marker string cố định (`gen-fixture-001`, id dự án
  trong fixture Phase 3 gốc) để xác nhận build internal-static "thực sự dùng
  `GeneratedJsonProjectPortfolioSource`". Khi thay fixture bằng dữ liệu thật (đúng luồng Phase 4/5
  dự kiến), marker đó không còn tồn tại → guard báo **false positive** ("có thể không thực sự dùng
  GeneratedJsonProjectPortfolioSource"), dù build hoàn toàn đúng. Đây là giới hạn thiết kế của guard
  (kiểm tra bằng marker cố định thay vì kiểm tra cấu trúc build thật) — ghi nhận là backlog Phase 6
  trong `docs/project-data-import/05-implementation-backlog.md`, KHÔNG sửa ở Phase 5 (ngoài phạm vi
  — guard này thuộc Phase 2, sửa nó cần review lại toàn bộ leakage-guard test suite).

## No-real-data guarantee

`integration-kit/example-input/` chỉ chứa dữ liệu hư cấu (`(fictional)` trong mọi tên/mô tả) — không
có dữ liệu nội bộ thật nào trong integration-kit.
