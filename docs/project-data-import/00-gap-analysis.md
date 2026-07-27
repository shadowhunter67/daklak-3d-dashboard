# Gap analysis — nhập dữ liệu dự án nội bộ thật (Phase 1)

Trạng thái: **đề xuất, chưa triển khai**. Tài liệu này là sản phẩm của Phase 1 (assessment and
design) theo yêu cầu "biến repo thành production-shaped demo, sẵn sàng tiếp nhận dữ liệu thật qua
importer/adapter". Không có production code nào bị sửa để tạo tài liệu này.

## 0. Phát hiện quan trọng nhất: phần lớn hạ tầng cần thiết đã tồn tại

Trước khi liệt kê gap, phải ghi nhận rõ: repo **không** ở trạng thái "chưa có gì". Ba hệ thống đã có
sẵn và **phải tái sử dụng, không viết lại**:

1. **`src/data-platform/`** (docs/data-platform-architecture.md) — catalog dataset, 4-tier
   classification (`public`/`internal`/`confidential`/`restricted`), leakage guard 2 lớp
   (`catalogValidation.ts` + `scripts/validate_public_build.mjs`), pattern "JSON Schema tay +
   Ajv drift-guard test" (`data-templates/schemas/*.schema.json` ↔ `schemaDriftGuard.test.ts`),
   adapter contract 4 loại (`BundledStaticAdapter`/`PublicHttpAdapter`/`ProtectedApiAdapter`/
   `PmtilesSourceAdapter`). Đây là **khuôn mẫu bắt buộc phải theo** cho canonical schema + importer
   ở phase sau, không phải phát minh quy trình mới.
2. **`src/entities/project/`** (docs/domain-model.md, ADR 0001, "Phase 1.5" đã hoàn thành) — domain
   Project đã có: types đầy đủ, validation record-level (`validateProject.ts`), quality rule
   liên-record (`dataQualityRules.ts`), 9 KPI (`kpi/index.ts`), tách 3 nhóm kết quả
   (`portfolioAssessment.ts`: validationErrors/qualityIssues/businessAlerts), chọn authoritative
   progress snapshot (`progressSnapshotSelection.ts`), `asOf` tường minh khắp nơi, không dùng 0 thay
   thiếu dữ liệu, VND = integer (quyết định "Phương án A", ghi trong domain-model.md — **không** đổi
   sang `Money` value object trừ khi có nhu cầu đa tiền tệ thật).
3. **`src/entities/project/adapters/ProjectPortfolioSource.ts`** — data-access boundary **đã tồn
   tại**, gần như đúng hình dạng được yêu cầu (`loadPortfolio(signal?)` thay vì `load()`, trả
   `ProjectPortfolioLoadResult` tagged union `ok`/`degraded`/`error` thay vì ném exception — tốt hơn
   interface đề xuất trong yêu cầu vì đã phân biệt degraded/error). `BundledProjectPortfolioSource`
   là implementation duy nhất hiện tại.
4. **`docs/domain-model.md` đã tự ghi một "Phase 3 — API contract gate"** (dòng 179–196) mô tả gần
   như chính xác nhiệm vụ hiện tại: "trước khi có nguồn dữ liệu khác ngoài bundled fixture, bắt buộc
   phải có (1) JSON Schema có version, (2) mapper DTO→domain tường minh, (3) contract test". Yêu cầu
   hiện tại **kích hoạt đúng phase này**, mở rộng thêm cho ingest offline (không chỉ live API).

Hệ quả thiết kế: phần lớn công sức Phase 2-4 là **nối dây** (wiring) và **mở rộng field** theo pattern
đã có, không phải xây mới từ số 0.

## 1. Đã có sẵn — tái sử dụng nguyên vẹn

| Hạng mục yêu cầu                                              | Đã có tại                                                                                                                               | Ghi chú                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phân tách validation error / quality warning / business alert | `portfolioAssessment.ts` (`assessPortfolio()`)                                                                                          | Đúng 3 nhóm yêu cầu, đã test                                                                                                                                                                                                                                                 |
| `asOf` tường minh, không `Date.now()` ngầm                    | Toàn bộ `kpi/index.ts`, `dataQualityRules.ts`, `assessPortfolio()`                                                                      | Bất biến đã enforce bằng test                                                                                                                                                                                                                                                |
| Không dùng 0 thay thiếu dữ liệu                               | `KpiResult.status: 'unavailable'`, `value: null`                                                                                        | —                                                                                                                                                                                                                                                                            |
| VND = số nguyên                                               | `isValidVndAmount()` trong `validateProject.ts` (hiện **chưa export**)                                                                  | Cần export để importer tái dùng, không viết lại                                                                                                                                                                                                                              |
| Chọn progress snapshot authoritative                          | `progressSnapshotSelection.ts` (`selectAuthoritativeSnapshot`, ưu tiên approved > reviewed > submitted > validated-automatically > raw) | Đã test đầy đủ                                                                                                                                                                                                                                                               |
| Data classification 4 tier + leakage guard                    | `src/data-platform/` (schemas/dataset.ts, validation/catalogValidation.ts, `scripts/validate_public_build.mjs`)                         | Nguyên tắc bất biến: `bundled-static` ⇒ `classification: 'public'`                                                                                                                                                                                                           |
| Pattern JSON Schema ↔ TS type + drift guard                   | `data-templates/schemas/*.schema.json` + `schemaDriftGuard.test.ts` + `data-templates/fixtures/{valid,invalid}/`                        | Sao chép pattern này cho project domain, không tạo cơ chế khác                                                                                                                                                                                                               |
| Deployment profile "public" đã build thật                     | `.github/workflows/deploy-pages.yml`, `docs/deployment-profiles.md`                                                                     | "secure" mới chỉ là tài liệu/interface, chưa build                                                                                                                                                                                                                           |
| Import boundary test (kiến trúc)                              | `src/entities/project/importBoundary.test.ts`                                                                                           | Convention bắt buộc áp dụng cho code importer mới nếu thêm layer                                                                                                                                                                                                             |
| Fake adapter cho test                                         | `FakeProjectPortfolioSource.ts`, `FakeMapProvider.ts`                                                                                   | Giữ nguyên convention khi thêm `GeneratedJsonProjectPortfolioSource`                                                                                                                                                                                                         |
| Pipeline nhiều giai đoạn có gate + report + checksum xác định | `scripts/data-refresh/*.mjs` (registry→adapter→compliance→privacy→diff-risk→auto-merge→manifest→report)                                 | Không dùng trực tiếp (mục đích khác — public data ingestion cho `InvestmentOpportunity`), nhưng **kiến trúc staged-pipeline-with-reports** là mẫu tốt để mô phỏng cho importer CSV/JSON nội bộ. `checksum.mjs` (SHA-256 trên JSON serialize ổn định) nên tái dùng trực tiếp. |

## 2. Cố tình khác mục đích — không dùng nhầm

| Hệ thống                                                         | Vì sao KHÔNG áp dụng cho yêu cầu này                                                                                                                                                                                                                                                                 |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ADR 0004 + `data/source-registry.yml` + `scripts/data-refresh/*` | Thiết kế cho **public/open web data** (robots.txt, terms, redistribution policy, compliance hard-stop) nạp vào `InvestmentOpportunity`. Không có khái niệm "file CSV/JSON nội bộ do người dùng cung cấp qua CLI". Registry schema có field `sourceUrls`/`robotsCheckedAt` vô nghĩa với input nội bộ. |
| `InvestmentOpportunity` domain                                   | Tách biệt hoàn toàn với `Project` theo quyết định ADR 0004 §1 (bảng so sánh) — không có budget/disbursement/progress, là dữ liệu tiền-vận-hành. Yêu cầu hiện tại nói về `Project`/`WorkPackage`/... — không đụng tới `InvestmentOpportunity`.                                                        |
| `docs/deployment-profiles.md` "secure"                           | Ngụ ý có **auth/backend thật trong tương lai** (BFF, identity provider, audit emitter). "internal-static" trong yêu cầu hiện tại là **static, không auth, triển khai trong mạng có kiểm soát** — khác trục với "secure". Xem mục 5 (đặt tên) bên dưới về rủi ro nhầm lẫn thuật ngữ.                  |

## 3. Gap thật — phải xây

### 3.1 Canonical schema & templates cho project domain

- **Không có JSON Schema nào** cho `Project`/`WorkPackage`/`Milestone`/`ProjectIssue`/
  `ProgressSnapshot`/`Agency`/`Contractor`/`Evidence`/`ReferenceDocument`/`ProjectAuditEvent`.
  `data-templates/schemas/` hiện chỉ có `dataset-descriptor`, `asset-feature`, `indicator` (thuộc
  data-platform, không phải project domain).
- **Không có CSV/JSON template, ví dụ, dictionary** cho 10 dataset yêu cầu.
- **Thiếu field provenance ở nhiều entity**: `WorkPackage` và `Milestone` hiện **không có bất kỳ**
  trường `sourceDatasetId`/`sourceRecordId`/`observedAt`/`verificationStatus`/`confidence`/
  `dataOwner` nào (khác với `Project`/`ProgressSnapshot`/`ProjectIssue` đã có một phần). `Agency`/
  `Contractor`/`ReferenceDocument` cũng không có các field này. `Evidence` chỉ có
  `sourceDatasetId?` (optional). Đây là thay đổi type **additive** (thêm optional field), không phá
  vỡ fixture/test hiện tại, nhưng phải làm trước khi có canonical schema đầy đủ theo yêu cầu.
- **`schemaVersion`/`bundleVersion`**: chưa có khái niệm nào ở cấp project-domain (data-platform có
  `DatasetDescriptor.version` nhưng đó là version của _dataset_, không phải version của _wire
  format/bundle_).

### 3.2 Geometry model — thiếu ở mức type, không chỉ ở mức fixture

- `ProjectGeometry = ProjectPointGeometry | ProjectPolygonGeometry` — **không có LineString**. "Dự
  án tuyến" (route project) theo yêu cầu **không biểu diễn được** ở mức type hiện tại, đây là gap
  cấu trúc thật, không phải thiếu dữ liệu mẫu.
- Không có `geometrySource`, `geometryConfidence`, `geometryApproximate`, hay disclaimer
  "approximate geometry không phải ranh giới pháp lý chính thức" ở mức type.

### 3.3 Importer CLI

- **Không tồn tại** dưới bất kỳ hình thức nào cho project domain. Không có script `import:data`,
  không có CSV parser, không có `generated-data/` output convention.
- Không có cơ chế "last-known-good protection" cho bundle project-portfolio (khác với
  data-refresh pipeline vốn có compliance/risk gate riêng cho mục đích khác).

### 3.4 Data-access boundary — cần thêm implementation + metadata, không cần thêm interface mới

- `GeneratedJsonProjectPortfolioSource` chưa tồn tại.
- `HttpProjectPortfolioSourceContract` — phần lớn nền móng đã có (`ProjectDataError`,
  `ProjectPortfolioLoadResult`), nhưng **chưa có tài liệu hoá rõ ràng dưới tên gọi này** và chưa nối
  với pattern `PublicHttpAdapter`/`ProtectedApiAdapter` của data-platform.
- **Không có khái niệm "metadata của bundle"** (asOf, importedAt, bundleVersion, checksum,
  sourceKind) tách biệt khỏi `ProjectPortfolioProvenance` hiện tại (4 mốc thời gian) — cần mở rộng,
  xem 01-target-architecture.md.
- **Composition root chưa tập trung**: 3 view (`ExecutiveOverview`, `ProjectPortfolioView`,
  `ProjectDetailView`) mỗi cái tự `new BundledProjectPortfolioSource()` độc lập (qua optional prop
  injection cho test). Yêu cầu "việc chọn source phải tập trung" chưa được đáp ứng.

### 3.5 Deployment profiles

- Chỉ có 2 khái niệm hiện hữu (`public` build thật, `secure` tài liệu-only) áp dụng cho
  **data-platform generic dataset**, không có khái niệm áp dụng riêng cho **nguồn project-portfolio**
  (demo dùng fixture vs internal-static dùng generated JSON).
- Không có build script/env-var switch nào chọn `ProjectPortfolioSource` implementation theo profile.
- Không có cơ chế đảm bảo build "internal-static" **không** kéo theo 839 dòng
  `illustrativeProjectPortfolio.ts` vào bundle.

### 3.6 Demo scenario coverage

Đối chiếu 22 scenario yêu cầu với 9 dự án minh hoạ hiện tại (`illustrativeProjectPortfolio.ts`):

| Scenario                                                 | Trạng thái                                                                                                                          |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| on-track, at-risk, delayed, suspended, completed         | ✅ Có                                                                                                                               |
| missing progress (optional KPI input thiếu)              | ✅ Có (prj-002/007)                                                                                                                 |
| stale data                                               | ✅ Có (prj-007, cố tình > 90 ngày)                                                                                                  |
| low confidence                                           | ✅ Có (`confidence: 'low'`)                                                                                                         |
| multiple administrative areas                            | ✅ Có (prj-001)                                                                                                                     |
| overdue critical issue                                   | ✅ Có (prj-005)                                                                                                                     |
| adjusted budget                                          | ✅ Có                                                                                                                               |
| revised completion date                                  | ✅ Có                                                                                                                               |
| point project                                            | ✅ Có (mặc định)                                                                                                                    |
| project without detailed geometry                        | ✅ Có (prj-009)                                                                                                                     |
| missing optional fields                                  | ✅ Có                                                                                                                               |
| progress snapshot history nhiều điểm                     | ✅ Có (prj-001)                                                                                                                     |
| unverified record (`verificationStatus: 'raw'`)          | ❌ Thiếu — mọi record hiện tại là `reviewed`/`submitted`                                                                            |
| low confidence dạng `'unknown'`                          | ❌ Thiếu — chỉ có `'low'`/`'medium'`/`'high'`                                                                                       |
| multiple verification stages (cùng observation)          | ⚠️ Rule đã code, **chưa có fixture nào minh hoạ** — chỉ test synthetic                                                              |
| conflicting progress sources                             | ❌ Thiếu hoàn toàn                                                                                                                  |
| high disbursement, low physical progress                 | ❌ Thiếu (có case ngược: low/low)                                                                                                   |
| low disbursement (case riêng, tách khỏi budget-exposure) | ⚠️ Trùng lặp với case hiện có, chưa rõ ràng                                                                                         |
| budget exposure (>15pp)                                  | ⚠️ Alert tồn tại trong code, chưa xác định chắc chắn project nào minh hoạ nó tường minh                                             |
| route/line project                                       | ❌ **Không thể biểu diễn** — thiếu ở type (mục 3.2)                                                                                 |
| approximate geometry / geometry confidence/source        | ❌ Thiếu ở type                                                                                                                     |
| invalid fixture riêng cho test (tách khỏi demo bundle)   | ❌ Không tồn tại — test hiện dựng record invalid inline, không có file fixture invalid riêng như `data-templates/fixtures/invalid/` |

Kết luận: cần **scenario factory** (không thêm 20 project viết tay) để phủ ~10 scenario còn thiếu,
cộng thêm 2 thay đổi type (LineString, geometry metadata) trước khi factory có thể sinh route-project.

### 3.7 Data readiness UI

`DataHealthPanel.tsx` đã hiển thị: validProjects/invalidProjects/staleProjectCount/
duplicateRecordCount/unmappedAdministrativeCodeCount/sourceAvailable/confidence breakdown/
effectiveAt-sourcePublishedAt-retrievedAt.

**Thiếu**: `asOf` như một field riêng biệt (khác 4 mốc provenance hiện có), khái niệm
"lần import gần nhất"/"bundle version" (không tồn tại vì chưa có importer), tỷ lệ completeness/
verification (mới có số đếm thô, chưa có %), "nguồn nào đang dùng cho KPI" (không có gắn nhãn
per-KPI-source), link tới validation report (không có report nào tồn tại để link).

### 3.8 Project detail provenance UI

`ProjectDetailView.tsx` đã hiển thị: confidence, dataUpdatedAt, 4 mốc thời gian provenance, dataset
card (quality/version/limitations), progress sparkline, work package/milestone/issue theo nhóm,
geometry/"không có geometry", attention reasons (business alert).

**Thiếu**: `verificationStatus` (không render), `sourceRecordId`, `dataOwner` (có trong type
`Project` nhưng không hiển thị ở UI), nhãn "freshness" tường minh (chỉ có timestamp thô),
missing-inputs-per-KPI (KPI hiện chỉ hiện giá trị/unavailable, không giải thích thiếu input gì),
giải thích "vì sao chọn snapshot này" + danh sách snapshot bị loại, mục quality issues riêng cho dự
án (khác attention reasons vốn là business alert), `ReferenceDocument`/`Evidence` (tồn tại ở type
nhưng không có UI nào render).

## 4. Rủi ro đặt tên cần quyết định sớm (Phase 2)

Yêu cầu dùng "internal-static"/"public-static" nhưng repo đã có "public"/"secure" (một trục khác:
auth, không phải nguồn project-portfolio). Nếu không làm rõ ngay từ đầu Phase 2, hai bộ thuật ngữ sẽ
chồng chéo trong tài liệu. Đề xuất (xem 04-deployment-profiles-design.md): coi "demo/internal-static/
public-static" là một **trục lựa chọn nguồn dữ liệu project-portfolio**, độc lập với trục
"public/secure" (auth) đã có — một build có thể đồng thời là "public" (theo nghĩa data-platform,
không auth) và "internal-static" (theo nghĩa project-portfolio, dùng generated JSON thay vì
fixture) cùng lúc.

## 5. Bất biến bắt buộc giữ nguyên khi thiết kế Phase 2-6

1. `bundled-static` ⇒ `classification: 'public'` (leakage guard hiện có) — importer/profile mới
   không được tạo đường tắt vòng qua invariant này.
2. Domain type (`src/entities/project/types.ts`) không tự động là wire contract — mọi thay đổi phải
   additive (thêm optional field), không đổi field bắt buộc hiện có, không đổi tên field.
3. `Money`/đa tiền tệ: **không** làm trước khi có nhu cầu thật (quyết định đã ghi trong
   domain-model.md) — canonical schema VND vẫn là `integer`.
4. Validation/quality-rule logic **chỉ tồn tại một nơi** (`validateProject.ts`, `dataQualityRules.ts`,
   `progressSnapshotSelection.ts`) — importer gọi lại, không viết song song bản sao.
5. `illustrativeProjectPortfolio.ts` không bị xoá hay thay thế — vẫn là nguồn cho profile `demo`.
6. Không thêm dependency production mới cho importer (theo tiền lệ `ajv`/`ajv-formats` chỉ là
   devDependency, không reachable từ `src/main.tsx`) — importer chạy ngoài `src/`, qua Node script
   độc lập giống `scripts/data-refresh/*.mjs`.
7. Test hiện có (715 Vitest + E2E + validate:data) không được sửa để "cho qua" — chỉ được thêm test
   mới.

## 6. Baseline đã xác nhận (chạy thật, không suy đoán)

Chạy trên `main` tại commit `c0585f8` (2026-07-27, sau khi merge PR #39/#52/#53 trong phiên làm việc
trước đó của session này):

```
npm run typecheck   → 0 lỗi
npm run test        → 87 test file, 715 test, tất cả pass
python scripts/validate_daklak_data.py → status: passed, invalidGeometries: 0, errors: [], warnings: []
```

`npm run quality` đầy đủ (lint/format/build/budget/Playwright desktop+mobile+webkit) đã xanh trên
CI cho đúng commit này qua PR #39 và #53 trong cùng phiên làm việc — không chạy lại toàn bộ cục bộ ở
bước này để tránh tải nặng máy (đã từng gây lag khi chạy song song nhiều lần trong phiên này); sẽ
chạy lại `npm run quality` đầy đủ trước khi merge bất kỳ code thật nào ở Phase 2 trở đi.
