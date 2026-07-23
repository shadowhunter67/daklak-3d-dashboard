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
                                  trị, thứ tự ngày, geometry)
    dataQualityRules.ts          runDataQualityRules(): kiểm tra liên-record (tham chiếu tồn tại,
                                  mã hành chính, trùng khoá, staleness) trên toàn bộ tập bundle
  kpi/
    types.ts                     KpiResult, availableKpi()/unavailableKpi()
    index.ts                     9 hàm KPI (disbursementRate, scheduleVariance, progressVariance,
                                  budgetVariance, forecastDelayInDays, overdueIssueCount,
                                  landClearanceCompletionRate, dataFreshness, dataCompleteness)
  fixtures/
    projects.mock.ts             9 dự án minh hoạ (giao thông ×2, năng lượng, thuỷ lợi, y tế ×2,
                                  giáo dục, đô thị, chuyển đổi số)
  dataQualitySummary.ts          summarizeDataQuality(): tổng hợp cho UI (Phase 2)
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
`daklak-labels.json`) để đi qua được rule "administrative code phải tồn tại"; tên dự án, ngân sách,
nhà thầu, cơ quan đều là hư cấu và được đánh dấu "(minh hoạ)"/"minh hoạ" trong `description`/
`dataOwner`. `sourceDatasetId: 'mock-project-portfolio-v1'` cố tình không tồn tại trong
`DATASET_CATALOG` thật để không ai nhầm đây là dữ liệu đã qua catalog chính thức.

## Chưa làm trong Phase 1 (theo đúng phạm vi additive)

- Không có UI nào tiêu thụ domain này (Executive Overview, Project Portfolio... là Phase 2).
- Không có JSON Schema mirror + Ajv drift-guard cho domain Project (khác với
  `data-platform/validation/schemaDriftGuard.ts`) — quyết định phạm vi: hand-written TS validator
  đã đủ để chặn `npm test`; thêm JSON Schema son song cho 5 entity mới sẽ là một khối lượng công
  việc riêng, để dành khi có nhu cầu thật (ví dụ một API contract cần JSON Schema để publish OpenAPI
  ở Phase 3) thay vì làm trước khi cần.
- Không có repository/service layer, DTO mapper, hay kết nối `DatasetAdapter` thật (Phase 3).
- Không có permission API (`canViewProject`...) hay audit emitter thật (Phase 4).
