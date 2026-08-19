# Đắk Lắk 3D Dashboard

[![quality](https://github.com/shadowhunter67/daklak-3d-dashboard/actions/workflows/quality.yml/badge.svg)](https://github.com/shadowhunter67/daklak-3d-dashboard/actions/workflows/quality.yml)
[![Deploy GitHub Pages](https://github.com/shadowhunter67/daklak-3d-dashboard/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/shadowhunter67/daklak-3d-dashboard/actions/workflows/deploy-pages.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

**Tiếng Việt** (chính) · [**English**](README.en.md)

Dashboard bản đồ 3D thể hiện 102 xã/phường của tỉnh Đắk Lắk sau sáp nhập năm 2025, kết hợp một nền tảng theo dõi các dự án đầu tư trọng điểm của tỉnh.

## Xem thử

[![Tổng quan điều hành — Đắk Lắk 3D Dashboard](docs/images/readme-gallery/executive-overview-desktop.png)](https://shadowhunter67.github.io/daklak-3d-dashboard/)

**Bản demo trực tuyến:** https://shadowhunter67.github.io/daklak-3d-dashboard/
**Khám phá Đắk Lắk 3D (bản xem trước):** https://shadowhunter67.github.io/daklak-3d-dashboard/?view=world

> **Lưu ý:** toàn bộ số liệu dự án/ngân sách/tiến độ hiển thị trong bản demo đều là **dữ liệu minh họa**, không phải số liệu vận hành hay số liệu chính thức của cơ quan nhà nước — chỉ để trình diễn giao diện. Ranh giới hành chính là dữ liệu mở tham khảo, không dùng cho mục đích pháp lý/quy hoạch.

## App có gì

- **Tổng quan điều hành** — trang mặc định, tổng hợp KPI danh mục dự án, cảnh báo, dự án cần chú ý.
- **Bản đồ 3D** — địa hình tỉnh dựng từ dữ liệu vệ tinh thật (SRTM + Sentinel-2), xoay/phóng được, click vào từng xã để xem hồ sơ nhanh.
- **Danh sách** — phiên bản 2D dễ dùng, phù hợp máy yếu, điều hướng bàn phím và trình đọc màn hình.
- **Bản đồ chi tiết** — bản đồ MapLibre, xem lớp đường giao thông, đo khoảng cách.
- **Khám phá** _(bản xem trước, minh họa)_ — bay qua địa hình tỉnh, bước đầu cho hướng phát triển bản đồ số du lịch.
- **Danh mục dự án** và **Chi tiết dự án** — xem đầy đủ ngân sách, tiến độ, gói thầu, vướng mắc của từng dự án.
- Giao diện có cả **tiếng Việt và tiếng Anh**, chuyển đổi ngay không cần tải lại trang.

## Chạy thử trên máy

Cần Node.js 22.

```bash
npm ci
npm run dev
```

Muốn build thử bản production hoặc chạy kiểm tra chất lượng code, xem [CONTRIBUTING.md](CONTRIBUTING.md).

## Một vài ảnh minh họa

<p align="center">
  <img src="docs/images/readme-gallery/dashboard-3d-overview.png" alt="Bản đồ 3D Đắk Lắk hiển thị đầy đủ nhãn hành chính 102 xã/phường trên nền địa hình vệ tinh" width="49%">
  <img src="docs/images/readme-gallery/project-portfolio-desktop.png" alt="Danh mục dự án trọng điểm với bộ lọc trạng thái/lĩnh vực và bảng dự án" width="49%">
</p>
<p align="center">
  <img src="docs/images/readme-gallery/executive-overview-mobile.png" alt="Tổng quan điều hành trên điện thoại, các thẻ KPI xếp thành lưới không tràn ngang" width="49%">
  <img src="docs/images/readme-gallery/dashboard-2d-administrative-labels.png" alt="Bản đồ 2D hành chính với nhãn xã/phường tiếng Việt có dấu" width="49%">
</p>

## Giấy phép

Mã nguồn dùng giấy phép **MIT** — xem [LICENSE](LICENSE). Dữ liệu/ảnh bên thứ ba (OpenStreetMap, Sentinel-2, SRTM...) giữ nguyên giấy phép riêng — xem [ATTRIBUTION.md](ATTRIBUTION.md).

## Muốn tìm hiểu sâu hơn?

Tài liệu kỹ thuật chi tiết (kiến trúc hệ thống, pipeline dữ liệu, các quyết định thiết kế...) nằm trong thư mục [`docs/`](docs/). Vài điểm bắt đầu hữu ích:

- [Kiến trúc hệ thống](docs/architecture.md)
- [Nguồn gốc và kiểm định dữ liệu](docs/data-provenance.md)
- [Hiệu năng và ngân sách](docs/performance.md)
- [Khả năng tiếp cận](docs/accessibility.md)
- [Hướng dẫn đóng góp](CONTRIBUTING.md) và [chính sách bảo mật](SECURITY.md)
- [English documentation](README.en.md)
