# CSV contract — offline importer (Phase 4)

Nguồn sự thật: `scripts/import-data/csvColumnSpecs.ts` (mapping) + `data-templates/csv/*.csv`
(header mẫu, Phase 3). Tài liệu này chỉ giải thích chính sách.

## File

| File                      | Bắt buộc | Thiếu →                                                                                         |
| ------------------------- | -------- | ----------------------------------------------------------------------------------------------- |
| `projects.csv`            | Có       | Lỗi chặn (`input-not-found`)                                                                    |
| `agencies.csv`            | Không    | Dataset rỗng                                                                                    |
| `contractors.csv`         | Không    | Dataset rỗng                                                                                    |
| `work-packages.csv`       | Không    | Dataset rỗng                                                                                    |
| `milestones.csv`          | Không    | Dataset rỗng                                                                                    |
| `project-issues.csv`      | Không    | Dataset rỗng                                                                                    |
| `progress-snapshots.csv`  | Không    | Dataset rỗng                                                                                    |
| `evidence.csv`            | Không    | Dataset rỗng                                                                                    |
| `reference-documents.csv` | Không    | Dataset rỗng                                                                                    |
| `audit-events.csv`        | Không    | Được nhận diện nhưng nội dung KHÔNG ingest (cảnh báo) — auditEvents deferred, xem ADR 0006/0007 |

File `.csv` khác không khớp danh sách trên: cảnh báo mặc định, lỗi chặn dưới `--strict`
(`dataset-unresolved`).

## Header

Chỉ chấp nhận CANONICAL column name (snake_case) đúng như `data-templates/csv/*.csv` — không fuzzy
match, không alias mặc định. Header trùng lặp → lỗi chặn toàn file (`csv-header-duplicate`). Header
rỗng hoặc không khớp canonical → cảnh báo mặc định, lỗi dưới `--strict` (`csv-column-unknown`). Thiếu
cột bắt buộc → lỗi chặn (`field-required`, cấp dataset, không cần đợi tới từng dòng).

**Alias mapping (Phase 5, chưa triển khai)**: một file config kiểu
`{"projects": {"project_code": "code"}}` cho phép ánh xạ tên cột khác — CHƯA có ở Phase 4, mọi cột
phải đúng canonical name.

## Parsing

Dùng `csv-parse` (node-csv, MIT) — hỗ trợ quoted cell chứa dấu phẩy/newline, escaped quote (`""`),
UTF-8 BOM (tự động bóc ở header + đọc file strict UTF-8), CRLF/LF, empty trailing cell.
`relax_column_count: true` ở tầng parse — số cột thiếu/thừa theo header được tầng mapping báo lỗi cụ
thể, không phải một lỗi parse chung chung.

## Row number

Dòng dữ liệu đầu tiên (ngay sau header) là **dòng 2** trong mọi report (`row` field) — khớp số dòng
thật khi mở file trong trình soạn thảo văn bản thông thường (dòng 1 = header).

## Normalization

Xem `scripts/import-data/normalize.ts`:

- Mọi cell: bóc BOM lạc, Unicode NFC, trim hai đầu.
- Cell rỗng (sau trim) trên field optional → field bị OMIT (không phải chuỗi rỗng).
- VND (`*_vnd` field): CHỈ số nguyên thập phân thuần (`0`, `1`, `42000000000`) — từ chối
  `1,000,000`/`1.000.000`/`1 tỷ`/`1,5`/`-1`/số ngoài `Number.MAX_SAFE_INTEGER`. Không tự chuyển đổi
  đơn vị "tỷ đồng".
- Phần trăm (`*_pct` field): số 0-100, cho phép thập phân.
- Ngày (`*_date`): CHỈ `YYYY-MM-DD` — từ chối `01/02/2026`, `02-01-2026`, `today`.
- Thời điểm (`*_at`): CHỈ ISO 8601 đầy đủ có timezone (`2026-07-27T00:00:00.000Z`) — không tự gắn
  timezone máy chạy importer cho giá trị thiếu timezone (từ chối thẳng).
- Boolean (`critical`): CHỈ `true`/`false` (không phân biệt hoa/thường) — từ chối `yes`/`no`/`1`/`0`.
- Mảng `;`-delimited: CHỈ áp dụng cho `administrative_area_codes`/`evidence_ids` (đã tài liệu hoá) —
  không tự split mọi chuỗi có dấu `;`. Rỗng → mảng rỗng.

## Geometry — hoãn sang canonical JSON

CSV KHÔNG có cột geometry — `project.geometry`/`issue.relatedGeometry`/`project.geometryMetadata`
luôn vắng mặt khi import qua CSV. Lý do: GeoJSON không có biểu diễn CSV-cell an toàn không mơ hồ mà
chưa có contract rõ (spec cho phép hoãn). Muốn import kèm geometry: dùng JSON mode (canonical bundle
đầy đủ). `geometry_json` (JSON string trong 1 cell) là backlog Phase 5 nếu có nhu cầu thật.

## Identity

Không tự sinh `id` từ vị trí dòng — thiếu `id`/khoá bắt buộc là lỗi chặn (`field-required`), không
suy ra bằng tên hay hash nội dung.

## XLSX — hoãn

Không triển khai ở Phase 4: CSV pipeline (quoted/BOM/CRLF/escaped-quote) đã đủ ổn định làm nền tảng
đầu tiên; thêm một dependency XLSX (`xlsx`/`exceljs`...) sẽ mở rộng phạm vi review license/security
mà chưa có yêu cầu vận hành cụ thể nào đòi hỏi ngay. Backlog Phase 5 nếu có nhu cầu thật — sẽ đánh giá
lại license/dependency risk tại thời điểm đó, không giả định trước.
