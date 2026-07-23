# Domain model — dự án trọng điểm

Tài liệu hoá `src/entities/project/` (Phase 1 của
[docs/adr/0001-project-centric-domain.md](adr/0001-project-centric-domain.md)). Đây là domain
layer **thuần dữ liệu/logic** — chưa có UI nào tiêu thụ nó (Phase 2). Không phá vỡ, không thay thế
`src/data-platform/` (dataset provenance) hay `src/stores/mapStore.ts` (ward/map UI state).

```
src/entities/project/
  types.ts                       Project, WorkPackage, Milestone, ProjectIssue, ProgressSnapshot,
                                  Agency, Contractor, Evidence, ReferenceDocument, DataQualityIssue,
                                  ProjectAuditEvent, status taxonomy enums
  validation/
    validateProject.ts           validate*Record(): kiểm tra MỘT record độc lập (shape, khoảng giá
                                  trị, thứ tự ngày, geometry, số nguyên VND)
    dataQualityRules.ts          runDataQualityRules(): kiểm tra liên-record (tham chiếu tồn tại,
                                  mã hành chính, trùng khoá, staleness, trùng/nhiều-giai-đoạn
                                  progress snapshot) trên toàn bộ tập bundle — nhận
                                  ProjectValidationContext-style context (validAdministrativeCodes,
                                  asOf) từ caller, không tự đọc GIS asset hay Date.now()
    progressSnapshotSelection.ts identity (projectId+observedAt+sourceDatasetId) + selection rule
                                  (approved > reviewed > submitted > validated-automatically > raw;
                                  superseded/rejected không bao giờ được chọn)
  kpi/
    types.ts                     KpiResult, availableKpi()/unavailableKpi() — asOf bắt buộc
    index.ts                     9 hàm KPI (disbursementRate, scheduleVariance, progressVariance,
                                  budgetVariance, forecastDelayInDays, overdueIssueCount,
                                  landClearanceCompletionRate, dataFreshness, dataCompleteness)
  fixtures/
    projects.mock.ts             9 dự án minh hoạ (giao thông ×2, năng lượng, thuỷ lợi, y tế ×2,
                                  giáo dục, đô thị, chuyển đổi số) — phủ đủ scenario yêu cầu (xem
                                  "Scenario coverage" bên dưới)
  portfolioAssessment.ts         assessPortfolio(): tách validationErrors / qualityIssues /
                                  businessAlerts — xem "Ba nhóm kết quả" bên dưới
  dataQualitySummary.ts          summarizeDataQuality(): tổng hợp cho UI (Phase 2)
  importBoundary.test.ts         architecture test: production code không được import GIS asset/
                                  component/store/CSS
```

## Vì sao Project, không phải Ward, là entity trung tâm

Xem ADR 0001. Tóm tắt: `Project.administrativeAreaCodes: string[]` là bộ lọc/thuộc tính không
gian, không phải khoá chính. Một dự án có thể liên quan nhiều ward hoặc không ward nào cụ thể (dự
án tuyến, dự án điểm).

## Status taxonomy

Không dùng chuỗi tuỳ ý ở bất kỳ đâu — mọi status là union type hữu hạn khai báo trong `types.ts`:

| Entity                    | Type                 | Giá trị                                                                                                        |
| ------------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------- |
| Project                   | `ProjectStatus`      | proposed, preparing, approved, procurement, active, at-risk, delayed, suspended, completed, cancelled, unknown |
| WorkPackage               | `WorkPackageStatus`  | planned, procurement, active, at-risk, delayed, suspended, completed, cancelled, unknown                       |
| Milestone                 | `MilestoneStatus`    | planned, on-track, at-risk, delayed, achieved, cancelled, unknown                                              |
| ProjectIssue              | `IssueStatus`        | open, acknowledged, in-progress, blocked, resolved, closed                                                     |
| Mọi record cần xác thực   | `VerificationStatus` | raw, validated-automatically, submitted, reviewed, approved, rejected, superseded                              |
| Mọi record cần độ tin cậy | `DataConfidence`     | verified, high, medium, low, unknown                                                                           |

`VerificationStatus`/`DataConfidence` ở đây **độc lập** với `PublicationStatus`/`QualityStatus` của
`src/data-platform/schemas/dataset.ts` — hai domain khác nhau (dataset provenance vs. dự án), không
tái dùng nhầm dù tên nghe giống nhau.

## Nguyên tắc "không dùng 0 thay cho thiếu dữ liệu"

Mọi hàm trong `kpi/index.ts` trả `KpiResult` với `status: 'unavailable'` và `value: null` khi thiếu
input — không bao giờ suy ra 0. Lý do: 0 là một giá trị nghiệp vụ có thật (ví dụ "chưa giải ngân
đồng nào"), lẫn với "không tính được" sẽ khiến lãnh đạo đọc sai tình trạng dự án. UI (Phase 2) phải
hiển thị rõ trạng thái `unavailable` kèm `missingInputs`/`explanation`, không hiển thị số 0 trần
trụi.

## Data quality

`runDataQualityRules()` implement 11 rule bắt buộc theo spec (xem docstring trong
`dataQualityRules.ts` — mỗi rule chú thích số thứ tự tương ứng). `summarizeDataQuality()` gộp kết
quả đó với `validateProject.ts` thành một `DataQualitySummary` — shape sẵn sàng cho feature
`data-quality` ở Phase 2.

## Dữ liệu mẫu

`fixtures/projects.mock.ts` — 9 dự án **DỮ LIỆU MINH HỌA**, deterministic (không phụ thuộc
`Date.now()`; mọi tính toán "quá hạn"/"stale" trong test dùng `MOCK_REFERENCE_DATE` cố định). Mã
hành chính dùng trong fixture là mã xã/phường **thật** của Đắk Lắk (đối chiếu qua
`daklak-labels.json` — chỉ trong test, xem "Import boundary" bên dưới) để đi qua được rule
"administrative code phải tồn tại"; tên dự án, ngân sách, nhà thầu, cơ quan đều là hư cấu và được
đánh dấu "(minh hoạ)"/"minh hoạ" trong `description`/`dataOwner`. Mọi `sourceDatasetId` trỏ vào một
trong ba dataset thật `project-portfolio-illustrative`/`project-progress-illustrative`/
`project-issues-illustrative` trong `DATASET_CATALOG` (xem "Phase 1.5" bên dưới) — Phase 1 ban đầu
dùng một id cố tình không tồn tại, đã được hardening lại.

## Phase 1.5 — domain hardening

Bốn điểm kiến trúc còn thiếu sau Phase 1, xử lý trước khi xây UI (Phase 2A) để UI không kế thừa nợ
kỹ thuật domain:

### Provenance của mock data — không còn `sourceDatasetId` giả

Phase 1 dùng `sourceDatasetId: 'mock-project-portfolio-v1'` cố tình không tồn tại trong catalog. Đây
là một shortcut, không phải bất biến thật — nó khiến domain dự án là ngoại lệ duy nhất trong toàn
repo không truy vết được provenance qua `getDatasetById`. Phase 1.5 thêm 3 `DatasetDescriptor` thật
vào `src/data-platform/catalog/datasets.ts` (`project-portfolio-illustrative`,
`project-progress-illustrative`, `project-issues-illustrative` — `classification: 'public'`,
`authority: 'illustrative'`, `access.delivery: 'bundled-static'`), và mọi fixture record
(`Project.sourceDatasetId`, `ProgressSnapshot.sourceDatasetId`, `ProjectIssue.sourceDatasetId` — field
mới thêm) trỏ vào một trong ba id đó. `fixtures/projects.mock.test.ts` xác nhận mọi id resolve được,
đều public/illustrative — không có descriptor "official" nào được tạo cho dữ liệu minh hoạ.

### Import boundary — domain không phụ thuộc GIS asset/UI

`dataQualityRules.ts`/`validateProject.ts` vốn đã nhận `validAdministrativeCodes: ReadonlySet<string>`
qua context thay vì tự import `daklak-labels.json` (đúng từ Phase 1). Phase 1.5 thêm
`importBoundary.test.ts` — quét tĩnh mọi file `.ts` production dưới `src/entities/project/`, chặn
import khớp `daklak-labels.json`, `assets/maps/`, `assets/data/`, `components/`, `stores/mapStore`,
`.css`, `App` — để bất biến này không âm thầm bị phá khi có người thêm code mới. Chỉ _test_ file được
phép build `validAdministrativeCodes` từ dữ liệu thật.

### Ba nhóm kết quả tách biệt — `PortfolioAssessment`

`portfolioAssessment.ts` (`assessPortfolio()`) tách rõ:

- `validationErrors` — record/quan hệ SAI (từ `validateProject.ts`), không dùng để tính KPI.
- `qualityIssues` — dữ liệu ĐÚNG nhưng cần chú ý (từ `dataQualityRules.ts`): stale, mã hành chính
  không map, trùng/nhiều-giai-đoạn snapshot...
- `businessAlerts` — tình trạng NGHIỆP VỤ của dự án hợp lệ: `schedule-delay`/`at-risk`/`suspended`
  (từ `Project.status`), `overdue-critical-issue` (issue severity critical, chưa resolved/closed, đã
  quá `dueAt`), `budget-exposure` (financialProgress vượt overallProgress hơn 15 điểm phần trăm —
  ngưỡng minh hoạ, ghi rõ trong code là chưa kiểm định bằng dữ liệu thật, cần xem lại khi có dữ liệu
  vận hành).

Một dự án `status: 'delayed'` là dữ liệu hợp lệ mô tả tình trạng xấu — không bao giờ xuất hiện trong
`validationErrors`.

### `asOf` tường minh — không có `new Date()` ngầm trong domain

Mọi hàm KPI (`kpi/index.ts`), `runDataQualityRules`, `summarizeDataQuality`, `assessPortfolio` nhận
`asOf: Date` bắt buộc (không có giá trị mặc định) — xoá toàn bộ `now: Date = new Date()` của Phase 1.
Cùng input + cùng `asOf` luôn cho cùng kết quả; lớp adapter/UI (Phase 2A) chịu trách nhiệm cung cấp
`asOf` mặc định tại đúng một nơi.

### Chuẩn hoá tiền tệ — Phương án A: số nguyên VND

Quyết định: **không** tạo `Money` value object (Phương án B) trong Phase 1.5 — chi phí refactor toàn
bộ field `approvedBudget`/`adjustedBudget`/`disbursedAmount`/`budget`/`paidAmount` sang một type mới
lớn hơn giá trị mang lại ở giai đoạn chưa có ngoại tệ hay số thập phân thật. Chọn **Phương án A**:
mọi trường tiền tệ vẫn là `number`, đơn vị VND, với hợp đồng rõ ràng (ghi trong JSDoc tại từng field
trong `types.ts`) và validate trong `validateProject.ts` (`isValidVndAmount`):

- `Number.isFinite`
- `Number.isInteger` (không có hào/xu ở quy mô ngân sách dự án — số thập phân luôn là lỗi dữ liệu)
- `>= 0`
- `<= Number.MAX_SAFE_INTEGER`

Nếu domain sau này cần đa tiền tệ hoặc số thập phân (ví dụ USD cho vốn ODA), đây là lúc chuyển sang
Phương án B — không làm trước khi có nhu cầu thật.

### Identity và selection rule cho ProgressSnapshot

`progressSnapshotSelection.ts` định nghĩa identity = `projectId + observedAt + sourceDatasetId`.
`dataQualityRules.ts` phân biệt hai tình huống trùng identity: cùng `sourceRecordId` là trùng lặp
thật (severity `error`, rule `duplicate-primary-key`); khác `sourceRecordId` là nhiều giai đoạn xác
thực hợp lệ của cùng một lần quan sát (severity `warning`, rule `multiple-verification-stage-records`).
`selectAuthoritativeSnapshot()` chọn đúng một bản ghi cho KPI theo thứ tự ưu tiên
`approved > reviewed > submitted > validated-automatically > raw`; `superseded`/`rejected` không bao
giờ được chọn — trả `null` nếu cả nhóm không có bản ghi dùng được, không tự suy ra giá trị thay thế.

### Scenario coverage của fixture

9 dự án mock (không tăng số lượng) được điều chỉnh để phủ đủ: on-track (prj-009, overallProgress =
plannedProgress), at-risk (prj-003), delayed (prj-005), suspended (prj-002, đổi từ `preparing`),
completed (prj-006), stale data (prj-007, `dataUpdatedAt` cố tình cũ hơn 90 ngày — duy nhất một dự
án, xác nhận bằng test), missing optional KPI input (prj-002/prj-007, không có
`adjustedBudget`/`forecastCompletionDate`), không geometry (prj-009), nhiều administrative area
(prj-001), overdue critical issue (prj-005), không issue (prj-004/006/008/009), progress snapshot
history nhiều điểm (prj-001). `fixtures/projects.mock.test.ts` có test riêng cho từng scenario.

### API contract gate (chuẩn bị Phase 3, không triển khai trong Phase 1.5)

**Quy tắc bắt buộc, ghi vào đây để không bị quên khi tới Phase 3:**

> Trước khi dữ liệu dự án được cung cấp qua `PublicHttpAdapter` hoặc `ProtectedApiAdapter` (thay vì
> `BundledStaticAdapter`/fixture tĩnh như hiện tại), bắt buộc phải có: (1) một API DTO schema có
> version rõ ràng (JSON Schema hoặc tương đương, theo pattern `data-templates/schemas/*.schema.json`
> đã có cho data-platform); (2) một mapper DTO → domain type tường minh (không dùng domain type trực
> tiếp làm response shape); (3) contract test đối chiếu DTO schema với dữ liệu mock/thật. Domain type
> trong `src/entities/project/types.ts` **không được mặc định trở thành wire contract** — một thay
> đổi nội bộ (đổi tên field, thêm optional field) không được phép âm thầm phá vỡ một API đã public.

Hand-written domain validator hiện tại (`validateProject.ts`, `dataQualityRules.ts`) xác thực dữ
liệu **sau khi đã map vào domain type** — nó không thay thế, và không đủ để thay thế, một API
contract test ở boundary DTO. Không có JSON Schema mirror + Ajv drift-guard cho 5 entity domain mới
trong Phase 1.5 (khác với `data-platform/validation/schemaDriftGuard.ts`) — quyết định phạm vi có
chủ đích: JSON Schema thật sự cần thiết khi có DTO/API contract để publish, tức là ở Phase 3, không
phải trước đó.

## Chưa làm (theo đúng phạm vi additive của Phase 0-1.5)

- Không có UI nào tiêu thụ domain này (Executive Overview là Phase 2A).
- Không có repository/service layer, DTO mapper, hay kết nối `DatasetAdapter` thật tới API — xem "API
  contract gate" ở trên (Phase 3).
- Không có permission API (`canViewProject`...) hay audit emitter thật (Phase 4).
