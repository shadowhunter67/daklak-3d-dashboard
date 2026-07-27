# ADR 0007 — Offline project-data importer and last-known-good promotion

- Status: accepted
- Date: 2026-07-27
- Liên quan: [ADR 0006](0006-canonical-project-portfolio-data-contract.md) (Phase 3),
  [docs/project-data-import/](../project-data-import/) (Phase 1-4)

## Bối cảnh

Phase 3 tạo ra canonical bundle versioned + JSON Schema + drift guard, nhưng chưa có cách nào biến
dữ liệu nội bộ thật (CSV/JSON đã chuẩn bị thủ công) thành một bundle đã validate mà
`GeneratedJsonProjectPortfolioSource` dùng được — importer CLI vẫn chỉ là thiết kế
(`03-importer-design.md`). Phase 4 xây CLI đó, với ràng buộc cứng: không backend/database/auth,
không rewrite mapper/domain validator/quality rule, không parse "best-effort", không silently drop
record.

## Quyết định 1 — Chạy TypeScript trực tiếp qua `tsx`, không build step riêng

Node 22 (CI) hỗ trợ type-stripping (`--experimental-strip-types`) nhưng đòi hỏi mọi import specifier
có extension tường minh (`./foo.ts`) — codebase hiện tại (`src/entities/project/*.ts`) dùng import
extensionless nhất quán (giống mọi file domain khác), sửa lại hàng loạt để phù hợp type-stripping sẽ
là thay đổi phong cách không cần thiết trên code Phase 3 đã merge. `tsx` (esbuild-based, MIT, 4.23.1)
resolve extensionless import giống hệt Vite/Vitest/tsc hiện có — importer import trực tiếp
`../../src/entities/project/...` mà không sửa một dòng nào ở phía domain. Đã chạy
`npm audit --audit-level=high` sau khi thêm — 0 vulnerability.

## Quyết định 2 — `csv-parse` (node-csv, MIT) thay vì tự viết `split(',')`

Cần quoted-cell/escaped-quote/quoted-newline/BOM/CRLF đúng chuẩn RFC 4180 — các package "node-csv"
(`csv-parse`) là dependency nhỏ, ổn định, được `npm audit` xác nhận 0 vulnerability, license MIT. Cả
hai dependency mới nằm ở `devDependencies` (Node-only tooling, giống `ajv`/`ajv-formats` đã có từ
Phase 3) — `npm run validate:public-build(:dist)` xác nhận không lọt vào browser bundle (không file
nào dưới `src/` import `csv-parse`/`tsx`).

## Quyết định 3 — Import all-or-nothing theo TOÀN BỘ lần chạy, không per-record partial-drop

Spec yêu cầu "không được silently drop record" và đồng thời cảnh báo về lỗi dây chuyền khi một record
bị reject làm hỏng FK của record khác. Quyết định: Phase 4 KHÔNG loại từng record lỗi rồi tiếp tục
import phần còn lại — bất kỳ issue nào có `severity: 'error'` (transport/schema/domain/quality) khiến
TOÀN BỘ lần chạy bị đánh dấu `blocking`, và bundle không được ghi/promote (nguyên tắc #11, #15).
`rejected-records.json` vẫn liệt kê MỌI record có lỗi (gom theo record, không lặp) để người vận hành
sửa, nhưng không có khái niệm "import thành công một phần". Đây là lựa chọn AN TOÀN HƠN partial-drop
(không bao giờ âm thầm bỏ qua dữ liệu xấu), đổi lại: nếu 1 dòng CSV sai, cả file phải sửa rồi chạy
lại — chấp nhận được ở quy mô dữ liệu dự án trọng điểm (hàng chục, không phải hàng triệu record).
Partial/quarantine-import theo từng record là backlog Phase 5.

## Quyết định 4 — Orphan-reference check bổ sung ở tầng importer, không sửa mapper

Phát hiện khi viết test tích hợp: `groupCanonicalDatasetsIntoProjectBundles` (Phase 3) nhóm
workPackages/milestones/projectIssues/progressSnapshots THEO `datasets.projects` — một record có
`projectId` không khớp bất kỳ project nào bị loại khỏi MỌI `ProjectBundle`, không lỗi không cảnh báo
ở tầng mapper (hành vi đúng thiết kế Phase 3: mapper chỉ "group", không validate). Hệ quả:
`dangling-project-reference` trong `dataQualityRules.ts` không bao giờ tự bắt được orphan thật, vì
nó chỉ chạy trên record ĐÃ nằm trong một bundle (tức `projectId` đã khớp theo cách nó được nhóm vào).
`data-templates/examples/invalid/broken-foreign-key.json` (Phase 3, mô tả "PASS Layer 1, FAIL Layer
3") chưa từng được chạy qua mapper+dataQualityRules thật trong CI Phase 3 —
`validate_project_data_contract.mjs` chỉ kiểm Layer 1. Importer là code path ĐẦU TIÊN thực sự chạy
Layer 3 trên các fixture này, và lộ ra khoảng trống trên.

Fix: `checkOrphanedProjectReferences()` trong `scripts/import-data/pipeline.ts` — kiểm tra
`projectId` của 4 dataset con so với `datasets.projects` TRƯỚC khi gọi mapper, độc lập với
`dataQualityRules.ts`. Đây KHÔNG phải viết lại mapper/quality-rule (không đổi logic nhóm, không đổi
rule nào trong `dataQualityRules.ts`) — là một integrity check import-level mới, bù đúng khoảng
trống mà mapper để lại theo thiết kế. `dataQualityRules.ts`'s `dangling-project-reference` vẫn giữ
nguyên, tiếp tục đúng vai trò của nó cho các trường hợp khác (không đổi, không xoá).

## Quyết định 5 — `--last-known-good` chỉ đọc, không tự promote

`--last-known-good <path>` dùng để so sánh `normalizedContentChecksum` (báo `noChange`), KHÔNG tự
động copy output mới vào đường dẫn đó. Lý do: "có thể copy/promote theo policy rõ" (spec) — để tránh
importer tự ý ghi đè một thư mục mà người vận hành có thể đang dùng làm baseline tham chiếu cho việc
khác, promote vào last-known-good là bước THỦ CÔNG (người vận hành tự quyết định khi nào baseline mới
thay thế baseline cũ). Xem `docs/project-data-import/last-known-good-policy.md`.

## Quyết định 6 — Staging tách riêng khỏi import; nợ đặt tên file target

`npm run stage:internal-portfolio -- --bundle <path>` là bước THỨ HAI, tách khỏi `import:data` —
validate lại (schemaVersion + JSON Schema) rồi ghi vào
`src/assets/data/project-portfolio.generated-fixture-demo.json`, KHÔNG tự `git add`/`git commit`.
**Nợ đặt tên**: file target vẫn giữ tên "generated-fixture-demo" kế thừa từ Phase 2/3 (ban đầu là
test fixture) dù giờ đây có thể chứa dữ liệu import thật — đổi tên file này kéo theo sửa
`config/public-data-files.json` checksum + mọi test tham chiếu path đó, ngoài phạm vi Phase 4. Ghi
nhận là backlog Phase 5 (`docs/project-data-import/05-implementation-backlog.md`).

## Quyết định 7 — Không có `DatasetDescriptor` giả cho `sourceDatasetId` lạ

`resolveDatasetIds()` (`scripts/import-data/sourceRegistry.ts`) chỉ kiểm tra
`sourceDatasetId` qua `DATASET_CATALOG` (đã có) + `--source-registry <path>` tuỳ chọn (mảng id đơn
giản, không phải bản sao `DatasetDescriptor`) — id lạ là warning mặc định, error dưới `--strict`.
Không tự tạo descriptor cho id chưa biết (nguyên tắc #8).

## Hệ quả

- `scripts/import-data/` (17 module TypeScript + fixture) — CLI `import:data`, staging
  `stage:internal-portfolio`, test `test:project-data-import` (64 test).
- `tsconfig.scripts.json` mới (project reference thứ 3 trong `tsconfig.json`) — typecheck độc lập,
  không ảnh hưởng `tsconfig.app.json`/`tsconfig.node.json`.
- `package.json`: 2 devDependency mới (`tsx`, `csv-parse`), 3 script mới, `quality:frontend` thêm
  bước `test:project-data-import`.
- Không thêm database/backend/authentication/HTTP source/XLSX parser/public projection engine.
