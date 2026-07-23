# ADR 0001 — Project là entity trung tâm; ward trở thành spatial dimension

- Status: accepted
- Date: 2026-07-23
- Liên quan: [docs/reviews/project-platform-gap-analysis.md](../reviews/project-platform-gap-analysis.md)

## Bối cảnh

Sản phẩm hiện tại là một dashboard trực quan hoá 102 xã/phường tỉnh Đắk Lắk: entity trung tâm hôm
nay là **Ward** (đơn vị hành chính), và mọi dữ liệu chuyên đề (energy, heatmap, dân số minh hoạ)
đều là overlay gắn trực tiếp lên ward đó (xem gap analysis §1, §5). Không có khái niệm dự án đầu
tư, gói thầu, tiến độ, hay vướng mắc ở bất kỳ đâu trong domain model.

Yêu cầu sản phẩm mới: nền tảng phải phục vụ lãnh đạo tỉnh, ban quản lý dự án, sở/ngành và người
dùng công khai theo dõi **dự án trọng điểm** — tiến độ, giải ngân, gói thầu, vướng mắc. Bản đồ
không còn là mục tiêu chính, chỉ là lớp ngữ cảnh không gian để hiểu dự án nằm ở đâu.

## Quyết định

1. **Project trở thành entity trung tâm** của domain model, ngang hàng về tầm quan trọng với
   `DatasetDescriptor` hiện có (không thay thế nó — hai khái niệm khác nhau: `DatasetDescriptor` mô
   tả _nguồn dữ liệu_, `Project` mô tả _đối tượng nghiệp vụ_).
2. **Ward (`administrativeAreaCodes`) trở thành một thuộc tính/bộ lọc không gian của Project**,
   không phải điểm neo domain. Một Project có thể liên quan 0, 1, hoặc nhiều ward
   (`administrativeAreaCodes: string[]`), và có `geometry` riêng (điểm đại diện hoặc polygon dự án)
   — độc lập với polygon ranh giới ward. Ward-centric view (3D overview, 2D directory) **không bị
   xoá** — nó tiếp tục là một cách xem không gian hợp lệ, chỉ không còn là trang mặc định hay trục
   điều hướng chính.
3. **Executive Overview thay thế bản đồ làm màn hình mặc định.** Bản đồ (2D mặc định, 3D tuỳ chọn)
   trở thành một trong các panel/feature của Project (`project-map`), được mở từ ngữ cảnh dự án
   (drill-down) hoặc từ portfolio filter, không phải điểm vào đầu tiên.
4. **Không xoá/viết lại renderer 3D và MapLibre hiện có.** `components/map/*`,
   `components/detail-map/*`, `stores/mapStore.ts` tiếp tục sở hữu ward/geometry rendering; feature
   `project-map` ở Phase 2 composite thêm một project layer lên trên, tái dùng
   `DetailedMapProvider` abstraction và R3F overlay pattern đã có.
5. **`data-platform/` tiếp tục là nguồn sự thật cho dataset provenance/classification/policy**;
   domain layer mới (`entities/project` hoặc tương đương) là một khách hàng của nó, không phải bản
   sao. `ProjectRepository`/`DatasetRepository` (Phase 3) sẽ dùng `DatasetAdapter<T>` interface đã
   có, không định nghĩa lại cách load dữ liệu.
6. **Validation domain mới theo đúng pattern hiện có**: hand-written TypeScript validator + JSON
   Schema mirror hand-written (đối chiếu bằng test kiểu `schemaDriftGuard.test.ts`), **không** đưa
   AJV hay bất kỳ schema-validation library nào vào production bundle. Lý do: repo đã có tiền lệ
   nhất quán (`catalogValidation.ts`, `datasetManifestIssues`) và `validate:public-build` đã kiểm
   tra `ajv` không lọt vào chunk chính — đi ngược pattern này sẽ vừa phá tính nhất quán vừa cần sửa
   lại toàn bộ leakage-guard logic.

## Vì sao không phải phương án khác

- **Viết lại từ đầu (rewrite)**: bị loại vì `AGENTS.md`/brief đều yêu cầu không viết lại kiến trúc
  đang hoạt động (map renderer, CI leakage guard, data-platform) khi có thể tái sử dụng — xem gap
  analysis §2 cho danh sách phần giữ nguyên.
- **Giữ Ward làm trung tâm, thêm "loại ward = dự án"**: bị loại vì một dự án không phải lúc nào
  cũng trùng ranh giới hành chính (dự án giao thông liên xã, dự án điểm như trạm y tế/trường học);
  ép domain dự án vào shape ward sẽ tạo debt lớn hơn khi cần multi-ward hoặc non-administrative
  geometry.
- **Router ngay lập tức ở Phase 0/1**: cân nhắc nhưng hoãn tới khi routing thực sự vượt 3 view (theo
  đúng ngưỡng spec nêu) — Phase 1 hoàn toàn additive (types/schema/fixture/test), chưa cần route
  mới nào để tồn tại độc lập và test được.
- **TanStack Query ngay từ Phase 1**: hoãn tới Phase 3 — Phase 1 chưa có API thật để fetch, chỉ có
  fixture tĩnh; thêm server-state library trước khi có consumer thật là over-engineering theo đúng
  nguyên tắc "không thêm abstraction chưa có bằng chứng cần thiết" của `AGENTS.md`.

## Hệ quả

- Toàn bộ tài liệu sản phẩm (README, `AGENTS.md`) sẽ cần cập nhật dần ở các phase sau để phản ánh
  "Project là trung tâm" — không sửa ngay trong Phase 0/1 vì UI/behavior thật chưa đổi.
- Status taxonomy mới (Project/Issue/Verification/Confidence) là **độc lập** với
  `PublicationStatus`/`QualityStatus`/`DataAuthority` hiện có trong `data-platform/schemas/dataset.ts`
  — không tái dùng nhầm enum ward-mode cho domain dự án, dù có thể trông giống nhau.
- `mapStore.ts` không được mở rộng để chứa project state — domain UI-state mới cần store/slice
  riêng (xem gap analysis §3.1) để tránh God-object.

### Phase 1 file list (dự kiến, additive-only)

```
src/entities/project/
  types.ts                  # Project, WorkPackage, Milestone, ProjectIssue, ProgressSnapshot,
                             # Agency, Contractor, Evidence, ReferenceDocument, DataQualityIssue,
                             # AuditEvent (mở rộng), status taxonomy enums
  types.test.ts             # (nếu cần compile-time fixture check)
  schema/
    project.schema.json
    workPackage.schema.json
    milestone.schema.json
    issue.schema.json
    progressSnapshot.schema.json
  validation/
    validateProject.ts       # hand-written validator, theo mẫu catalogValidation.ts
    validateProject.test.ts
    dataQualityRules.ts       # 11 rule trong spec
    dataQualityRules.test.ts
    schemaDriftGuard.test.ts  # đối chiếu TS validator vs JSON Schema (Ajv, devDependency only)
  kpi/
    disbursementRate.ts
    scheduleVariance.ts
    progressVariance.ts
    budgetVariance.ts
    forecastDelay.ts
    overdueIssues.ts
    landClearanceRate.ts
    dataFreshness.ts          # tái dùng ý tưởng freshness.ts đã có trong data-platform
    dataCompleteness.ts
    kpi.types.ts               # KpiResult<T> chung: value/unit/status/calculatedAt/sourceDatasetIds/
                                # missingInputs/explanation
    *.test.ts
  fixtures/
    projects.mock.ts          # 8-12 dự án deterministic, đa lĩnh vực, gắn nhãn "DỮ LIỆU MINH HỌA"
    projects.mock.test.ts     # validate toàn bộ fixture qua validateProject + dataQualityRules
  dataQualitySummary.ts       # tổng hợp valid/invalid/stale/missing/duplicate/unmapped/source-availability
  dataQualitySummary.test.ts
config/public-data-files.json  # thêm entry cho fixture mới nếu đóng gói thành file JSON riêng
docs/domain-model.md            # tài liệu hoá entity + status taxonomy (tham chiếu từ AGENTS.md)
```

Không đụng tới `src/components/**`, `src/stores/mapStore.ts`, `src/App.tsx`, hay bất kỳ route/view
hiện có trong Phase 1 — mục tiêu là domain layer biên dịch, tự test được, và không ảnh hưởng tới
`npm run quality`/`check:budget` hiện tại (không thêm gì vào bundle được import từ `main.tsx`).

## Cập nhật — Phase 1.5 (domain hardening, trước Phase 2A)

Trước khi xây UI, 7 điểm kiến trúc còn thiếu trong Phase 1 đã được xử lý — chi tiết đầy đủ trong
[docs/domain-model.md](../domain-model.md#phase-15--domain-hardening):

1. Thay `sourceDatasetId` giả bằng 3 `DatasetDescriptor` thật (`project-portfolio-illustrative`,
   `project-progress-illustrative`, `project-issues-illustrative`) trong
   `data-platform/catalog/datasets.ts`.
2. Thêm `importBoundary.test.ts` xác nhận domain không phụ thuộc GIS asset/component/store/CSS.
3. Tách `PortfolioAssessment` (`validationErrors`/`qualityIssues`/`businessAlerts`) trong
   `portfolioAssessment.ts` — quyết định kiến trúc quan trọng nhất của Phase 1.5: một dự án chậm
   tiến độ là dữ liệu hợp lệ, không phải lỗi dữ liệu.
4. Mọi hàm domain (KPI, `runDataQualityRules`, `summarizeDataQuality`, `assessPortfolio`) nhận
   `asOf: Date` bắt buộc, không còn `new Date()` ngầm.
5. Chuẩn hoá tiền tệ: Phương án A (số nguyên VND, validate finite/integer/non-negative/safe-integer)
   — không tạo `Money` value object cho tới khi có nhu cầu đa tiền tệ thật.
6. Định nghĩa identity (`projectId + observedAt + sourceDatasetId`) và selection rule cho
   `ProgressSnapshot` trong `progressSnapshotSelection.ts`.
7. Mở rộng scenario coverage của 9 fixture project (không tăng số lượng) để phủ đủ: on-track,
   at-risk, delayed, suspended, completed, stale, missing-optional-input, no-geometry, multi-area,
   overdue-critical-issue, no-issue, snapshot-history.

Đồng thời ghi nhận **API contract gate** cho Phase 3 (xem domain-model.md): domain type không được
mặc định trở thành wire contract — cần DTO schema/mapper/contract test riêng trước khi nối
`PublicHttpAdapter`/`ProtectedApiAdapter` thật.

Không có thay đổi nào trong Phase 1.5 chạm tới `src/components/**`, `src/stores/mapStore.ts`, hay
`src/App.tsx` — vẫn hoàn toàn additive, giữ đúng quyết định ban đầu của ADR này.
