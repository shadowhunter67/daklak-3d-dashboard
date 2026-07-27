# Importer security notes (Phase 4)

## Không phải một bảo đảm bảo mật

Redaction trong `scripts/import-data/secretsRedaction.ts` (thích ứng từ
`scripts/check_secrets.mjs`) chỉ phát hiện MỘT SỐ pattern giới hạn (private key PEM, GitHub token,
AWS access key id, JWT-shaped string, literal Bearer token) trong `message`/`details` trước khi ghi
vào `rejected-records.json`/`validation-report.json`/`import-summary.md`. Đây KHÔNG phải một bảo đảm
"dữ liệu import không chứa thông tin nhạy cảm" — chỉ là một lớp phòng thủ bổ sung, không thay thế
việc người chuẩn bị dữ liệu tự đảm bảo file CSV/JSON đầu vào không chứa secret/PII không cần thiết.

## Giới hạn nội dung report

- `rejected-records.json`: mỗi entry chỉ chứa `dataset`/`file`/`row`/`recordId`/`errorCodes`/
  `fieldPaths`/`messages` — messages được cắt tối đa 300 ký tự (`truncateForReport`) và chạy qua
  redaction trước khi ghi. KHÔNG dump toàn bộ raw CSV row.
- Không có field nào trong bất kỳ report nào chứa đường dẫn tuyệt đối máy cá nhân — `sourceFiles`
  trong manifest chỉ ghi `relativePath` (tương đối với `--input`), không ghi absolute path (nguyên
  tắc #12).

## Import không chạy dữ liệu nội bộ thật vào repository

Test importer (`scripts/import-data/*.test.ts`) và fixture E2E CHỈ dùng dữ liệu hư cấu
(`scripts/import-data/__fixtures__/`, `data-templates/examples/`) — không có dữ liệu nội bộ thật nào
được commit vào repo qua Phase 4 (nguyên tắc #13).

## Import không tự động publish

`import:data` chỉ ghi vào `--output` (thư mục cục bộ, không tracked mặc định). `stage:internal-portfolio`
ghi vào một file trong `src/assets/`, nhưng KHÔNG tự `git add`/`git commit`/`git push` — người vận
hành phải tự review + commit thủ công nếu muốn giữ lại thay đổi (nguyên tắc #19).

## Dependency mới

`tsx` (4.23.1, MIT) và `csv-parse` (7.0.1, MIT) — cả hai chỉ ở `devDependencies`, chỉ dùng bởi
`scripts/import-data/` (Node CLI tooling), KHÔNG import bởi bất kỳ file nào dưới `src/` — xác nhận
qua `npm run validate:public-build`/`:dist` (không đổi kết quả sau khi thêm) và
`npm run check:budget` (không đổi bundle size — Phase 4 không chạm `src/`).
`npm audit --audit-level=high` sau khi thêm cả hai: 0 vulnerability.
