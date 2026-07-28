# Validation rules — điều gì chặn import, điều gì không

Đầy đủ: [docs/project-data-import/importer-error-codes.md](../docs/project-data-import/importer-error-codes.md).

## Luôn chặn import (blocking)

- File/JSON không parse được, encoding không phải UTF-8.
- Thiếu cột/giá trị bắt buộc; sai kiểu (VND/ngày/enum/boolean).
- `schemaVersion` không được hỗ trợ.
- Record không hợp lệ về cấu trúc (Layer 2 — vd `overallProgress` ngoài 0-100).
- Tham chiếu không tồn tại (FK): `projectId`/`workPackageId`/`contractorId`/`evidenceId` không khớp
  record nào — kể cả khi record tham chiếu sai đó sẽ bị mapper âm thầm bỏ qua, importer vẫn phát
  hiện và chặn (xem ADR 0007 quyết định 4).
- Trùng khoá chính (2 record cùng `id`, hoặc 2 progress-snapshot cùng identity + cùng `sourceRecordId`).
- Mã hành chính không tồn tại trong `daklak-labels.json`.

## Không chặn — chỉ cảnh báo (business alert)

- Dữ liệu cũ quá SLA độ mới (`stale-data`) — dự án `completed`/`cancelled` không tính.
- Nhiều bản ghi tiến độ cùng identity ở các giai đoạn xác thực khác nhau (raw→reviewed→approved) —
  đây là quy trình hợp lệ, không phải lỗi; importer chọn bản ghi có thẩm quyền cao nhất cho KPI qua
  `selectAuthoritativeSnapshot` khi dashboard render, không phải khi import.
- Cột CSV lạ (không khớp canonical schema) — cảnh báo mặc định, chặn nếu dùng `--strict`.
- `sourceDatasetId` không resolve qua `DATASET_CATALOG`/`--source-registry` — cảnh báo mặc định,
  chặn nếu dùng `--strict`.

## Nguyên tắc all-or-nothing

Importer KHÔNG import một phần rồi bỏ qua record lỗi — bất kỳ lỗi chặn nào (dù chỉ 1 dòng) khiến TOÀN
BỘ lần chạy bị từ chối, không có bundle nào được ghi. Sửa dữ liệu rồi chạy lại. Xem ADR 0007 quyết
định 3 cho lý do (an toàn hơn import một phần âm thầm).
