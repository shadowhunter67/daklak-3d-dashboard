# Đắk Lắk 3D Dashboard

[![quality](https://github.com/shadowhunter67/daklak-3d-dashboard/actions/workflows/quality.yml/badge.svg)](https://github.com/shadowhunter67/daklak-3d-dashboard/actions/workflows/quality.yml)
[![Deploy GitHub Pages](https://github.com/shadowhunter67/daklak-3d-dashboard/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/shadowhunter67/daklak-3d-dashboard/actions/workflows/deploy-pages.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

**Tiếng Việt** (chính) · [**English**](README.en.md)

Dashboard bản đồ 3D thể hiện 102 xã/phường của tỉnh Đắk Lắk sau sáp nhập năm 2025, kết hợp một nền tảng theo dõi các dự án đầu tư trọng điểm của tỉnh.

## Xem thử

[![Tổng quan điều hành — Đắk Lắk 3D Dashboard](docs/images/readme-gallery/executive-overview-desktop.png)](https://shadowhunter67.github.io/daklak-3d-dashboard/)

**Bản demo trực tuyến:** https://shadowhunter67.github.io/daklak-3d-dashboard/
**Khám phá Đắk Lắk 3D (bản xem trước, tạm ẩn khỏi menu chính — vào thẳng qua link):** https://shadowhunter67.github.io/daklak-3d-dashboard/?view=world

> **Lưu ý:** toàn bộ số liệu dự án/ngân sách/tiến độ hiển thị trong bản demo đều là **dữ liệu minh họa**, không phải số liệu vận hành hay số liệu chính thức của cơ quan nhà nước — chỉ để trình diễn giao diện. Ranh giới hành chính là dữ liệu mở tham khảo, không dùng cho mục đích pháp lý/quy hoạch.

## App có gì

- **Tổng quan điều hành** — trang mặc định. Panel **Executive Status Hero** ngay đầu trang cho biết tình hình tổng thể (Ổn định/Cần chú ý/Nghiêm trọng) và số dự án cần xử lý chỉ trong vài giây, không cần đọc bảng số liệu. Bên dưới là KPI danh mục dự án, cảnh báo ("Cần xử lý", đã diễn giải sang tiếng Việt/Anh dễ hiểu thay vì mã lỗi kỹ thuật), dự án cần chú ý, và biểu đồ phân bố trạng thái dự án (mỗi trạng thái một màu riêng biệt). Tỷ lệ giải ngân có thêm mũi tên xu hướng so với 30 ngày trước, dựng từ lịch sử tiến độ thật của từng dự án — không hiển thị nếu chưa đủ dự án có dữ liệu lịch sử để so sánh đáng tin cậy.
- **Bản đồ 3D** — địa hình tỉnh dựng từ dữ liệu vệ tinh thật (SRTM + Sentinel-2), xoay/phóng được, click vào từng xã để xem hồ sơ nhanh.
- **Danh sách** — phiên bản 2D dễ dùng, phù hợp máy yếu, điều hướng bàn phím và trình đọc màn hình.
- **Bản đồ chi tiết** — bản đồ MapLibre, xem lớp đường giao thông, đo khoảng cách. Tên cả 102 xã/phường **luôn hiển thị đầy đủ, không viết tắt**; khi nhãn chồng nhau thì được dịch ra và nối về vị trí thật bằng một đường dẫn mảnh thay vì bị ẩn đi. Bảng điều khiển lớp bản đồ chia hai mức **Cơ bản** (5 lớp chính: ranh giới, tên xã/phường, đường, dự án, quy hoạch) và **Nâng cao** (thêm tên đường/địa danh/công trình, chỉ số dashboard, và lớp **Heatmap** hiển thị số liệu thật 0–100 ngay trên biểu đồ thay vì chỉ có trong dữ liệu ẩn).
- **Khám phá** _(nền địa hình minh họa, dữ liệu điểm đến là thật, tạm dừng phát triển — chỉ vào được qua link trực tiếp, không còn trên menu chính)_ — đi bộ hoặc bay tự do trên địa hình tỉnh (bám địa hình thật qua CPU terrain sampler), xem 4 điểm đến du lịch đã xác minh nguồn (Hồ Lắk, Yok Đôn, Đray Nur, Buôn Đôn), teleport nhanh, và 3 tuyến tham quan có hướng dẫn. Xem [docs/world-exploration.md](docs/world-exploration.md).
- **Danh mục dự án** và **Chi tiết dự án** — xem đầy đủ ngân sách, tiến độ, gói thầu, vướng mắc của từng dự án. Danh mục có nút **Xuất CSV** tải về đúng danh sách dự án đang hiển thị (đã áp bộ lọc), phục vụ phân tích lại bằng Excel/Sheets.
- Giao diện có cả **tiếng Việt và tiếng Anh**, chuyển đổi ngay không cần tải lại trang.
- **Thiết kế ưu tiên dễ đọc** — cỡ chữ lớn cho người lớn tuổi/thị lực kém, nút chỉnh cỡ chữ **A− / A / A+** ngay trên thanh tiêu đề (lựa chọn được ghi nhớ giữa các lần truy cập, áp dụng đồng bộ cho toàn bộ giao diện kể cả các nhãn nhỏ trước đây bị bỏ sót), trạng thái luôn kèm nhãn chữ chứ không chỉ dựa vào màu. Xem [docs/accessibility.md](docs/accessibility.md).

### Đang tiếp tục hoàn thiện

Phần dưới đây đang hoặc sẽ được làm tiếp, chưa xong:

- **Phân cấp nhãn bản đồ** (map label hierarchy) — đã có cho riêng tên xã/phường (ưu tiên + tránh chồng nhãn khi phóng to/thu nhỏ); còn thiếu là phân cấp **giữa nhiều loại nhãn cùng lúc** (tên xã, tên đường, địa danh, marker dự án) khi người dùng bật đồng thời nhiều lớp ở chế độ Nâng cao.
- **Provenance passport đầy đủ** — hồ sơ nguồn gốc dữ liệu chi tiết hơn cho từng số liệu hiển thị (đang có ở mức cơ bản, xem [docs/data-provenance.md](docs/data-provenance.md)).
- **Thu thập thêm dữ liệu công khai thật** — mở rộng danh mục dự án/số liệu vượt ra ngoài dữ liệu minh họa hiện tại.
- **Làm lại sâu hơn Danh mục dự án / Chi tiết dự án** — cùng đợt audit UI/UX đã áp dụng cho Tổng quan điều hành.

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
  <img src="docs/images/readme-gallery/dashboard-2d-administrative-labels.png" alt="Bản đồ chi tiết hiển thị đầy đủ tên 102 xã/phường, nhãn chồng nhau được dịch ra thay vì ẩn đi" width="49%">
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
