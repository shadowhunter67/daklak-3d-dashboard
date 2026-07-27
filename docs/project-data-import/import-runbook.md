# Import runbook — offline project-data importer (Phase 4)

Nguồn sự thật cho hành vi là `scripts/import-data/`. Tài liệu này là hướng dẫn vận hành, không lặp
lại logic — xem [ADR 0007](../adr/0007-offline-project-data-importer-and-last-known-good-promotion.md)
cho quyết định thiết kế.

## Chạy import

```bash
npm run import:data -- \
  --input ./incoming-data \
  --output ./generated-data \
  --as-of 2026-07-27T00:00:00.000Z
```

`--input` là MỘT file canonical JSON bundle, HOẶC một thư mục chứa CSV theo tên chuẩn (xem
[csv-contract.md](csv-contract.md)). `--format` mặc định `auto` (suy theo file/thư mục thật, không
theo đuôi tên).

## Đọc kết quả

- Exit code `0`: thành công, `generated-data/project-portfolio.bundle.json` đã được ghi.
- Exit code `1`: có lỗi chặn (blocking) — đọc `generated-data/import-summary.md` trước (top-N lỗi +
  link), rồi `validation-report.json`/`rejected-records.json` để sửa. KHÔNG có bundle nào được ghi.
- Exit code `2`: lỗi tham số dòng lệnh (xem usage in ra).
- Exit code `3`: lỗi nội bộ không mong đợi (không phải lỗi dữ liệu — báo cáo như một bug).

## Đưa vào build internal-static

```bash
npm run stage:internal-portfolio -- --bundle ./generated-data/project-portfolio.bundle.json
npm run build:internal-static
```

`stage:internal-portfolio` validate lại bundle rồi ghi vào
`src/assets/data/project-portfolio.generated-fixture-demo.json` — KHÔNG tự `git add`/`git commit`.
Review diff rồi commit thủ công nếu muốn giữ lại (nếu chỉ thử nghiệm, `git checkout --` file đó để
huỷ).

**Importer output ≠ public-approved output.** `internal-static` KHÔNG đồng nghĩa `public-static` —
không có bước lọc public-projection (Phase 6 backlog); không dùng output importer cho build
`public-static`.

## `--dry-run`

Chạy toàn bộ validation + ghi 5 file report vào `--output`, KHÔNG ghi `project-portfolio.bundle.json`
— dùng để kiểm tra trước khi ghi thật, không thay đổi exit-code semantics (vẫn `1` nếu có lỗi chặn).

## `--strict`

Nâng cấp các cảnh báo sau thành lỗi chặn: cột CSV lạ, file CSV không khớp dataset nào,
`sourceDatasetId` không resolve qua `DATASET_CATALOG`/`--source-registry`.

## `--last-known-good <path>`

Trỏ tới một thư mục output trước đó (có `import-manifest.json`) — importer chỉ SO SÁNH
`normalizedContentChecksum`, báo `noChange: true` trong manifest khi giống hệt. Không tự ghi/copy vào
đường dẫn đó — xem [last-known-good-policy.md](last-known-good-policy.md).

## Chạy test importer

```bash
npm run test:project-data-import
```

## Giới hạn đã biết

- Không hỗ trợ XLSX (xem [csv-contract.md](csv-contract.md) "XLSX").
- Không alias tên cột CSV (chỉ canonical header từ `data-templates/csv/*.csv`).
- Không partial-import theo từng record — một lỗi chặn khiến toàn bộ lần chạy bị từ chối (xem ADR
  0007 quyết định 3).
- `audit-events.csv` được nhận diện nhưng nội dung KHÔNG được ingest (auditEvents deferred).
