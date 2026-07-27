# Importer error-code taxonomy (Phase 4)

Nguồn sự thật: `scripts/import-data/errorCodes.ts` (`IMPORTER_ERROR_CODES`). Test/automation phải so
khớp theo `code`, KHÔNG theo nội dung `message` (message có thể đổi câu chữ tiếng Việt mà không phá
test/tooling khác).

| Code                                   | Layer             | Ý nghĩa                                                                                                                        |
| -------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `cli-invalid-argument`                 | —                 | Tham số dòng lệnh sai (unknown flag, giá trị `--format` sai, `--as-of` sai định dạng, `--format` mismatch với filesystem thật) |
| `input-not-found`                      | transport         | `--input` không tồn tại, hoặc thiếu file CSV bắt buộc (`projects.csv`)                                                         |
| `input-encoding-invalid`               | transport         | File không phải UTF-8 hợp lệ (strict decode)                                                                                   |
| `json-parse-failed`                    | transport         | `JSON.parse` thất bại (JSON mode)                                                                                              |
| `csv-parse-failed`                     | transport         | `csv-parse` throw (CSV mode)                                                                                                   |
| `csv-header-missing`                   | transport         | File CSV rỗng/không có header                                                                                                  |
| `csv-header-duplicate`                 | transport         | Header trùng tên trong cùng file — toàn file bị từ chối                                                                        |
| `csv-column-unknown`                   | transport         | Cột không khớp canonical schema — cảnh báo mặc định, lỗi dưới `--strict`                                                       |
| `field-required`                       | transport         | Thiếu cột bắt buộc (cấp file) hoặc thiếu giá trị bắt buộc (cấp dòng)                                                           |
| `field-invalid-type`                   | transport         | Giá trị sai kiểu (percentage/boolean không hợp lệ)                                                                             |
| `field-invalid-enum`                   | transport         | Giá trị không nằm trong enum canonical                                                                                         |
| `field-invalid-date`                   | transport         | Ngày/giờ sai định dạng canonical                                                                                               |
| `field-invalid-vnd`                    | transport         | Giá trị VND không phải số nguyên canonical hợp lệ                                                                              |
| `field-invalid-array`                  | transport         | (dự phòng — hiện `semicolonArray` không có điều kiện lỗi riêng, mảng rỗng là hợp lệ)                                           |
| `unsupported-schema-version`           | schema            | `schemaVersion` hợp lệ cú pháp nhưng không trong `SUPPORTED_CANONICAL_SCHEMA_VERSIONS`                                         |
| `schema-invalid`                       | schema            | Layer 1 (JSON Schema, `data-templates/schemas/`) từ chối                                                                       |
| `domain-invalid`                       | domain            | Layer 2 (`validateProject.ts`, không viết lại) từ chối một record                                                              |
| `duplicate-primary-key`                | quality           | Layer 3 (`dataQualityRules.ts`) — trùng khoá chính                                                                             |
| `foreign-key-unresolved`               | quality           | Layer 3 hoặc importer's orphan-check (`checkOrphanedProjectReferences`) — tham chiếu không tồn tại                             |
| `administrative-code-unresolved`       | quality           | Mã hành chính không có trong `daklak-labels.json`/`--administrative-codes`                                                     |
| `geometry-invalid`                     | domain            | Geometry sai cấu trúc/toạ độ (Layer 2, `isValidProjectGeometry`)                                                               |
| `dataset-unresolved`                   | transport/quality | Tên file CSV không khớp dataset nào, HOẶC `sourceDatasetId` không resolve qua catalog/registry                                 |
| `output-write-failed`                  | —                 | Lỗi filesystem khi ghi output (atomic write thất bại)                                                                          |
| `last-known-good-protection-failed`    | —                 | (dự phòng — hiện `--last-known-good` chỉ so sánh, không ghi, nên chưa có kịch bản kích hoạt code này ở Phase 4)                |
| `business-stale-data`                  | business          | Non-blocking — dữ liệu quá SLA độ mới (rule có sẵn từ Phase 1.5, không phải lỗi)                                               |
| `business-multiple-verification-stage` | business          | Non-blocking — nhiều bản ghi tiến độ cùng identity ở các giai đoạn xác thực khác nhau (hợp lệ, không phải lỗi)                 |

Hai code `business-*` là bổ sung ngoài danh sách ví dụ trong spec Phase 4 (spec dùng "ví dụ:", không
đóng danh sách) — cần thiết vì hai business alert này đã tồn tại từ `dataQualityRules.ts` (Phase 1.5)
và KHÔNG được phép biến thành lỗi chặn import (nguyên tắc #17).
