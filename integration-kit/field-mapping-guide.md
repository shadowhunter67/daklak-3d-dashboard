# Field mapping guide

Bảng mẫu — điền cột "Source column" theo file thật của bạn, giữ nguyên "Canonical field" (không đổi
tên field canonical). Không có alias/fuzzy mapping tự động ở Phase 4/5 — cột nguồn phải được đổi tên
thủ công thành đúng canonical header trước khi import (xem
[csv-contract.md](../docs/project-data-import/csv-contract.md)).

## Ví dụ: `projects.csv`

| Source column (ví dụ)   | Canonical field             | Transformation                   | Required | Default | Validation                    | Owner         |
| ----------------------- | --------------------------- | -------------------------------- | -------- | ------- | ----------------------------- | ------------- |
| `Mã dự án`              | `code`                      | trim                             | Có       | —       | non-empty string              | Đội nghiệp vụ |
| `Tên dự án`             | `name`                      | trim, NFC                        | Có       | —       | non-empty string              | Đội nghiệp vụ |
| `Lĩnh vực`              | `sector`                    | ánh xạ thủ công sang 7 giá trị   | Có       | —       | enum `PROJECT_SECTORS`        | Đội nghiệp vụ |
| `Tổng mức đầu tư (VNĐ)` | `approved_budget_vnd`       | bỏ dấu phân cách nghìn thủ công  | Có       | —       | số nguyên, không âm           | Kế toán dự án |
| `Ngày khởi công`        | `start_date`                | chuyển sang `YYYY-MM-DD`         | Không    | (trống) | ISO date                      | Đội nghiệp vụ |
| `Xã/phường`             | `administrative_area_codes` | tra mã theo `daklak-labels.json` | Có       | —       | mã tồn tại; nhiều mã dùng `;` | GIS/quy hoạch |

Xem [canonical-data-dictionary.md](canonical-data-dictionary.md) cho danh sách đầy đủ mọi field/mọi
dataset (10 nhóm).

## Nguyên tắc

- Không đoán field nguồn nào map vào field canonical nào — đội cung cấp dữ liệu phải tự điền bảng
  này và đội kỹ thuật review trước khi chạy import thật lần đầu.
- Field không có trong bảng mapping = không được import (không tự "mang theo" cột lạ).
- `Transformation` chỉ mô tả biến đổi AN TOÀN đã tài liệu hoá ở
  [csv-contract.md](../docs/project-data-import/csv-contract.md) — không viết transformation tuỳ ý
  (vd không tự "chia 1000" hay "nhân với tỷ lệ quy đổi" nếu chưa có quy tắc rõ).
