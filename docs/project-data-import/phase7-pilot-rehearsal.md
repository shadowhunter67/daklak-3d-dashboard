# Phase 7 — representative pilot rehearsal (real importer output through public projection)

Trả lời câu hỏi còn treo trong ADR 0009 backlog: "chưa có importer thật (Phase 4) chạy dữ liệu nội
bộ THẬT qua public projection engine — mới verify bằng canonical fixture Phase 3 (hư cấu 100%)", và
review finding F-001 (bản review Phase 7 độc lập). Đây KHÔNG phải dữ liệu vận hành thật — vẫn hư cấu
100%, nhưng đi qua đúng đường ống THẬT (CSV → importer CLI → canonical bundle → public projection
engine → staging), khác với `data-templates/examples/representative-valid/` (một file JSON canonical
viết tay, chưa từng qua importer).

## Vị trí

`data-templates/pilot/phase7-integration-rehearsal/`:

- `agencies.csv`, `contractors.csv`, `projects.csv`, `work-packages.csv`, `progress-snapshots.csv` —
  input CSV, header đã là canonical name (xem [csv-contract.md](csv-contract.md); không có bước
  rename cột vì nguồn thí điểm này coi như đã xuất đúng canonical schema — bảng mapping bên dưới ghi
  nhận đây là ánh xạ 1-1, KHÔNG phải "không cần mapping").
- `source-registry.json` — đăng ký `sourceDatasetId` "phase7-pilot-rehearsal" (chưa có trong
  `data-templates/dataset-catalog.json`, dùng `--source-registry` thay vì sửa catalog dùng chung).
- `publication-decisions.pilot.json` — publication-decision set mẫu (ADR 0010): 3/4 project +
  agencies/contractor/work-package/progress-snapshots liên quan = `public`, 1 project
  (`pilot-proj-004`) = `excluded` tường minh.
- `approval-receipt.pilot.json` — approval receipt mẫu, checksum khớp với output đã sinh ra từ
  đúng bộ input trong thư mục này ở lần chạy ghi trong tài liệu này (xem "Kết quả thật" bên dưới) —
  **sẽ KHÔNG còn khớp nếu bất kỳ file input nào trong thư mục này đổi** (đây chính là hành vi mong
  muốn: `stage:public-portfolio --require-approval-receipt` phải từ chối stage khi vậy).

## Field disposition (mapping proof, Workstream B)

Toàn bộ 5 file input dùng ĐÚNG canonical column name — ánh xạ là identity (source column = canonical
field). Bảng dưới liệt kê phân loại theo đúng cấu trúc yêu cầu (mapped/required/optional/derived):

### `projects.csv` (4 dòng)

| Source column                                                                         | Canonical field                    | Required | Ghi chú kịch bản pilot                                                                 |
| ------------------------------------------------------------------------------------- | ---------------------------------- | -------- | -------------------------------------------------------------------------------------- |
| `id`,`code`,`name`,`description`                                                      | `id`,`code`,`name`,`description`   | Có       | `pilot-proj-003` cố ý dùng tên/mô tả rất dài (stress-test UI)                          |
| `sector`,`status`,`priority`                                                          | như trên                           | Có       | phủ 3 sector khác nhau (transport/irrigation), nhiều status                            |
| `managing_authority_id`,`investor_id`                                                 | `managingAuthorityId`,`investorId` | Có       | trỏ tới 2 agency trong `agencies.csv`                                                  |
| `project_manager_id`,`approval_decision`                                              | tương ứng                          | Không    | để trống ở mọi dòng — kiểm chứng optional field bị OMIT, không lưu `""`                |
| `forecast_completion_date`,`actual_completion_date`                                   | tương ứng                          | Không    | để trống ở mọi dòng — cùng lý do trên                                                  |
| `approved_budget_vnd`,`disbursed_amount_vnd`,`*_progress_pct`                         | tương ứng                          | Có       | `pilot-proj-002` dùng TOÀN SỐ 0 hợp lệ (chưa giải ngân) — không phải thiếu dữ liệu     |
| `administrative_area_codes`                                                           | `administrativeAreaCodes`          | Có       | `;`-delimited, dùng mã thật trong `daklak-labels.json` (22015, 24133, 24187)           |
| `data_updated_at`,`data_owner`,`source_dataset_id`,`confidence`,`verification_status` | tương ứng                          | Có       | `source_dataset_id` đăng ký qua `--source-registry` (chưa có trong catalog dùng chung) |

### `agencies.csv` (2 dòng), `contractors.csv` (1 dòng)

Ánh xạ 1-1 toàn bộ field, không có gì đặc biệt ngoài một `data_owner` để trống ở `pilot-agency-002`
(kiểm chứng optional field cấp agency).

### `work-packages.csv` (1 dòng, chỉ cho `pilot-proj-001`)

`pilot-proj-002` cố ý KHÔNG có work package nào — kiểm chứng Project Detail hiển thị đúng khi danh
sách rỗng (không phải lỗi thiếu dữ liệu).

### `progress-snapshots.csv` (4 dòng)

3 snapshot cạnh tranh cho `pilot-proj-001` theo đúng thứ tự thời gian, `verificationStatus` khác
nhau (`submitted` → `rejected` → `approved`) — kiểm chứng `selectAuthoritativeSnapshot` (Phase 6) chọn
đúng snapshot `approved` mới nhất làm authoritative, bỏ qua bản `rejected`. 1 snapshot cho
`pilot-proj-003` ở trạng thái hoàn thành 100%.

## Không nằm trong phạm vi pilot này

- **Negative-path (FK gãy, dataset id không rõ nguồn, ID trùng lặp, mã hành chính sai)**: KHÔNG lặp
  lại ở đây — đã có 11 fixture âm tính tại `data-templates/examples/invalid/`, được
  `npm run test:project-data-import` bao phủ đầy đủ. Pilot này tập trung vào golden-path thật với
  nhiều đặc điểm dữ liệu thực tế, không phải bộ test validation (đã có sẵn).
- **milestones.csv, project-issues.csv, evidence.csv, reference-documents.csv**: không có trong bộ
  pilot — theo `csv-contract.md`, file vắng mặt = dataset rỗng (hành vi hợp lệ, không phải lỗi); kiểm
  chứng luôn nhánh "dataset không có file" của importer.

## Kết quả thật (lệnh đã chạy, output thật — không suy đoán)

```bash
npm run import:data -- \
  --input data-templates/pilot/phase7-integration-rehearsal \
  --output <scratch> --as-of 2026-07-29T00:00:00.000Z --strict \
  --source-registry data-templates/pilot/phase7-integration-rehearsal/source-registry.json
# => Status: OK. agencies=2 contractors=1 projects=4 workPackages=1 progressSnapshots=4.
#    normalizedContentChecksum=66e4713c6c5ef81c17f54703d9b1f7ecd433c7f0551f5d317bfd6dff85b06a4d

npm run project:public-data -- \
  --input <scratch>/project-portfolio.bundle.json --output <scratch-public> \
  --publication-decisions data-templates/pilot/phase7-integration-rehearsal/publication-decisions.pilot.json \
  --require-publication-decisions
# => projects sau projection: pilot-proj-001, pilot-proj-002, pilot-proj-003 (pilot-proj-004 loại
#    đúng theo publication decision 'excluded', policyRule='publication-decision override').
#    projectedContentChecksum=17167ca504b9b5ede464544232549dc4e67a02b8fb65cd61dbc47f7e4eeb4631
#    publicationDecisionSetChecksum=849a2288b6a8bab723879aa9305676ea507675b3f3a02473feaab83cfe0e137e

npm run stage:public-portfolio -- \
  --input <scratch-public> \
  --approval-receipt data-templates/pilot/phase7-integration-rehearsal/approval-receipt.pilot.json \
  --require-approval-receipt
# => "Approval receipt hợp lệ" — đã ghi bundle+manifest (dùng
#    STAGE_PUBLIC_*_TARGET_PATH_OVERRIDE để không đụng vị trí staged thật trong lần chạy thử này).
```

Đã kiểm chứng thêm 2 nhánh fail-closed (không ghi file nào ở cả hai trường hợp):

- `stage:public-portfolio --require-approval-receipt` KHÔNG kèm `--approval-receipt` → lỗi tham số,
  từ chối chạy.
- `--approval-receipt` trỏ tới bản receipt bị sửa `projectedContentChecksum` → "Approval receipt
  KHÔNG khớp với manifest đang stage — KHÔNG ghi output", chỉ rõ đúng field không khớp.

## Giới hạn trung thực

- Đây vẫn là dữ liệu **hư cấu**, không phải dữ liệu nội bộ thật — chỉ chứng minh ĐƯỜNG ỐNG hoạt động
  đúng với input CSV thực tế đi qua importer thật, không chứng minh một nguồn dữ liệu nội bộ CỤ THỂ
  nào tương thích (mỗi nguồn thật vẫn cần bảng mapping và pilot riêng, xem
  [field-mapping-guide.md](../../integration-kit/field-mapping-guide.md)).
- Ánh xạ trong pilot này là 1-1 (nguồn đã dùng canonical header) — một nguồn nội bộ thật hầu như chắc
  chắn KHÔNG dùng đúng canonical header, nên bảng mapping thật cho nguồn đó sẽ phức tạp hơn đáng kể.
- Không chạy build:internal-static/UI thật với bundle pilot này trong tài liệu này (xem
  `reports/ui-review/phase-7/` nếu đã chạy — không giả định).
