# Canonical bundle examples

Ba nhóm — dùng bởi `npm run validate:project-data-contract` (`scripts/validate_project_data_contract.mjs`)
và `src/entities/project/validation/projectSchemaDriftGuard.test.ts`.

## `minimal-valid/`

Bundle nhỏ nhất hợp lệ — 1 project, không dataset phụ nào khác, ít field optional nhất có thể. Dùng
để xác nhận schema không âm thầm yêu cầu quá nhiều field.

## `representative-valid/`

Bundle bao phủ nhiều scenario cùng lúc trong MỘT bundle: point geometry + line geometry (dự án
tuyến), work package, milestone, issue, 3 progress snapshot (2 giai đoạn xác thực khác nhau cùng một
lần quan sát + 1 lần quan sát mới hơn), evidence, reference document, một dự án cố tình thiếu
`forecastCompletionDate`/`adjustedBudget` (hợp lệ — không phải lỗi, minh hoạ KPI unavailable khi
thiếu input tuỳ chọn thay vì suy ra 0).

## `invalid/` — mỗi file đúng MỘT lỗi, và lỗi đó thuộc ĐÚNG MỘT lớp kiểm định

Ba lớp (xem docs/project-data-import/02-canonical-schema-proposal.md, ADR 0006):

- **Layer 1** (JSON Schema — `scripts/validate_project_data_contract.mjs`): shape, type, enum,
  required field.
- **Layer 2** (`src/entities/project/validation/validateProject.ts`): semantic một record độc lập.
- **Layer 3** (`src/entities/project/validation/dataQualityRules.ts`): cross-record — FK, trùng
  khoá, mã hành chính, stale.

| File                               | Vi phạm                                                     | Layer chặn                                                                                                   | Có PASS JSON Schema không?                                                                     |
| ---------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `unknown-schema-version.json`      | `schemaVersion: "9.9.9"` không nằm trong allowlist hỗ trợ   | Runtime (`isSupportedCanonicalSchemaVersion`, KHÔNG phải JSON Schema — schema chỉ kiểm tra định dạng semver) | **Có** — semver hợp lệ về mặt cấu trúc                                                         |
| `missing-required-field.json`      | Bundle thiếu hẳn key `datasets`                             | Layer 1                                                                                                      | Không                                                                                          |
| `invalid-enum.json`                | `project.status: "in-limbo"` không thuộc `PROJECT_STATUSES` | Layer 1                                                                                                      | Không                                                                                          |
| `invalid-vnd.json`                 | `approvedBudget: 1000000000.5` có phần thập phân            | Layer 1 (`type: integer`) — cùng điều kiện `isValidVndAmount()`                                              | Không                                                                                          |
| `invalid-date.json`                | `startDate: "01/02/2026"` (DD/MM mơ hồ, không phải ISO)     | Layer 1 (`format: date`)                                                                                     | Không                                                                                          |
| `broken-foreign-key.json`          | `workPackage.projectId` trỏ tới project không tồn tại       | **Layer 3**                                                                                                  | **Có** — mỗi object riêng lẻ hợp lệ, JSON Schema không biết kiểm tra tham chiếu chéo giữa mảng |
| `duplicate-id.json`                | Hai project cùng `id`                                       | **Layer 3**                                                                                                  | **Có** — cùng lý do, JSON Schema không kiểm tra tính duy nhất giữa các phần tử mảng            |
| `invalid-administrative-code.json` | `administrativeAreaCodes: ["00000"]` không map được         | **Layer 3**                                                                                                  | **Có** — schema chỉ kiểm tra đây là chuỗi không rỗng, không biết mã nào là thật                |
| `invalid-geometry.json`            | `coordinates: [500, 12.68]` — longitude ngoài phạm vi       | Layer 1 VÀ Layer 2 (cả hai đều có trách nhiệm)                                                               | Không                                                                                          |
| `empty-required-string.json`       | `name: ""`                                                  | Layer 1 (`minLength: 1`)                                                                                     | Không                                                                                          |
| `additional-property.json`         | Field lạ `internalNote`                                     | Layer 1 (`additionalProperties: false`)                                                                      | Không                                                                                          |

Ba file `broken-foreign-key.json`/`duplicate-id.json`/`invalid-administrative-code.json` **CỐ Ý**
pass JSON Schema — đây không phải lỗ hổng của schema, mà là minh hoạ đúng ranh giới trách nhiệm:
JSON Schema (Layer 1) không có khái niệm "nhìn toàn bộ tập dữ liệu cùng lúc", đó là việc của Layer 3.
`scripts/validate_project_data_contract.mjs` biết phân biệt hai nhóm này khi chạy (xem
`EXPECTED_LAYER1_RESULT` trong script) — không báo lỗi sai khi 3 file này pass Layer 1.
