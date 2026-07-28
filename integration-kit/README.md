# Integration kit — bàn giao cho đội cung cấp dữ liệu

Bộ tài liệu ngắn gọn cho đội/đơn vị chuẩn bị dữ liệu dự án nội bộ để nhập vào dashboard qua
`npm run import:data`. Đây KHÔNG phải bản sao của `docs/project-data-import/` (tài liệu kỹ thuật đầy
đủ) — mỗi file ở đây là bản tóm tắt/checklist thực dụng, có link trỏ về tài liệu gốc khi cần chi tiết
đầy đủ.

## Đọc theo thứ tự

1. [source-assessment-checklist.md](source-assessment-checklist.md) — trước khi chuẩn bị dữ liệu,
   tự trả lời các câu hỏi này.
2. [field-mapping-guide.md](field-mapping-guide.md) — bảng cột nguồn → field canonical.
3. [canonical-data-dictionary.md](canonical-data-dictionary.md) — tóm tắt (link đầy đủ tới
   `docs/project-data-import/canonical-data-dictionary.md`).
4. [import-runbook.md](import-runbook.md) — tóm tắt lệnh chạy (link đầy đủ tới
   `docs/project-data-import/import-runbook.md`).
5. [validation-rules.md](validation-rules.md) — quy tắc nào chặn import, quy tắc nào chỉ cảnh báo.
6. [common-errors.md](common-errors.md) — lỗi thường gặp + ví dụ cụ thể.
7. [deployment-modes.md](deployment-modes.md) — `internal-static` khác gì `public-static`, vì sao
   quan trọng phải hiểu trước khi đưa dữ liệu đã import lên bất kỳ đâu.
8. [security-and-classification-notes.md](security-and-classification-notes.md).
9. [example-input/](example-input/) — bộ CSV mẫu hoàn toàn hư cấu, đã chạy thật qua importer.
10. [expected-output/README.md](expected-output/README.md) — kết quả thật (checksum) khi chạy
    `example-input/` qua importer, dùng để tự kiểm tra môi trường của bạn cho cùng kết quả.

## Phạm vi

Bộ này mô tả luồng offline: dữ liệu chuẩn bị sẵn (CSV/JSON) → `npm run import:data` → bundle đã
validate → `npm run stage:internal-portfolio` → `npm run build:internal-static`. KHÔNG có backend,
database, authentication, API upload, hay quy trình phê duyệt tự động nào trong luồng này.
