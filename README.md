# Đắk Lắk 3D Dashboard

[![quality](https://github.com/shadowhunter67/daklak-3d-dashboard/actions/workflows/quality.yml/badge.svg)](https://github.com/shadowhunter67/daklak-3d-dashboard/actions/workflows/quality.yml)
[![Deploy GitHub Pages](https://github.com/shadowhunter67/daklak-3d-dashboard/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/shadowhunter67/daklak-3d-dashboard/actions/workflows/deploy-pages.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

**Tiếng Việt** (chính) · [**English**](README.en.md)

Dashboard WebGL thể hiện 102 xã/phường của tỉnh Đắk Lắk sau sắp xếp năm 2025, từ cao nguyên Đắk Lắk cũ đến duyên hải Phú Yên cũ. Bản đồ sử dụng một bề mặt địa hình displacement từ SRTM, phủ ảnh Sentinel-2 và xác định đơn vị hành chính bằng hit-test polygon để hỗ trợ hover, click, selected state, hồ sơ nhanh và các lớp dữ liệu chuyên đề. Bốn trải nghiệm: **Tổng quan điều hành** (landing mặc định — KPI danh mục dự án, danh sách cần chú ý, cảnh báo, sức khỏe dữ liệu), tổng quan 3D, danh sách 2D accessible, và bản đồ chi tiết (`?view=map`) dùng **MapLibre GL JS + PMTiles tự host** — hoàn toàn không phụ thuộc Google Maps Platform, không cần API key hay billing. Xem [docs/detail-map-integration.md](docs/detail-map-integration.md).

Ngoài bốn trải nghiệm trên, nút **"Khám phá"** (`?view=world`) mở một bản xem trước — bay qua địa hình tỉnh, nền tảng ban đầu cho hướng phát triển "Tourism Digital Twin" (bản đồ số du lịch). Đây là **kịch bản minh họa** (badge "ILLUSTRATIVE" hiển thị ngay trên cảnh), chưa có điểm đến/tuyến du lịch thật — xem [reports/tourism-digital-twin/phase-status.md](reports/tourism-digital-twin/phase-status.md) để biết trạng thái và giới hạn hiện tại.

Dự án đang chuyển dần từ "dashboard bản đồ 3D" sang "nền tảng điều hành dự án trọng điểm cấp tỉnh, dùng bản đồ làm lớp ngữ cảnh" — xem [ADR 0001](docs/adr/0001-project-centric-domain.md) và [domain model](docs/domain-model.md). Từ Phase 2B1, nền tảng có thêm **Danh mục dự án** (tìm kiếm/lọc/sắp xếp toàn bộ dự án) và **Chi tiết dự án** (trang riêng, đầy đủ ngân sách/tiến độ/gói thầu/mốc/vướng mắc/nguồn dữ liệu) với URL riêng dùng hash routing — xem [ADR 0002](docs/adr/0002-static-host-routing.md). Tổng quan điều hành, Danh mục dự án và Chi tiết dự án hiện tại đều dùng **dữ liệu minh họa deterministic** cho 9 dự án mẫu (`src/entities/project/illustrativeProjectPortfolio.ts`), không phải số liệu vận hành thật — xem mục "Giới hạn và roadmap" bên dưới.

## Demo

[![Tổng quan điều hành — Đắk Lắk 3D Dashboard](docs/images/readme-gallery/executive-overview-desktop.png)](https://shadowhunter67.github.io/daklak-3d-dashboard/)

**Live demo:** https://shadowhunter67.github.io/daklak-3d-dashboard/ · [**Khám phá Đắk Lắk 3D**](https://shadowhunter67.github.io/daklak-3d-dashboard/?view=world) (bản xem trước, minh họa)

> **Disclaimer:** toàn bộ dữ liệu dự án/gói thầu/mốc tiến độ/ngân sách/giải ngân/tiến độ/vướng mắc hiển thị trong Tổng quan điều hành và các trải nghiệm bản đồ đều là **dữ liệu minh họa deterministic** (seed cố định trong mã nguồn), không phải số liệu vận hành hay số liệu chính thức của cơ quan nhà nước, không dùng cho quyết định quản lý, phê duyệt hoặc báo cáo thực tế. Bản đồ là sản phẩm trực quan tham khảo, không dùng cho đất đai, đo đạc, quy hoạch pháp lý hoặc xác lập địa giới chính thức.

## Ngôn ngữ

Giao diện hỗ trợ **tiếng Việt** (mặc định) và **tiếng Anh**, chuyển đổi bằng nút "VI / EN" ở góc phải header, không reload trang. URL chia sẻ được (`?lang=vi`/`?lang=en`, tương thích với mọi `?view=`/`#/projects...` khác), lựa chọn được nhớ qua `localStorage`, Back/Forward hoàn tác đúng lần chuyển ngôn ngữ gần nhất — xem [ADR 0003](docs/adr/0003-internationalization.md).

**Phạm vi dịch:** toàn bộ giao diện sản phẩm — app shell, header, Tổng quan điều hành, Danh mục dự án, Chi tiết dự án, điều khiển bản đồ 3D, danh sách 2D accessible, bản đồ chi tiết MapLibre (layer panel, tìm kiếm, đo khoảng cách), onboarding, panel Nguồn dữ liệu, và hộp thoại nguồn/chất lượng dữ liệu. Một audit tĩnh tự động (`scripts/check_i18n_hardcoded_strings.mjs`, chạy trong `npm test`) chặn build nếu có chuỗi tiếng Việt hard-code lọt ra ngoài dictionary dịch. Chỉ trừ tên riêng (địa danh, tên/mã dự án minh hoạ) và nội dung nguồn chỉ có tiếng Việt chưa có bản tiếng Anh — xem ADR 0003 mục "Phạm vi dịch".

English documentation: [README.en.md](README.en.md).

## Điều hướng

Bốn trải nghiệm loại trừ lẫn nhau, đồng bộ vào query string `?view=` (giá trị thật do `src/utils/dashboardUrl.ts` phát ra — xem `parseViewMode`/`serializeViewMode`):

| `?view=`                             | Trải nghiệm             | Ghi chú                                                                                                                       |
| ------------------------------------ | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| _(không có tham số)_ hoặc `overview` | **Tổng quan điều hành** | Landing mặc định từ Phase 2A — KPI danh mục dự án, danh sách cần chú ý, cảnh báo, sức khỏe dữ liệu.                           |
| `3d`                                 | Tổng quan 3D            | Bản đồ WebGL displacement terrain, giữ nguyên hành vi trước Phase 2A.                                                         |
| `2d`                                 | Danh sách 2D accessible | Giá trị URL thực tế vẫn là `2d` (không phải `table`) dù kiểu `DashboardView` nội bộ gọi là `'table'` — xem `dashboardUrl.ts`. |
| `map`                                | Bản đồ chi tiết         | MapLibre GL JS + PMTiles tự host.                                                                                             |

Mọi URL `?view=3d` / `?view=2d` / `?view=map` từ trước Phase 2A vẫn hoạt động y hệt — chỉ việc thiếu tham số `view` (hoặc giá trị lạ) mới đổi hành vi, từ ngã về `3d` (trước Phase 2A) sang ngã về `overview` (từ Phase 2A). Xem [ADR 0001](docs/adr/0001-project-centric-domain.md).

### Danh mục dự án / Chi tiết dự án (Phase 2B1)

Hai điểm vào mới, **độc lập với `?view=`**, dùng hash routing (không cần server rewrite trên GitHub Pages — xem [ADR 0002](docs/adr/0002-static-host-routing.md)):

| URL                                                     | Trải nghiệm                                                                                                |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `#/projects`                                            | **Danh mục dự án** — tìm kiếm/lọc (trạng thái, lĩnh vực, địa bàn)/sắp xếp toàn bộ dự án trong danh mục.    |
| `#/projects?status=delayed&sector=transport&q=…&sort=…` | Cùng trang, với bộ lọc đã đồng bộ vào URL (chia sẻ được, tồn tại qua reload/Back-Forward).                 |
| `#/projects/:projectId`                                 | **Chi tiết dự án** — ngân sách, tiến độ, gói thầu, mốc, lịch sử tiến độ, vướng mắc, vị trí, nguồn dữ liệu. |

Một route dự án (khi có mặt trong `location.hash`) luôn được ưu tiên render trên 4 trải nghiệm `?view=` — ví dụ `?view=3d#/projects` vẫn mở Danh mục dự án, không mở bản đồ 3D. Trực tiếp mở/reload/Back-Forward trên cả hai URL đều hoạt động đúng vì hash routing không cần server biết trước route nào tồn tại. Mở từ nút "Xem danh mục dự án →" trên Tổng quan điều hành, hoặc dán thẳng URL.

## Screenshots

<p align="center">
  <img src="docs/images/readme-gallery/executive-overview-desktop.png" alt="Tổng quan điều hành trên desktop 1440x900: thẻ KPI danh mục dự án, danh sách dự án cần chú ý, danh sách cảnh báo và huy hiệu DỮ LIỆU MINH HỌA" width="49%">
  <img src="docs/images/readme-gallery/executive-overview-mobile.png" alt="Tổng quan điều hành trên mobile 390x844, các thẻ KPI xếp lại thành lưới 2 cột không tràn ngang" width="49%">
</p>
<p align="center"><sub><b>Trái:</b> Tổng quan điều hành trên desktop — landing mặc định từ Phase 2A. <b>Phải:</b> cùng trải nghiệm trên khung hình mobile.</sub></p>

<p align="center">
  <img src="docs/images/readme-gallery/executive-project-summary.png" alt="Hộp thoại tóm tắt dự án mở trên Tổng quan điều hành, hiển thị mã dự án, trạng thái, tỷ lệ giải ngân, lý do cần chú ý và nút Xem trên bản đồ" width="70%">
</p>
<p align="center"><sub>Hộp thoại tóm tắt một dự án (mở từ "Xem tóm tắt" trong danh sách "Dự án cần chú ý"), đóng bằng Escape hoặc nút "Đóng" và trả focus đúng về nút đã mở nó.</sub></p>

<p align="center">
  <img src="docs/images/readme-gallery/project-portfolio-desktop.png" alt="Danh mục dự án trọng điểm trên desktop 1440x900: bộ lọc trạng thái/lĩnh vực/địa bàn, ô tìm kiếm, bảng 9 dự án với tiến độ, giải ngân, kế hoạch hoàn thành và lý do cần chú ý" width="49%">
  <img src="docs/images/readme-gallery/project-portfolio-mobile.png" alt="Danh mục dự án trọng điểm trên mobile 390x844, danh sách dự án hiển thị dạng thẻ thay vì bảng ngang" width="49%">
</p>
<p align="center"><sub><b>Trái:</b> Danh mục dự án (<code>#/projects</code>) trên desktop — bảng có ngữ nghĩa <code>&lt;table&gt;</code> đầy đủ. <b>Phải:</b> cùng trải nghiệm trên mobile, tự chuyển sang thẻ để không phải cuộn ngang.</sub></p>

<p align="center">
  <img src="docs/images/readme-gallery/project-detail-desktop.png" alt="Chi tiết dự án trên desktop, hiển thị header, tóm tắt ngân sách/tiến độ, danh sách gói thầu với tiến độ và ngân sách" width="49%">
  <img src="docs/images/readme-gallery/project-detail-mobile.png" alt="Chi tiết dự án trên mobile 390x844, cùng nội dung xếp lại một cột" width="49%">
</p>
<p align="center"><sub><b>Trái:</b> Chi tiết dự án (<code>#/projects/:id</code>) trên desktop — trang riêng có URL, không phải modal. <b>Phải:</b> cùng trải nghiệm trên mobile.</sub></p>

<p align="center">
  <img src="docs/images/readme-gallery/dashboard-3d-overview.png" alt="Bản đồ 3D Đắk Lắk ở chế độ Tổng quan, hiển thị đầy đủ nhãn hành chính 102 xã/phường trên nền địa hình Sentinel-2, chưa chọn đơn vị nào" width="49%">
  <img src="docs/images/readme-gallery/dashboard-2d-administrative-labels.png" alt="Bản đồ 2D hành chính hiển thị polygon và nhãn xã/phường thích ứng bằng tiếng Việt có dấu" width="49%">
</p>
<p align="center"><sub><b>Trái:</b> bản đồ 3D, chế độ Tổng quan, với nhãn hành chính trên địa hình. <b>Phải:</b> bản đồ 2D với nhãn xã/phường thích ứng theo không gian hiển thị, danh sách tra cứu không che bản đồ.</sub></p>

<p align="center">
  <img src="docs/images/readme-gallery/dashboard-3d-roads-and-labels.png" alt="Bản đồ 3D bật lớp đường giao thông và nhãn tuyến đường trên địa hình Đắk Lắk" width="49%">
  <img src="docs/images/readme-gallery/dashboard-ward-selected.png" alt="Panel chi tiết xã Liên Sơn Lắk mã 24580 mở trên bản đồ 3D, hiển thị diện tích, dân số minh họa và tỷ lệ tiếp cận dịch vụ" width="49%">
</p>
<p align="center"><sub><b>Trái:</b> lớp đường giao thông (OpenStreetMap, ODbL 1.0) cùng nhãn tuyến đường trên bản đồ 3D. <b>Phải:</b> hồ sơ nhanh khi chọn một xã/phường (ví dụ Liên Sơn Lắk, mã 24580).</sub></p>

<p align="center">
  <img src="docs/images/readme-gallery/dashboard-mobile-map-labels.png" alt="Giao diện mobile 390x844 hiển thị bản đồ 2D, nhãn hành chính thích ứng và lớp đường giao thông" width="49%">
  <img src="docs/images/readme-gallery/dashboard-mobile-selected-ward.png" alt="Giao diện mobile 390x844, bottom sheet ở trạng thái peek hiển thị tên, loại và mã của xã đang chọn" width="49%">
</p>
<p align="center"><sub><b>Trái:</b> bản đồ 2D và lớp đường giao thông trên giao diện mobile. <b>Phải:</b> bottom sheet chọn nhanh trên giao diện mobile.</sub></p>

<p align="center">
  <img src="docs/images/readme-gallery/dashboard-energy-mode.png" alt="Bản đồ 3D ở chế độ Năng lượng, hiển thị 5 điểm năng lượng minh họa và panel hồ sơ xã Liên Sơn Lắk đang chọn" width="49%">
  <img src="docs/images/readme-gallery/dashboard-heatmap-mode.png" alt="Bản đồ 3D ở chế độ Heatmap, phủ màu cường độ dân số giả lập lên địa hình theo từng xã/phường" width="49%">
</p>
<p align="center"><sub><b>Trái:</b> chế độ Năng lượng với các điểm thủy điện, phụ tải minh họa. <b>Phải:</b> chế độ Heatmap thể hiện phân bố dân số giả lập theo cường độ màu.</sub></p>

<p align="center">
  <img src="docs/images/readme-gallery/dashboard-2d-roads-and-labels.png" alt="Bản đồ 2D hành chính bật lớp đường giao thông (quốc lộ, tỉnh lộ, đường huyện) cùng danh sách xã/phường tra cứu" width="49%">
  <img src="docs/images/readme-gallery/dashboard-mobile-directory.png" alt="Giao diện mobile hiển thị danh sách 102 xã/phường tra cứu, với xã Liên Sơn Lắk đang được chọn" width="49%">
</p>
<p align="center"><sub><b>Trái:</b> bản đồ 2D với lớp đường giao thông và danh sách tra cứu. <b>Phải:</b> danh sách xã/phường trên giao diện mobile, đồng bộ với đơn vị đang chọn.</sub></p>

> Dữ liệu cấp xã và các lớp chuyên đề (dân số, năng lượng, heatmap) là **dữ liệu minh họa** có seed cố định, không phải số liệu vận hành thời gian thực. Lớp đường giao thông lấy từ **OpenStreetMap, giấy phép ODbL 1.0**. Bản đồ không phải hồ sơ hành chính hoặc tài liệu pháp lý chính thức — geometry là dữ liệu mở tham khảo, chưa được cơ quan địa chính chứng nhận.

## Stack và kiến trúc

React 19, TypeScript strict, Vite, Three.js/React Three Fiber, Drei, D3 Geo, Zustand, MapLibre GL JS và PMTiles. GIS được xử lý offline bằng GeoPandas/Shapely/PyProj/Fiona; trình duyệt chỉ parse file tĩnh và dựng geometry. `maplibre-gl`/`pmtiles` chỉ tải khi mở bản đồ chi tiết (lazy chunk riêng, không nằm trong initial bundle hay bundle của tổng quan 3D). Các biểu đồ cột nhỏ (`StatPanel`) là SVG/CSS thuần, không dùng thư viện chart riêng. Song ngữ (`src/i18n/`) tự viết — Context + dictionary object, không dùng `react-i18next`; dictionary tiếng Anh lazy-load qua `import()`, không nằm trong bundle ban đầu — xem [ADR 0003](docs/adr/0003-internationalization.md).

Luồng dữ liệu: snapshot MIT → chuẩn hóa/repair EPSG:4326 → GeoJSON + outline + borders + labels + metadata → DEM/ảnh bề mặt tiền xử lý → D3 projection → Three.js displacement terrain → polygon hit-test + Zustand → dashboard.

Phần bản đồ được tách theo trách nhiệm: bề mặt terrain, các overlay heatmap/selection, nhãn và điểm năng lượng, camera controls, cấu hình terrain và hit-test hình học. Hover được giới hạn theo animation frame và lọc bounding box trước khi chạy point-in-polygon.

Tổng quan điều hành đi theo một luồng riêng, tách biệt hoàn toàn khỏi phần bản đồ:

`BundledProjectPortfolioSource` (`src/data/`) → domain validation/assessment (`src/entities/project/`) → read model Tổng quan điều hành (`buildExecutiveOverview`, `src/features/executive-overview/model/`) → component trình bày (`ExecutiveOverview`, `KpiCardGrid`, `PriorityProjectList`, `AlertList`, `DataHealthPanel`, …)

Component trình bày không tự tính KPI/cảnh báo — mọi con số đều đọc từ `ExecutiveOverviewModel` do `buildExecutiveOverview` tạo ra trên domain layer đã validate. Xem [docs/architecture.md](docs/architecture.md) và [docs/domain-model.md](docs/domain-model.md) để biết chi tiết ranh giới import (domain layer không được import GIS/UI/Zustand).

## Chạy dự án

Yêu cầu Node.js 22. Các artifact GIS đã được commit, vì vậy developer chỉ sửa frontend không cần cài Python hoặc xây lại dữ liệu:

```bash
npm ci
npm run dev
```

Python 3.12 chỉ cần khi kiểm định hoặc tái tạo GIS. Xem phần **Xây lại GIS** và `scripts/README.md`; `.nvmrc` và `.python-version` khớp với CI.

Build production và quality gates:

```bash
npm run lint
npm run format:check
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run build
npm run check:budget
```

Playwright chạy smoke test trên Chromium desktop, Chromium mobile (Pixel 7) và WebKit desktop (Desktop Safari). Visual regression chỉ dùng Chromium desktop/mobile để tránh nhiễu rasterization giữa engine. CI không tự bootstrap baseline còn thiếu — PR thiếu hoặc lệch baseline sẽ fail rõ ràng. Chỉ cập nhật baseline có chủ đích qua workflow thủ công **Visual baseline (manual)** (`workflow_dispatch`) hoặc `npm run test:e2e:update` cục bộ, xem [chi tiết](docs/testing-strategy.md#updating-a-visual-baseline-on-purpose).

Hoặc chạy toàn bộ bằng `npm run quality:frontend` (lint, format, typecheck, unit test, build, budget, build metrics, E2E production — không cần Python/GIS) khi chỉ sửa frontend. Dùng `npm run quality:full` (hoặc alias `npm run quality`, giữ để không phá thói quen/CI hiện tại) khi cần thêm bước `validate:data` bằng Python. `npm run check:gis-deps` báo rõ nếu thiếu Python hoặc các gói GIS (`scripts/requirements.txt`) trước khi validate:data chạy. Ngân sách build được lưu tại `reports/performance-budget.json` và chặn tăng trưởng ngoài ý muốn của JavaScript/texture trong CI.

Dashboard đồng bộ `view`, `mode` và `ward` vào query string để URL có thể chia sẻ, refresh và dùng Back/Forward mà không cần router. `npm run build:metrics` sinh [JSON](reports/build-metrics.json) và [bảng Markdown](reports/build-metrics.md) từ build thật; FPS, GPU memory và LCP không được tuyên bố vì CI không đại diện cho GPU thiết bị thật.

Mỗi production build sinh `dist/build-info.json` gồm version ứng dụng, commit SHA, thời điểm build, phiên bản dataset và `portfolioDataMode` (xem mục dưới). Trên site đã deploy, mở `/daklak-3d-dashboard/build-info.json` để đối chiếu release đang chạy.

## Data mode: demo / internal-static / public-static

Ba lệnh build khác nhau chỉ ở **nguồn dữ liệu danh mục dự án** (`Project`/`WorkPackage`/... — xem
[docs/project-data-import/](docs/project-data-import/)), KHÔNG liên quan tới trục "public/secure"
(auth) của [docs/deployment-profiles.md](docs/deployment-profiles.md) — hai trục độc lập, một build
luôn thuộc `public` (không auth) và đồng thời thuộc một trong ba mode dưới đây:

```bash
npm run build                    # = build:demo — dữ liệu minh hoạ (mặc định, không đổi hành vi cũ)
npm run build:internal-static    # dùng generated-json bundle (Phase 2: fixture kiểm thử, chưa phải importer thật)
npm run build:public-static      # Phase 6: dùng bundle ĐÃ qua public projection engine (allowlist field)
```

- **`demo`** — nguồn `IllustrativeProjectPortfolioSource`, 9+ dự án minh hoạ hiện có, hành vi giống
  hệt trước đây. Đây là build deploy GitHub Pages.
- **`internal-static`** — nguồn `GeneratedJsonProjectPortfolioSource`, đọc một bundle JSON đã chuẩn
  hoá sẵn. **Không tự động chứa dữ liệu minh hoạ** — build này bị kiểm tra bằng
  `npm run verify:portfolio-data-modes` để đảm bảo `illustrativeProjectPortfolio.ts` không lọt vào
  `dist/`. Dùng để triển khai tĩnh trong mạng/máy chủ nội bộ có kiểm soát truy cập — **không phải cơ
  chế bảo vệ dữ liệu mật**: static build không có đăng nhập, không có server, ai truy cập được vào
  nơi host file tĩnh này đều đọc được toàn bộ dữ liệu. Dữ liệu thật/nhạy cảm phải được triển khai
  trong môi trường có kiểm soát truy cập ở tầng mạng, không phải trông cậy vào frontend. Guard
  (`npm run validate:portfolio-data-mode:*`) từ Phase 6 kiểm tra cấu trúc (module nguồn nào được
  Vite alias + literal `sourceKind` trong contract), không còn dùng ID dữ liệu tuỳ ý — xem
  [ADR 0009](docs/adr/0009-public-projection-and-ui-review-gate.md).
- **`public-static`** (Phase 6) — nguồn `PublicProjectedProjectPortfolioSource`, đọc bundle ĐÃ qua
  **public projection engine** (`src/entities/project/publicProjection/`) — lọc field theo allowlist
  tường minh (`config/public-project-fields.json`), KHÔNG còn dùng chung bundle với `internal-static`.
  Xem [docs/project-data-import/public-projection-policy.md](docs/project-data-import/public-projection-policy.md)
  và [public-release-runbook.md](docs/project-data-import/public-release-runbook.md). Projection chỉ
  đảm bảo field/record nằm trong allowlist — **không tự cấp quyền công bố**; một người có thẩm quyền
  vẫn phải review nội dung trước khi publish thật.

Không cần database cho bất kỳ mode nào ở trên — cả ba đều là static site đọc dữ liệu bundled/generated
tại build time, không có backend, không có runtime query. Xem
[docs/project-data-import/04-deployment-profiles-design.md](docs/project-data-import/04-deployment-profiles-design.md)
để biết chi tiết thiết kế và giới hạn từng mode.

## Canonical project-portfolio data contract

`internal-static`/`public-static` đọc một **canonical bundle** JSON versioned
(`CanonicalProjectPortfolioBundle`, [ADR 0006](docs/adr/0006-canonical-project-portfolio-data-contract.md)) —
JSON Schema mirror ở `data-templates/schemas/`, ví dụ/template ở `data-templates/examples/` và
`data-templates/csv/`. Kiểm tra một bundle theo canonical schema:

```bash
npm run validate:project-data-contract
```

Script này chỉ chạy Node/CI (Ajv không đi vào browser bundle).

### Offline importer (Phase 4)

Nhập dữ liệu dự án nội bộ (canonical JSON hoặc thư mục CSV) thành một bundle đã validate:

```bash
npm run import:data -- --input ./incoming-data --output ./generated-data --as-of 2026-07-27T00:00:00.000Z
npm run stage:internal-portfolio -- --bundle ./generated-data/project-portfolio.bundle.json
npm run build:internal-static
```

Định dạng hỗ trợ THẬT: một file canonical JSON bundle hoàn chỉnh, HOẶC một thư mục CSV (9 dataset,
header canonical — xem [csv-contract.md](docs/project-data-import/csv-contract.md)). **Không hỗ trợ
XLSX** ở Phase 4 (chưa đánh giá dependency, chưa có nhu cầu vận hành cụ thể). Importer KHÔNG viết lại
mapper/domain validator/quality rule — chỉ orchestrate lại các module đã có từ Phase 3, cộng thêm một
integrity check riêng cho reference tới project không tồn tại. Import là all-or-nothing theo TOÀN BỘ
lần chạy (một lỗi chặn khiến cả lần chạy bị từ chối, không có "import thành công một phần") — không
bao giờ silently drop record. **Importer output KHÔNG tự động là public-approved output** —
`stage:internal-portfolio` chỉ đưa dữ liệu vào build `internal-static`; để dùng cho `public-static`
phải qua public projection engine (Phase 6 — `npm run project:public-data` +
`npm run stage:public-portfolio`, xem
[public-release-runbook.md](docs/project-data-import/public-release-runbook.md)), không bao giờ
dùng trực tiếp bundle internal chưa lọc. Không thêm database/backend/authentication nào. Xem
[ADR 0007](docs/adr/0007-offline-project-data-importer-and-last-known-good-promotion.md) và
[import-runbook.md](docs/project-data-import/import-runbook.md) cho chi tiết đầy đủ. Đội cung cấp dữ
liệu nên bắt đầu từ [integration-kit/README.md](integration-kit/README.md) (checklist đánh giá
nguồn, field mapping, lỗi thường gặp, ví dụ CSV đã chạy thật qua importer). Để publish dữ liệu đã
import ra `public-static` thật, xem
[public-release-runbook.md](docs/project-data-import/public-release-runbook.md) (Phase 6) — bước
projection + review thủ công BẮT BUỘC trước khi stage. Cho một public release THẬT (không phải
demo/fixture), projection/staging còn hai cơ chế fail-closed thêm ở Phase 7 —
**publication decision** (mỗi record cần quyết định `public`/`excluded` RÕ RÀNG, `--require-
publication-decisions`, ADR 0010) và **approval receipt** (buộc phê duyệt vào đúng checksum output,
`--require-approval-receipt`) — xem
[public-projection-policy.md](docs/project-data-import/public-projection-policy.md) và ví dụ chạy
thật (importer CSV → projection → staging) ở
[phase7-pilot-rehearsal.md](docs/project-data-import/phase7-pilot-rehearsal.md).

Hai flag fail-closed ở trên vẫn TUỲ CHỌN trên `project:public-data`/`stage:public-portfolio` gốc (để
không phá demo/fixture) — chạy thiếu flag chỉ in cảnh báo ra `stderr`, không chặn. Cho một **public
release thật**, dùng hai npm script Phase 8 hardcode sẵn flag bắt buộc thay vì lệnh gốc:

```bash
npm run project:public-data:release -- --input ... --output ... --publication-decisions ...
npm run stage:public-portfolio:release -- --bundle ... --approval-receipt ...
```

Xem [ADR 0011](docs/adr/0011-fail-closed-flag-enforcement-warnings.md) — lý do không chặn cứng lệnh
gốc, và `scripts/public-projection/pilotRehearsal.test.ts` (chạy trong CI qua `test:public-projection`)
tự động re-run toàn bộ chuỗi pilot để bắt regression, thay vì chỉ ghi lại trong tài liệu.

### Data Readiness (Phase 5)

Trang `#/data-readiness` (link "Xem Data Readiness" trong panel Data Health của Tổng quan điều hành)
hiển thị: nguồn dữ liệu hiện tại là gì (minh hoạ hay đã import), schema/bundle version, số lượng bản
ghi từng loại, và ba nhóm vấn đề tách biệt rõ — lỗi cấu trúc (luôn cần sửa) / vấn đề chất lượng dữ
liệu (cần xem xét) / cảnh báo nghiệp vụ (thông tin, không phải lỗi). Xem
[ADR 0008](docs/adr/0008-demo-scenario-strategy-and-data-readiness-experience.md).

## Khả năng tiếp cận và hiệu năng

- Tổng quan điều hành (landing mặc định) không cần WebGL — chỉ HTML/CSS thuần, không mount canvas nào.
- Hai trải nghiệm nặng (3D, MapLibre/bản đồ chi tiết) đều là lazy chunk riêng, chỉ tải khi thực sự mở — xem [docs/performance.md](docs/performance.md) cho số byte thật (không hardcode ở đây vì sẽ lỗi thời qua từng build).
- Giá trị KPI không hiển thị âm thầm thành "0" khi thiếu dữ liệu đầu vào — luôn kèm giải thích ("Chưa đủ dữ liệu").
- Trạng thái (Ổn định/Cần chú ý/Nghiêm trọng…) không chỉ phân biệt bằng màu — luôn có nhãn chữ đi kèm.
- Hộp thoại (tóm tắt dự án, nguồn dữ liệu) trả focus đúng về phần tử đã kích hoạt mở nó khi đóng, kể cả khi hộp thoại tự `autoFocus` nút đóng lúc mount.

## Tài liệu kỹ thuật

- [Kiến trúc](docs/architecture.md)
- [Bản đồ chi tiết (MapLibre/PMTiles)](docs/detail-map-integration.md)
- [Nguồn gốc và kiểm định dữ liệu](docs/data-provenance.md)
- [Chiến lược kiểm thử](docs/testing-strategy.md)
- [Hiệu năng và ngân sách](docs/performance.md)
- [Khả năng tiếp cận](docs/accessibility.md)
- [Vận hành production](docs/operations.md)
- [Benchmark thiết bị thật](docs/device-benchmark.md)
- [Chính sách bảo mật](SECURITY.md) và [hướng dẫn đóng góp](CONTRIBUTING.md)
- [Giấy phép](LICENSE) · [Lịch sử giấy phép](LICENSE-HISTORY.md) · [Thương hiệu](TRADEMARKS.md)
- [ADR 0003 — Internationalization (vi/en)](docs/adr/0003-internationalization.md)
- Nền tảng dữ liệu (`src/data-platform/`): [kiến trúc](docs/data-platform-architecture.md) ·
  [nguồn công khai](docs/public-data-sources.md) ·
  [phân loại dữ liệu](docs/data-classification.md) ·
  [tích hợp dữ liệu nội bộ](docs/internal-data-integration.md) ·
  [kiến trúc bảo mật](docs/security-architecture.md) ·
  [quản trị dữ liệu](docs/data-governance.md) ·
  [thêm dataset mới](docs/dataset-onboarding.md) ·
  [profile triển khai public/secure](docs/deployment-profiles.md)
- Nền tảng điều hành dự án trọng điểm (`src/entities/project/`, đang xây dựng theo phase):
  [gap analysis](docs/reviews/project-platform-gap-analysis.md) ·
  [ADR 0001 — Project là entity trung tâm](docs/adr/0001-project-centric-domain.md) ·
  [ADR 0002 — Hash routing cho Danh mục/Chi tiết dự án](docs/adr/0002-static-host-routing.md) ·
  [domain model](docs/domain-model.md)
- Nhập dữ liệu dự án nội bộ thật (`docs/project-data-import/`, Phase 1-8 hoàn thành): [chỉ
  mục](docs/project-data-import/README.md) ·
  [ADR 0005 — Project portfolio source abstraction và static data modes](docs/adr/0005-project-portfolio-source-abstraction.md) ·
  [ADR 0006 — Canonical project portfolio data contract](docs/adr/0006-canonical-project-portfolio-data-contract.md) ·
  [ADR 0007 — Offline importer và last-known-good promotion](docs/adr/0007-offline-project-data-importer-and-last-known-good-promotion.md) ·
  [ADR 0008 — Demo scenario strategy và Data Readiness](docs/adr/0008-demo-scenario-strategy-and-data-readiness-experience.md) ·
  [ADR 0009 — Public projection và UI review gate](docs/adr/0009-public-projection-and-ui-review-gate.md) ·
  [ADR 0010 — Representative pilot và fail-closed publication decisions](docs/adr/0010-representative-pilot-and-fail-closed-publication-decisions.md) ·
  [ADR 0011 — Enforcement không im lặng cho flag fail-closed](docs/adr/0011-fail-closed-flag-enforcement-warnings.md) ·
  [canonical data dictionary](docs/project-data-import/canonical-data-dictionary.md) ·
  [import runbook](docs/project-data-import/import-runbook.md) ·
  [public projection policy](docs/project-data-import/public-projection-policy.md) ·
  [public release runbook](docs/project-data-import/public-release-runbook.md) ·
  [UI review process](docs/project-data-import/ui-review-process.md) ·
  [integration kit](integration-kit/README.md) — bàn giao cho đội cung cấp dữ liệu
- Pipeline ingestion dữ liệu công khai tự động (`scripts/data-refresh/`, nền tảng — chưa nối nguồn
  thật): [ADR 0004](docs/adr/0004-public-data-ingestion.md) ·
  [hướng dẫn vận hành](docs/public-data-refresh.md)

## Cập nhật dữ liệu công khai tự động (nền tảng)

`scripts/data-refresh/` là nền tảng ingestion tự động cho dữ liệu công khai — **scheduled refresh**
theo lịch khai báo trong `data/source-registry.yml`, không phải "thời gian thực". PR nền tảng này
chỉ chạy với **một adapter fixture nội bộ** (`recorded-fixture`, đọc file, không gọi mạng) — chưa
onboard nguồn thật nào, vì chưa xác nhận robots.txt/terms của bất kỳ nguồn nào. Xem
[ADR 0004](docs/adr/0004-public-data-ingestion.md) và
[hướng dẫn vận hành](docs/public-data-refresh.md) cho kiến trúc đầy đủ.

Danh mục **`InvestmentOpportunity`** (cơ hội xúc tiến đầu tư, `src/entities/investment-opportunity/`)
do pipeline này sinh ra **hoàn toàn tách biệt** khỏi danh mục **`Project`** (dự án trọng điểm đang
vận hành) — không bao giờ trộn hai domain này. Nguồn thật đầu tiên **chưa onboard được** — xem
[đánh giá nguồn](docs/data-sources/investment-opportunities-daklak-assessment.md): các nguồn chính
thức tỉnh Đắk Lắk đã kiểm tra đều là danh sách tin tức không có cấu trúc (chỉ tiêu đề + ngày, không
có trường sector/vốn/trạng thái) hoặc không truy cập được, nên chưa có adapter/parser deterministic
khả thi. Chưa có route UI riêng cho danh mục này vì chưa có dữ liệu thật để hiển thị.

`.github/workflows/public-data-refresh.yml` hiện là **`workflow_dispatch`-only** — không có
`schedule` (xem [ADR 0004 mục 10](docs/adr/0004-public-data-ingestion.md#10-live-commissioning-và-hardening-bổ-sung)
cho lý do). Mỗi nguồn khai báo `maturity` (`experimental`/`review-required`/`observed`/
`auto-merge-eligible`) trong `data/source-registry.yml`; một run chỉ tự động merge khi nguồn đã
được khai báo `auto-merge-eligible` **và** risk là `low-risk` **và** mọi điều kiện cứng khác
(`scripts/data-refresh/autoMergePolicy.mjs`) pass — nguồn fixture hiện tại là `experimental`, không
bao giờ auto-merge. Kết quả `low-risk` kèm thay đổi mở PR cập nhật
`reports/data-refresh/last-known-good/` và `data/published/source-health.json`; kết quả
`hard-stop`/cần xem xét thì cập nhật **một** issue theo dõi sức khỏe nguồn duy nhất, gán
`shadowhunter67`, gắn nhãn `manual-review-required` — không tự commit thẳng vào `main`, không spam
issue mới mỗi lần chạy. Panel "Cập nhật tự động" trên header hiển thị tình trạng nguồn dữ liệu
(song ngữ, có nhãn mức độ trưởng thành nguồn) từ một snapshot JSON do chính pipeline sinh ra
(`data/published/source-health.json`), không tự fetch trong trình duyệt, không ai sửa tay.

## Xây lại GIS

Chạy `npm run prepare:gis-source` để sparse-clone snapshot đã pin và xác minh SHA-256 vào `.cache/gis-source/`. Script dùng lại cache hợp lệ; `npm run prepare:gis-source:offline` kiểm tra cache không dùng mạng, còn `python scripts/prepare_gis_source.py --refresh` thay cache. `npm run build:gis` tự gọi bước chuẩn bị này. File canonical `.geojson` chỉ phục vụ tooling/validation; frontend chỉ import `daklak-wards-render.json`.

## Dữ liệu đầu ra

- `daklak-wards.geojson`: 102 geometry canonical cho tooling/validation; `daklak-wards-render.json` là LOD nhẹ duy nhất được frontend import.
- `daklak-outline.geojson`, `daklak-borders.geojson`: dissolve và unique linework.
- `daklak-labels.json`, `daklak-label-overrides.json`: point-on-surface và override.
- `daklak-terrain-height.png`, `normal.png`, `color.png`, `mask.png`: terrain SRTM dẫn xuất cho displacement mesh.
- `daklak-metadata.json`, `daklak-source-summary.json`, `daklak-metrics.json`.
- `reports/validation-report.json`: bằng chứng validation máy đọc được.

## Nguồn, bản quyền và tính nguyên bản

Tên/số lượng theo Nghị quyết 1660/NQ-UBTVQH15; mã theo Quyết định 19/2025/QĐ-TTg. Geometry từ `thanglequoc/vietnamese-provinces-database` (MIT, license riêng của nguồn này không đổi). Xem [ATTRIBUTION.md](ATTRIBUTION.md), [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md), [docs/reference-analysis.md](docs/reference-analysis.md) và [docs/originality-report.md](docs/originality-report.md).

## Giấy phép

Repository này là **open source theo giấy phép MIT** (xem [LICENSE](LICENSE)): được phép dùng, sao chép, chỉnh sửa, hợp nhất, phát hành, phân phối, cấp phép lại và bán bản sao của phần mềm, miễn là giữ nguyên thông báo bản quyền.

Dự án từng có giai đoạn chuyển sang Source-Available Evaluation License rồi quay lại MIT — xem [LICENSE-HISTORY.md](LICENSE-HISTORY.md) để biết lịch sử. Dependency npm/Python và dữ liệu/ảnh bên thứ ba (OpenStreetMap, Sentinel-2, SRTM, `vietnamese-provinces-database`...) giữ nguyên license riêng của từng nguồn, không bị ảnh hưởng bởi giấy phép của repository này — xem [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) và [ATTRIBUTION.md](ATTRIBUTION.md). Tên/logo dự án được ghi chú riêng tại [TRADEMARKS.md](TRADEMARKS.md).

## Giới hạn và roadmap

Geometry là dữ liệu mở tham khảo, chưa được cơ quan địa chính chứng nhận. Dashboard đã có tìm kiếm không dấu theo tên/mã, danh sách 2D accessible đồng bộ selection, điều hướng bàn phím, reduced-motion, fallback WebGL, smoke test và visual regression Chromium desktop/mobile. Manifest gắn version nguồn GIS với ngày sinh artifact; CI kiểm tra dữ liệu và performance budget.

Các phần còn phụ thuộc môi trường ngoài repo: kiểm thử Safari/iOS và GPU thật; nhập số liệu vận hành chính thức có chủ sở hữu/provenance; runtime telemetry cần một dịch vụ thu thập và chính sách quyền riêng tư. TopoJSON/worker chỉ nên triển khai khi profiling cho thấy geometry/hit-test là nút thắt; hiện hit-test đã dùng bounding-box trước point-in-polygon và dữ liệu chỉ có 102 đơn vị.

Nền tảng dữ liệu (`src/data-platform/`) bọc các nguồn thật hiện có (chỉ tiêu tổng quan tỉnh, đường OSM, địa hình SRTM/Sentinel-2, đơn vị hành chính) vào một catalog có phân loại/provenance/policy đầy đủ, cộng thêm bảng "Nguồn dữ liệu" xem trực tiếp trên dashboard — xem [docs/data-platform-architecture.md](docs/data-platform-architecture.md). Adapter cho API công khai/API nội bộ có xác thực đã có sẵn dạng contract nhưng chưa gắn với nguồn thật nào; PMTiles thật cho bản đồ chi tiết, thống kê dân số/kinh tế quy mô lớn và profile triển khai "secure" vẫn là việc cần làm tiếp theo.

Bản đồ chi tiết (MapLibre) đã có đầy đủ: state/URL sync, provider abstraction, lazy-load, layer panel, đo khoảng cách, tìm kiếm local, xử lý lỗi/fallback, test đơn vị và E2E — nhưng **chưa có nguồn PMTiles đường/ranh giới thật, DEM địa hình, hay ảnh vệ tinh hợp pháp**; các lớp tương ứng và loại bản đồ Địa hình/Vệ tinh hiện disabled kèm giải thích rõ trên UI thay vì hiển thị dữ liệu giả. Chỉ đường (routing) và giao thông thời gian thực chưa triển khai vì cần backend riêng ngoài GitHub Pages. Xem [docs/detail-map-integration.md](docs/detail-map-integration.md) để biết quy trình xây PMTiles và checklist xác minh thủ công.

**Nền tảng điều hành dự án trọng điểm** (`src/entities/project/`, `src/features/executive-overview/`, `src/features/project-portfolio/`, `src/features/project-detail/`) đã qua **Phase 2A** (Executive Overview) và **Phase 2B1** (Danh mục dự án + Chi tiết dự án, hash routing — [ADR 0002](docs/adr/0002-static-host-routing.md)): domain model + validation + KPI + data-quality (Phase 1/1.5), Executive Overview, Danh mục dự án (tìm kiếm/lọc/sắp xếp) và Chi tiết dự án read-only đầy đủ (ngân sách, tiến độ, gói thầu, mốc, lịch sử tiến độ SVG, vướng mắc theo mức độ, vị trí, nguồn dữ liệu sống từ catalog thật) — tất cả đọc dữ liệu qua `ProjectPortfolioSource`/`BundledProjectPortfolioSource`, dùng **9 dự án dữ liệu minh họa deterministic**, không phải số liệu vận hành thật, không dùng cho quyết định quản lý thực tế. Chưa triển khai (Phase 2B2 trở đi): global command palette, tìm kiếm tự nhiên/cross-entity toàn cục (tìm kiếm cục bộ trong Danh mục dự án đã có), project pin/marker/clustering thật trên bản đồ (nút "Xem trên bản đồ" chỉ pan camera tới toạ độ, chưa có lớp riêng), API thật (repository/DTO/contract test — xem "API contract gate" trong [docs/domain-model.md](docs/domain-model.md)), permission/audit thật, authentication và workflow chỉnh sửa. Xem [ADR 0001](docs/adr/0001-project-centric-domain.md)/[ADR 0002](docs/adr/0002-static-host-routing.md) cho lộ trình đầy đủ.
