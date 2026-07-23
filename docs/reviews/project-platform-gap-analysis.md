# Gap analysis — từ "Dashboard bản đồ 3D" sang "Nền tảng điều hành dự án trọng điểm"

Phase 0 của việc chuyển đổi sản phẩm sang mô hình project-centric. Tài liệu này mô tả kiến trúc
thật hiện có (không suy đoán — mọi khẳng định dưới đây bắt nguồn từ việc đọc trực tiếp mã nguồn),
phần có thể tái sử dụng, nợ kỹ thuật, và các khoảng trống theo từng trục UX/domain/security/data.
ADR đi kèm: [0001-project-centric-domain.md](../adr/0001-project-centric-domain.md).

## 1. Kiến trúc hiện tại (đã xác minh)

- **Runtime**: React 19 + TypeScript strict + Vite 8. Không có router — `App.tsx` chọn giữa 3 trải
  nghiệm loại trừ lẫn nhau (`viewMode: '3d' | 'table' | 'map'`) và đồng bộ vào query string qua
  `src/utils/dashboardUrl.ts` (`?view=&mode=&ward=`) + `useDashboardUrlSync`. Không dùng
  History API ngoài push/replace thủ công theo quy tắc "chỉ push khi đổi view/mode, không push khi
  chỉ đổi selection" (`decideDashboardHistoryAction`).
- **State**: một Zustand store toàn cục duy nhất (`src/stores/mapStore.ts`, factory
  `createMapStore`) trộn lẫn: UI/interaction state (`hoveredCode`, `autoRotate`,
  `provenancePanelOpen`), URL-derived state (`viewMode`, `dataMode`, `selectedCode`), và
  detail-map-specific state (`detailMapLayers`, `detailMapCamera`). Không có khái niệm server-state
  / cache riêng — toàn bộ dữ liệu hiện tại là **artifact tĩnh import lúc build** (JSON/GeoJSON
  trong `src/assets/`), không có vòng đời fetch/loading/stale nào ở cấp ứng dụng.
- **3D map**: React Three Fiber, terrain displacement từ SRTM, polygon hit-test (`geometryHitTest.ts`),
  tách theo trách nhiệm: terrain surface, overlays, annotations, camera, lifecycle (context-loss).
- **2D accessible**: `AdministrativeMap2D` + `AccessibleDirectory` — bảng 102 xã/phường, tìm kiếm
  không dấu, điều hướng bàn phím, giữ selection đồng bộ với 3D qua store chung.
- **Detail map**: MapLibre GL JS + PMTiles, tách qua `DetailedMapProvider` abstraction
  (`detailMapTypes.ts`) để store/business logic không phụ thuộc trực tiếp `maplibre-gl` — đã có
  layer panel, đo khoảng cách, tìm kiếm local, xử lý lỗi/fallback, lazy chunk riêng.
- **Data platform** (`src/data-platform/`, đã tồn tại, khá trưởng thành): `schemas/` định nghĩa
  `DatasetDescriptor`, `DataAccessPolicy`, `UserContext`, `AuditEvent`; `catalog/` chứa
  `DATASET_CATALOG`/`INDICATOR_DEFINITIONS`/`LAYER_REGISTRY`/`DOCUMENT_REFERENCES` bọc quanh JSON
  provenance có sẵn; `adapters/` có 4 adapter (`BundledStaticAdapter`, `PublicHttpAdapter`,
  `ProtectedApiAdapter`, `PmtilesSourceAdapter`) theo interface `DatasetAdapter<T>` thống nhất
  (`load()` trả `DataLoadResult<T>` dạng `ok | degraded | error`, `validate()` trả
  `ValidationResult<T>`); `policies/` có `canViewDataset/canExportDataset/canCacheDataset` — UX
  guard rõ ràng, tài liệu hoá minh bạch rằng đây **không phải** security boundary thật.
- **Validation**: không dùng AJV runtime trong production bundle. Pattern chuẩn của repo là
  **hand-written TypeScript validator** (`validateCatalog`, `datasetManifestIssues`) chạy dưới
  `npm test`, cộng với JSON Schema hand-written song song (`data-templates/schemas/*.schema.json`)
  chỉ dùng để chạy AJV **trong test** (`schemaDriftGuard.test.ts`) nhằm phát hiện lệch pha giữa hai
  bản mô tả — AJV là devDependency, không lọt vào bundle public (`validate:public-build` xác minh
  điều này).
- **Public/leakage boundary**: hai lớp độc lập — `catalogValidation.ts` (npm test) và
  `scripts/validate_public_build.mjs` (source-scan + dist-scan), dựa trên registry exact-path
  (`config/public-data-files.json`), không phải prefix allowlist. Đây là cơ chế production-grade
  thật, đã từng vá lỗ hổng prefix-allowlist trước đó (xem commit `27f6acf`).
- **CI** (`quality.yml`): 5 job — `static-analysis` (lint/format/typecheck/manifest/leakage-source),
  `unit-and-data` (vitest + GIS Python validate), `build-and-budget` (build/leakage-dist/budget/
  metrics), `e2e` (Playwright chromium+webkit trên **production build thật**, không phải dev
  server), `security` (npm audit + secret scan). Không có job deploy riêng cho một "secure" profile
  — chỉ một `deploy-pages.yml` cho public.
- **Domain hiện tại**: đơn vị nghiệp vụ duy nhất là **Ward** (xã/phường, 102 đơn vị, geometry +
  metadata tĩnh) và các "data mode" theo chủ đề (`overview | energy | heatmap`) là overlay minh
  hoạ gắn trên ward. **Không có khái niệm Project/WorkPackage/Milestone/Issue/Contractor/Agency ở
  bất kỳ đâu trong domain model, store, hay UI.**

## 2. Phần có thể tái sử dụng (không viết lại)

| Thành phần                                                                     | Lý do giữ nguyên                                                                                                                                                                                             |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `data-platform/schemas`, `catalog`, `adapters`, `policies`, `validation`       | Đúng là nền móng cần cho Project/Dataset/Policy layer — chỉ cần **mở rộng**, không thay thế. Adapter interface (`DatasetAdapter<T>`, `DataLoadResult`) đã đúng shape cho repository layer sẽ thêm ở Phase 3. |
| Pattern hand-written validator + JSON Schema mirror + drift-guard test         | Nhất quán, không thêm AJV runtime — nên tiếp tục dùng cho domain schema mới thay vì đổi sang Zod/AJV runtime.                                                                                                |
| `DetailedMapProvider` abstraction, lazy-loading chunk cho map/provenance panel | Đúng pattern cần cho "project map layer" — chỉ thêm layer/source mới, không đổi kiến trúc provider.                                                                                                          |
| Zustand cho UI/interaction state                                               | Giữ đúng theo yêu cầu — chỉ thêm slice mới cho project selection/filter UI state, không nhét business data vào đây.                                                                                          |
| Query-string sync (`dashboardUrl.ts`) + `decideDashboardHistoryAction`         | Ý tưởng "chỉ push khi đổi view có ý nghĩa điều hướng" vẫn đúng khi có router thật — cần port logic, không cần thiết kế lại từ đầu.                                                                           |
| CI 5-job + leakage guard 2 lớp + secret scan                                   | Không đụng vào — mọi domain/API work mới phải **đi qua** các gate này, không bypass.                                                                                                                         |
| 2D accessible directory + a11y test hiện có (axe, keyboard, reduced-motion)    | Base tốt để mở rộng thành "accessible project table".                                                                                                                                                        |

## 3. Technical debt

1. **Store God-object**: `mapStore.ts` sẽ phình to nếu nhét thêm project/issue/filter state vào
   cùng store UI hiện tại. Cần tách slice hoặc store riêng cho domain UI-state (selected project,
   open panel, filter) — vẫn Zustand, nhưng không phải cùng một `MapState` monolith.
2. **Không có server-state layer**: mọi dữ liệu hiện là static import — không có khái niệm
   loading/error/stale ở cấp UI vì chưa từng cần. Thêm Project domain (fetch thật hoặc mock JSON
   lớn hơn nhiều so với 102 ward) sẽ cần TanStack Query hoặc tương đương — hiện chưa có.
3. **Không có router**: 3-way `viewMode` switch không scale sang `/projects/:id/packages/:id`.
   Bản thân file `dashboardUrl.ts` hard-code đúng 3 view — thêm route thứ 4+ theo kiểu cũ sẽ tiếp
   tục phình switch-case thay vì path params thật.
4. **`datasetManifestIssues`/`catalogValidationIssues` là module-level side effect** (đánh giá lúc
   import) — pattern này ổn với dữ liệu tĩnh 102 ward, nhưng không phù hợp nếu domain data đến từ
   fixture lớn hơn nhiều (8-12 dự án × work package × milestone × issue × progress snapshot) — cần
   cân nhắc lazy-validate thay vì eager tại import time để tránh chậm cold start.
5. **`AuditEvent`/`UserContext` hiện là "interface rỗng"**: đúng như doc tự nhận
   (`docs/security-architecture.md`), chưa có implementation thật nào emit audit event — Phase 4 cần
   mở rộng shape (yêu cầu domain mới thêm `actorAgencyId`, `projectId`, `purpose`, `note`...) mà
   không phá vỡ contract cũ.
6. **`config/public-data-files.json` exact-path registry** sẽ cần một lượng entry lớn hơn đáng kể
   khi thêm 8-12 project fixture × nhiều loại record — cần script/test kiểm tra registry không bị
   quên khi thêm domain fixture mới (rủi ro con người, không phải rủi ro kiến trúc).

## 4. UX gaps

- Không có màn hình "Executive overview" — màn hình mặc định hiện tại **là** bản đồ (3D), đúng cái
  brief yêu cầu tránh ("Màn hình mặc định không được chỉ là bản đồ").
- Không có global search — `LocalSearch` trong detail map chỉ tìm theo local dataset của MapLibre;
  `search.ts`/`AccessibleDirectory` chỉ tìm ward theo tên/mã, không có khái niệm project/gói
  thầu/nhà thầu/issue.
- Không có breadcrumb/drill-down Portfolio → Project → Work package → Milestone → Issue → Evidence
  — toàn bộ điều hướng hiện tại phẳng (3 view ngang hàng), không có khái niệm entity con.
- Không có KPI card, progress chart, alert list ở bất kỳ đâu — `StatPanel`/`DetailPanel` hiện chỉ
  hiển thị số liệu ward-level minh hoạ (dân số, tăng trưởng...), không phải KPI dự án.
- Mobile: `MobileDashboardSheet` tồn tại cho ward selection, chưa có khái niệm tương đương cho
  project list/detail.

## 5. Domain gaps

Toàn bộ entity yêu cầu trong spec (Project, WorkPackage, Milestone, ProjectIssue, ProgressSnapshot,
Agency, Contractor, Evidence, ReferenceDocument, Dataset\* mở rộng, DataQualityIssue, AuditEvent mở
rộng) **chưa tồn tại**. Gần nhất hiện có là `DocumentReference` (đã có `legalStatus`,
`evidenceLevel`, `verificationStatus` — có thể tái dùng ý tưởng cho `Evidence`/`ReferenceDocument`
thay vì thiết kế lại) và `DatasetDescriptor` (đã có `classification`/`authority`/`quality` — mẫu tốt
cho `DataQualityIssue`/`Dataset` mở rộng). Status taxonomy hiện tại (`dataMode`,
`PublicationStatus`, `QualityStatus`) không bao phủ Project/Issue/Verification status theo spec —
cần enum mới, không tái dùng nhầm enum ward-mode.

## 6. Security gaps

- Không có bất kỳ authentication/authorization code nào — đúng như kỳ vọng cho public static site,
  nhưng cũng có nghĩa **không có gì để mở rộng thành role-based navigation** — permission API
  (`canViewProject`, `canEditProgress`...) phải viết mới, theo đúng pattern
  `canViewDataset`(UX-only, không phải security boundary) đã có.
- Chưa có BFF/API gateway, chưa có OIDC/session cookie design cụ thể — `deployment-profiles.md` đã
  nêu đúng danh sách việc cần làm cho secure profile nhưng chưa có ADR chọn công nghệ cụ thể
  (OIDC provider nào, session hay token, vị trí BFF).
- `AuditEvent` hiện chỉ có 4 field, thiếu toàn bộ field spec yêu cầu (actorId, resourceType,
  resourceId, result, purpose, note...).
- Chưa có thiết kế tách **build graph** public/secure (chỉ có 1 Vite config, 1 CI pipeline, 1 deploy
  workflow) — đúng như `deployment-profiles.md` tự nhận "secure chỉ là target shape, chưa build".

## 7. Data gaps

- Không có dữ liệu dự án nào, thật hay mock. Cần bộ fixture mock deterministic 8-12 dự án đa lĩnh
  vực theo đúng yêu cầu spec — hiện tại repo chỉ có dữ liệu ward + 3 data-mode overlay (energy 5
  điểm, heatmap 20 điểm) là ví dụ minh hoạ tốt để theo mẫu (badge "DỮ LIỆU MINH HỌA", seed cố định).
- Không có KPI utility nào (disbursement rate, schedule/progress/budget variance...) — cần viết mới
  hoàn toàn, kèm rule "trả `unavailable` thay vì 0 khi thiếu input" — pattern gần nhất tương tự là
  `freshness.ts` (`computeFreshness`) đã có khái niệm "trạng thái tính toán từ dữ liệu, không phải
  số cứng" — nên học theo cấu trúc hàm đó.
- Không có Data Quality rule engine cho domain mới (11 rule liệt kê trong spec) — Python
  `validate_daklak_data.py` + TS `catalogValidation.ts` là 2 tiền lệ tốt về "cùng logic, hai runtime
  khác nhau, có test đối chiếu" nhưng chưa có bản tương đương cho Project domain.

## 8. Rủi ro

| Rủi ro                                                                                                                   | Mức độ                                                       | Giảm thiểu                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Big-bang rewrite phá vỡ 3 trải nghiệm map hiện có (đang xanh, có E2E/visual regression)                                  | Cao nếu làm sai                                              | Domain foundation (Phase 1) hoàn toàn additive — không sửa file map/store hiện có.                                                                                             |
| Store phình to, trộn domain state vào `mapStore`                                                                         | Trung bình                                                   | Tạo store/slice riêng ngay từ Phase 1 cho project UI-state, không tái dùng `MapState`.                                                                                         |
| Registry/leakage guard bị quên khi thêm fixture domain mới → lộ dữ liệu "protected" mock ra public bundle dù chỉ là mock | Trung bình                                                   | Toàn bộ fixture Phase 1 phải khai báo `classification` rõ ràng và tuân thủ registry pattern hiện có; không tạo dataset "confidential" thật cho tới khi có secure profile thật. |
| Kỳ vọng quá lớn trong 1 phase (spec yêu cầu ~20 tiêu chí nghiệm thu, nhiều phase)                                        | Cao nếu ép làm 1 lần                                         | Tuân thủ đúng phân kỳ Phase 0-4 của spec; không tự ý gộp phase.                                                                                                                |
| AJV/Zod runtime bị thêm nhầm vào production bundle khi viết domain schema mới                                            | Thấp nhưng đã có tiền lệ lỗi loại này ở nơi khác trong ngành | Tiếp tục pattern hand-written validator + JSON Schema mirror, `validate:public-build` sẽ tiếp tục kiểm tra `ajv` không lọt vào chunk chính.                                    |

## 9. Kiến trúc mục tiêu (đề xuất)

```
src/
  app/                      # composition root — thay dần App.tsx hiện tại, thêm router thật khi
                             # routing vượt quá 3 view (đúng ngưỡng spec đặt ra)
  entities/
    project/                # domain types, schema, validation, KPI utils cho Project + sub-entities
    dataset/                # (tái cấu trúc dần từ data-platform/schemas+catalog, không xoá ngay)
  features/
    executive-overview/
    project-portfolio/
    project-detail/
    project-map/
    progress-tracking/
    issue-management/
    disbursement/
    land-clearance/
    reporting/
    data-quality/
    provenance/             # DataProvenancePanel hiện tại di chuyển vào đây khi tới lượt
  shared/                   # utils dùng chung (search, formatting, a11y helpers)
data-platform/               # giữ nguyên vị trí + API trong giai đoạn transition; entities/dataset
                             # sẽ dần re-export từ đây thay vì fork, tránh phá `docs/data-platform-architecture.md`
```

Không di chuyển `components/map`, `components/detail-map`, `stores/mapStore.ts` trong Phase 1 —
chúng tiếp tục phục vụ ward/geometry concern hiện có; `features/project-map` ở Phase 2 sẽ **dùng**
chúng qua composition (thêm project layer lên trên MapLibre/R3F sẵn có), không viết lại renderer.

## 10. Kế hoạch di trú theo phase (tham chiếu spec)

- **Phase 0** (tài liệu này + ADR 0001): xong khi PR này merge.
- **Phase 1 — Domain foundation**: types/schema/fixture/validation/KPI/test cho Project* entities,
  hoàn toàn additive dưới `src/entities/project/` (hoặc tương đương), không đổi UI/route nào.
- **Phase 2 — Product UX**: executive overview, project portfolio/detail, global search, project map
  layer (composition lên trên map hiện có), accessible project directory.
- **Phase 3 — API readiness**: repository/service layer, DTO mapper, mock OpenAPI contract,
  server-state layer (TanStack Query — cần đo bundle impact trước khi chốt), typed error/degraded
  state.
- **Phase 4 — Secure readiness**: permission model, secure deployment ADR, protected dataset/audit
  contract, leakage test mở rộng — không dựng auth thật khi chưa có identity provider.

Danh sách file dự kiến cho Phase 1 nằm trong ADR 0001, mục "Hệ quả — Phase 1 file list", để tránh
trùng lặp giữa hai tài liệu.
