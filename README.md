# Đắk Lắk 3D Dashboard

[![quality](https://github.com/shadowhunter67/daklak-3d-dashboard/actions/workflows/quality.yml/badge.svg)](https://github.com/shadowhunter67/daklak-3d-dashboard/actions/workflows/quality.yml)
[![Deploy GitHub Pages](https://github.com/shadowhunter67/daklak-3d-dashboard/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/shadowhunter67/daklak-3d-dashboard/actions/workflows/deploy-pages.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

Dashboard WebGL thể hiện 102 xã/phường của tỉnh Đắk Lắk sau sắp xếp năm 2025, từ cao nguyên Đắk Lắk cũ đến duyên hải Phú Yên cũ. Bản đồ sử dụng một bề mặt địa hình displacement từ SRTM, phủ ảnh Sentinel-2 và xác định đơn vị hành chính bằng hit-test polygon để hỗ trợ hover, click, selected state, hồ sơ nhanh và các lớp dữ liệu chuyên đề.

## Demo

[![Đắk Lắk 3D Dashboard](docs/images/dashboard-demo.png)](https://shadowhunter67.github.io/daklak-3d-dashboard/)

**Live demo:** https://shadowhunter67.github.io/daklak-3d-dashboard/

> **Disclaimer:** sản phẩm trực quan tham khảo, không dùng cho đất đai, đo đạc, quy hoạch pháp lý hoặc xác lập địa giới chính thức. Số liệu dashboard là mock data deterministic, không phải thống kê nhà nước.

## Screenshots

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

> Dữ liệu cấp xã và các lớp chuyên đề (dân số, năng lượng, heatmap) là **dữ liệu minh họa** có seed cố định, không phải số liệu vận hành thời gian thực. Lớp đường giao thông lấy từ **OpenStreetMap, giấy phép ODbL 1.0**. Bản đồ không phải hồ sơ hành chính hoặc tài liệu pháp lý chính thức — geometry là dữ liệu mở tham khảo, chưa được cơ quan địa chính chứng nhận.

## Stack và kiến trúc

React 19, TypeScript strict, Vite, Three.js/React Three Fiber, Drei, D3 Geo, Zustand và ECharts. GIS được xử lý offline bằng GeoPandas/Shapely/PyProj/Fiona; trình duyệt chỉ parse file tĩnh và dựng geometry.

Luồng dữ liệu: snapshot MIT → chuẩn hóa/repair EPSG:4326 → GeoJSON + outline + borders + labels + metadata → DEM/ảnh bề mặt tiền xử lý → D3 projection → Three.js displacement terrain → polygon hit-test + Zustand → dashboard.

Phần bản đồ được tách theo trách nhiệm: bề mặt terrain, các overlay heatmap/selection, nhãn và điểm năng lượng, camera controls, cấu hình terrain và hit-test hình học. Hover được giới hạn theo animation frame và lọc bounding box trước khi chạy point-in-polygon.

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

Playwright chạy smoke test trên Chromium desktop, Chromium mobile (Pixel 7) và WebKit desktop (Desktop Safari). Visual regression chỉ dùng Chromium desktop/mobile để tránh nhiễu rasterization giữa engine. Chỉ dùng `npm run test:e2e:update` khi thay đổi giao diện là có chủ đích và cần cập nhật ảnh baseline.

Hoặc chạy toàn bộ bằng `npm run quality`. Ngân sách build được lưu tại `reports/performance-budget.json` và chặn tăng trưởng ngoài ý muốn của JavaScript/texture trong CI.

Dashboard đồng bộ `view`, `mode` và `ward` vào query string để URL có thể chia sẻ, refresh và dùng Back/Forward mà không cần router. `npm run build:metrics` sinh [JSON](reports/build-metrics.json) và [bảng Markdown](reports/build-metrics.md) từ build thật; FPS, GPU memory và LCP không được tuyên bố vì CI không đại diện cho GPU thiết bị thật.

Mỗi production build sinh `dist/build-info.json` gồm version ứng dụng, commit SHA, thời điểm build và phiên bản dataset. Trên site đã deploy, mở `/daklak-3d-dashboard/build-info.json` để đối chiếu release đang chạy.

## Tài liệu kỹ thuật

- [Kiến trúc](docs/architecture.md)
- [Nguồn gốc và kiểm định dữ liệu](docs/data-provenance.md)
- [Chiến lược kiểm thử](docs/testing-strategy.md)
- [Hiệu năng và ngân sách](docs/performance.md)
- [Khả năng tiếp cận](docs/accessibility.md)
- [Vận hành production](docs/operations.md)
- [Benchmark thiết bị thật](docs/device-benchmark.md)
- [Chính sách bảo mật](SECURITY.md) và [hướng dẫn đóng góp](CONTRIBUTING.md)

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

Tên/số lượng theo Nghị quyết 1660/NQ-UBTVQH15; mã theo Quyết định 19/2025/QĐ-TTg. Geometry từ `thanglequoc/vietnamese-provinces-database` (MIT). Xem [ATTRIBUTION.md](ATTRIBUTION.md), [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md), [docs/reference-analysis.md](docs/reference-analysis.md) và [docs/originality-report.md](docs/originality-report.md).

## Giới hạn và roadmap

Geometry là dữ liệu mở tham khảo, chưa được cơ quan địa chính chứng nhận. Dashboard đã có tìm kiếm không dấu theo tên/mã, danh sách 2D accessible đồng bộ selection, điều hướng bàn phím, reduced-motion, fallback WebGL, smoke test và visual regression Chromium desktop/mobile. Manifest gắn version nguồn GIS với ngày sinh artifact; CI kiểm tra dữ liệu và performance budget.

Các phần còn phụ thuộc môi trường ngoài repo: kiểm thử Safari/iOS và GPU thật; nhập số liệu vận hành chính thức có chủ sở hữu/provenance; runtime telemetry cần một dịch vụ thu thập và chính sách quyền riêng tư. TopoJSON/worker chỉ nên triển khai khi profiling cho thấy geometry/hit-test là nút thắt; hiện hit-test đã dùng bounding-box trước point-in-polygon và dữ liệu chỉ có 102 đơn vị.
