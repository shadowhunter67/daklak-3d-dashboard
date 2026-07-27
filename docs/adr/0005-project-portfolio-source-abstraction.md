# ADR 0005 — Project portfolio source abstraction và static data mode

- Status: accepted
- Date: 2026-07-27
- Liên quan: [docs/project-data-import/](../project-data-import/) (Phase 1 assessment, Phase 2
  implementation), [ADR 0001](0001-project-centric-domain.md), [docs/deployment-profiles.md](../deployment-profiles.md)

## Bối cảnh

Toàn bộ dữ liệu `Project`/`WorkPackage`/`Milestone`/... trước Phase 2 chỉ có một nguồn:
`BundledProjectPortfolioSource`, bọc trực tiếp fixture viết tay
`illustrativeProjectPortfolio.ts`. Ba view (`ExecutiveOverview`, `ProjectPortfolioView`,
`ProjectDetailView`) mỗi cái tự `new BundledProjectPortfolioSource()` độc lập. Mục tiêu Phase 2: hỗ
trợ thêm một nguồn thứ hai (bundle JSON đã chuẩn hoá sẵn, chỗ đứng cho importer thật ở Phase 4) mà
UI/KPI/domain không cần biết đang chạy nguồn nào, và việc chọn nguồn nằm ở đúng một chỗ.

## Quyết định 1 — mở rộng `ProjectPortfolioSource` hiện có, không tạo interface mới

`ProjectPortfolioSource.loadPortfolio(signal?)` (đã tồn tại từ Phase 2A) giữ nguyên tên method —
không đổi thành `load()` như đề xuất tham khảo ban đầu, vì `loadPortfolio()` đã được gọi từ 3 view +
`FakeProjectPortfolioSource` + test. Interface được mở rộng thêm một method đồng bộ:

```ts
export interface ProjectPortfolioSource {
  loadPortfolio(signal?: AbortSignal): Promise<ProjectPortfolioLoadResult>;
  getMetadata(): ProjectPortfolioSourceMetadata;
}
```

`getMetadata()` **đồng bộ, không phải Promise** — cả hai implementation Phase 2
(`IllustrativeProjectPortfolioSource`, `GeneratedJsonProjectPortfolioSource`) đều 100% static/không
network, nên không có rủi ro "mô tả một lần load khác" mà một bản nháp thiết kế ban đầu (Phase 1) đã
lo ngại khi cân nhắc bỏ hẳn `getMetadata()`. `getMetadata()` cũng là cách DUY NHẤT biết được nguồn
nào đang chạy khi `loadPortfolio()` trả `status: 'error'` (không có `data` để đọc `.metadata`).
`ProjectPortfolioLoadResult.data` (khi `ok`/`degraded`) mang thêm field `metadata` bằng đúng giá trị
`getMetadata()` tại thời điểm load đó — tránh phải gọi lại `getMetadata()` một lần nữa khi đã có kết
quả load trong tay.

`ProjectPortfolioSourceMetadata` gồm `sourceId`, `sourceKind`
(`'illustrative' | 'generated-json' | 'http'`), `displayName`, `datasetIds`, `schemaVersion`,
`bundleVersion`, `asOf`, `generatedAt`, `isIllustrative`, `deploymentCompatibility` — field nào
không xác định được dùng `null`/mảng rỗng, không dùng chuỗi rỗng hay giá trị giả.

## Quyết định 2 — hai implementation cụ thể, một interface chỉ-tài-liệu

- **`IllustrativeProjectPortfolioSource`** (`src/data/projectPortfolioSource.ts`) — đổi tên từ
  `BundledProjectPortfolioSource` (tên cũ giữ lại làm alias export tương thích ngược). Hành vi giữ
  nguyên 100%, chỉ thêm `getMetadata()`.
- **`GeneratedJsonProjectPortfolioSource`** (`src/data/generatedJsonProjectPortfolioSource.ts`) —
  đọc một bundle JSON tối giản (`GeneratedProjectPortfolioBundleFile`), kiểm tra hình dạng top-level
  rồi gọi lại nguyên vẹn `validateProjectRecord`/`validateWorkPackageRecord`/
  `validateMilestoneRecord`/`validateProjectIssueRecord`/`validateProgressSnapshotRecord`
  (`src/entities/project/validation/validateProject.ts`) trên từng record — không viết lại business
  rule. Lỗi hình dạng top-level → `status: 'error'` (`kind: 'schema-invalid'`); lỗi validate record →
  `status: 'degraded'` kèm `issues`; không bao giờ fallback âm thầm sang dữ liệu minh hoạ. Fixture
  Phase 2 (`src/assets/data/project-portfolio.generated-fixture-demo.json`) là dữ liệu hư cấu viết
  tay, đăng ký `DatasetDescriptor` (`project-portfolio-generated-fixture-demo`,
  `classification: 'public'`, `authority: 'illustrative'`) và registry
  `config/public-data-files.json` theo đúng convention leakage-guard hiện có — KHÔNG phải output
  của importer thật (Phase 4 chưa triển khai).
- **`HttpProjectPortfolioSourceContract`** (`src/entities/project/adapters/HttpProjectPortfolioSourceContract.ts`)
  — type alias của `ProjectPortfolioSource`, chỉ tài liệu hoá "API contract gate" đã ghi trong
  `docs/domain-model.md`. Không implementation, không gọi network giả.

## Quyết định 3 — composition root qua module alias, không qua `switch` runtime

Composition root (`src/app/createProjectPortfolioSource.ts`) export một singleton
`defaultProjectPortfolioSource`, dùng bởi cả 3 view qua `source ?? defaultProjectPortfolioSource`.

**Phát hiện quan trọng trong quá trình triển khai**: bản nháp đầu tiên chọn implementation bằng một
hàm `switch (mode) { case 'demo': return new Illustrative...(); case 'internal-static': return new
Generated...(); }`, đọc `mode` từ `import.meta.env.VITE_PORTFOLIO_DATA_MODE`. Build thật
(`npm run build:internal-static`) rồi `grep prj-001 dist/assets/*.js` cho thấy **dữ liệu minh hoạ
vẫn có mặt trong bundle** dù chỉ nhánh `internal-static` từng chạy — một `switch` runtime khiến
Rollup không chứng minh được nhánh nào chết (giá trị `mode` đi qua một hàm resolve trung gian trước
khi vào `switch`, không phải một literal trực tiếp mà bundler có thể constant-fold), nên cả hai
class vẫn nằm trong đồ thị module.

**Quyết định cuối**: chọn implementation bằng `resolve.alias` của Vite (`vite.config.ts`), tính từ
`--mode` CLI, ánh xạ qua hàm thuần `resolveActivePortfolioSourceModule()`
(`src/app/resolveActivePortfolioSourceModule.ts`) sang một trong hai file re-export
(`src/data/activePortfolioSource.demo.ts` / `activePortfolioSource.generatedJson.ts`), cả hai cùng
export tên `ActivePortfolioSource`. Composition root chỉ `import { ActivePortfolioSource } from
'#active-portfolio-source'`. Cơ chế này buộc Rollup chỉ bao giờ thấy MỘT trong hai module nguồn
trong đồ thị build của một lần build cụ thể — loại trừ vật lý, không phụ thuộc dead-code-elimination
"đoán" đúng. Đã xác nhận lại bằng build thật: `grep prj-001 dist/assets/*.js` sau khi đổi sang alias
không còn kết quả nào cho `internal-static`/`public-static`.

## Quyết định 4 — data mode là một trục ĐỘC LẬP với "public"/"secure"

`docs/deployment-profiles.md` đã dùng "public"/"secure" cho trục auth (ai được xem, có cần đăng nhập
không). Yêu cầu Phase 2 dùng "demo"/"internal-static"/"public-static" cho một trục khác: nguồn dữ
liệu project-portfolio đang chạy. Không gộp hai bộ thuật ngữ; một build luôn thuộc `public` (trục
auth, GitHub Pages không có auth) và đồng thời thuộc một trong ba data mode.

`--mode` CLI của Vite/Vitest có 2-3 giá trị mặc định không do người dùng chọn tường minh
(`'development'`, `'production'`, và với Vitest là `'test'`) — cả ba rơi về mặc định an toàn
`'demo'`. Bất kỳ `--mode <x>` nào khác, không khớp `demo`/`internal-static`/`public-static`, throw
ngay tại thời điểm load config (`resolvePortfolioDataModeFromViteMode`,
`src/app/portfolioDataModes.ts`) — build/test dừng với exit code khác 0, không âm thầm chọn mode
khác.

## Hệ quả

- `npm run build` (demo) không đổi hành vi. `npm run build:internal-static` và
  `npm run build:public-static` là build mới, Phase 2 dùng chung `GeneratedJsonProjectPortfolioSource`
  cho cả hai (chưa có bước lọc public-projection — đó là việc Phase 6).
- `dist/build-info.json` có thêm field `portfolioDataMode`.
- `npm run verify:portfolio-data-modes` (mới) build cả 3 mode và quét `dist/assets/*.js` bằng
  `scripts/validate_portfolio_data_mode.mjs` để xác nhận marker dữ liệu minh hoạ chỉ xuất hiện ở
  `demo`, marker generated-fixture chỉ xuất hiện ở `internal-static`/`public-static`.
- Domain layer (`src/entities/project/`) tiếp tục không import bất kỳ concrete source nào —
  `importBoundary.test.ts` mở rộng cấm import `data/projectPortfolioSource` và
  `data/generatedJsonProjectPortfolioSource`. `src/app/portfolioSourceBoundary.test.ts` (mới) cấm
  `src/features/`/`src/components/` import trực tiếp concrete source hoặc raw fixture — chỉ
  composition root và adapter tự thân được phép.
- Không thêm database, backend, hay authentication. `internal-static`/`public-static` vẫn là static
  site không có server — không tuyên bố đây là cơ chế bảo vệ dữ liệu mật (xem README, mục "Data
  mode").
