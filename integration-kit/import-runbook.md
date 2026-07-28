# Import runbook (tóm tắt)

Hướng dẫn vận hành đầy đủ: xem
[docs/project-data-import/import-runbook.md](../docs/project-data-import/import-runbook.md). Tóm tắt
3 lệnh chính:

```bash
# 1. Import — sinh bundle + 5 report vào thư mục output
npm run import:data -- \
  --input ./incoming-data \
  --output ./generated-data \
  --as-of 2026-07-27T00:00:00.000Z

# 2. Đọc generated-data/import-summary.md trước — nếu có lỗi chặn, sửa rồi chạy lại bước 1.

# 3. Khi generated-data/ không có lỗi chặn, đưa vào build internal-static
npm run stage:internal-portfolio -- --bundle ./generated-data/project-portfolio.bundle.json
npm run build:internal-static
```

Exit code: `0` thành công · `1` có lỗi chặn (không có gì được ghi/promote) · `2` lỗi tham số dòng
lệnh · `3` lỗi nội bộ không mong đợi.

`--dry-run` để kiểm tra trước khi ghi thật. `--strict` để coi cột lạ/`sourceDatasetId` không resolve
là lỗi chặn thay vì cảnh báo.
