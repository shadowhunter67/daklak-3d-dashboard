# Thuyết minh "Make in Viet Nam" — Đắk Lắk 3D Dashboard

Tài liệu này gom các bằng chứng phục vụ hồ sơ Giải thưởng "Sản phẩm Công nghệ số
Make in Viet Nam", hạng mục **Sản phẩm công nghệ số tiềm năng xuất sắc**. Nội dung
tổng hợp từ các tài liệu kỹ thuật đã có trong `docs/` — mỗi mục dưới đây trỏ tới
nguồn gốc để đối chiếu, không phải tuyên bố marketing mới.

> Số liệu vận hành thực tế (đơn vị đang dùng, số tài khoản, văn bản nghiệm thu) do
> đơn vị chủ quản điền khi nộp hồ sơ — tài liệu này chỉ khẳng định phần **kỹ thuật
> và tính nguyên bản** có thể kiểm chứng trực tiếp trên mã nguồn.

---

## 1. Tính sáng tạo và độc đáo

- **Digital twin 102 xã/phường Đắk Lắk sau sáp nhập đơn vị hành chính 2025**, dựng
  từ dữ liệu vệ tinh mở thật (SRTM cho địa hình, Sentinel-2 cho ảnh nền) — không
  dùng ảnh minh hoạ. Pipeline GIS offline: chuẩn hoá về EPSG:4326, sửa lỗi hình
  học, đơn giản hoá cho render, sinh geometry/borders/outline/nhãn/metric/texture
  địa hình + bằng chứng kiểm định máy đọc được. Trình duyệt không bao giờ tự xử lý
  không gian. Xem [architecture.md](architecture.md), [data-provenance.md](data-provenance.md).
- **"102-label engine":** hiển thị đầy đủ tên cả 102 xã/phường ở mọi mức zoom,
  không viết tắt; khi nhãn chồng nhau thì dịch nhãn ra và nối về vị trí thật bằng
  đường dẫn mảnh (leader line) thay vì ẩn nhãn — thuật toán đặt nhãn ưu tiên +
  tránh va chạm (`src/components/detail-map/wardLabelPlacement.ts`,
  `src/components/map/administrativeLabelLayout.ts`).
- **Executive Status Hero** — bảng trạng thái toàn danh mục (Ổn định / Cần chú ý /
  Nghiêm trọng) đọc hiểu trong ~5 giây, kèm badge glyph (không chỉ dựa màu) và
  breakdown tái dùng KPI có sẵn (không bịa số mới).
- **Không phụ thuộc Google Maps Platform:** dùng MapLibre GL JS + PMTiles tự host,
  không API key, không phát sinh cước theo lượt xem. Trừu tượng `DetailedMapProvider`
  để store và nghiệp vụ không phụ thuộc trực tiếp instance `maplibre-gl`. Xem
  [detail-map-integration.md](detail-map-integration.md).
- So sánh tính nguyên bản với sản phẩm tham khảo: [originality-report.md](originality-report.md).

## 2. Công nghệ, chất lượng sản phẩm

### 2.1. Kiến trúc & công nghệ làm chủ

| Lớp           | Công nghệ                                                                                                                                             | Ghi chú                                                                                         |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Giao diện     | React + Vite (site tĩnh), TypeScript                                                                                                                  | Không backend runtime; 3 trải nghiệm loại trừ nhau (Tổng quan điều hành / 3D / bản đồ chi tiết) |
| 3D            | React Three Fiber (Three.js)                                                                                                                          | Lazy — chỉ tải khi mở view 3D; có context-loss monitor + khôi phục                              |
| Bản đồ        | MapLibre GL JS + PMTiles/vector tiles tự host                                                                                                         | Google-Maps-Platform-free by design                                                             |
| Trạng thái    | Zustand                                                                                                                                               | Đồng bộ state chia sẻ được qua query-string, không cần router                                   |
| Dữ liệu dự án | Lớp `ProjectPortfolioSource` (adapter) + read-model thuần (`buildExecutiveOverview`, `buildProjectPortfolioViewModel`, `buildProjectDetailViewModel`) | Component không tự tính nghiệp vụ; xem [domain-model.md](domain-model.md)                       |
| GIS           | Pipeline offline (Node) chuẩn hoá / sửa / đơn giản hoá / sinh artifact + validation                                                                   | [data-platform-architecture.md](data-platform-architecture.md)                                  |

Toàn bộ các lớp trên do đội phát triển tự viết. Thư viện bên thứ ba chỉ dùng qua
public API, không copy/adapt mã nguồn. Chi tiết ranh giới tự-viết vs. thư viện:
[originality-report.md](originality-report.md); giấy phép & nguồn dữ liệu bên thứ ba:
[../ATTRIBUTION.md](../ATTRIBUTION.md), [../THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md).

### 2.2. Tiêu chuẩn kỹ thuật áp dụng

- **Tiếp cận (accessibility):** hướng tới WCAG 2.x mức AA (body text đạt tương phản
  ≥ 7:1 — vượt ngưỡng AAA); kiểm thử tự động `axe` qua Playwright trên 3D / 2D /
  Tổng quan điều hành, Chromium desktop + mobile + WebKit, fail khi có vi phạm
  serious/critical; checklist kiểm thử thủ công trước phát hành. Xem
  [accessibility.md](accessibility.md). Chưa xác định được TCVN/QCVN riêng cho
  truy cập thông tin website tại thời điểm viết tài liệu này — nếu sau này xác
  nhận có quy chuẩn áp dụng được, nên đối chiếu và ghi rõ số hiệu ở đây thay vì
  chỉ dựa WCAG quốc tế.
- **Dữ liệu địa lý:** hệ toạ độ EPSG:4326 (WGS 84); định dạng GeoJSON; vector tiles
  đóng gói PMTiles (đặc tả mở). Ranh giới hành chính từ nguồn mở
  `thanglequoc/vietnamese-provinces-database` (MIT).
- **Xuất dữ liệu:** CSV theo RFC 4180 (escaping, BOM UTF-8, CRLF để Excel Windows
  đọc đúng tiếng Việt có dấu).
- **Chất lượng mã:** cổng chất lượng CI (`quality.yml`) gồm lint, format, typecheck,
  unit test, kiểm định GIS (Python), build, **ngân sách hiệu năng có gate**, ranh
  giới build public/nội bộ, quét bí mật, dependency audit, E2E production
  (Playwright). Xem [testing-strategy.md](testing-strategy.md), [performance.md](performance.md).

### 2.3. An toàn, bảo mật, quản trị dữ liệu

- Tách biên giới build **public / nội bộ**: bản public không bao giờ đóng gói dữ
  liệu nội bộ/mật; có bước CI kiểm tra ranh giới ở cả mã nguồn và artifact `dist`.
  Xem [security-architecture.md](security-architecture.md),
  [data-classification.md](data-classification.md), [data-governance.md](data-governance.md).
- Site tĩnh, không telemetry phía máy chủ; lỗi runtime chỉ hiển thị cục bộ. Thêm
  giám sát ngoài là quyết định về quyền riêng tư, cố tình để ngoài repo.
- `build-info.json` ghi version, commit nguồn, thời gian build UTC, commit nguồn
  GIS đã ghim, snapshot dataset — truy vết được toàn bộ artifact, không cần backend,
  không lộ bí mật.
- **Lưu trữ & xử lý dữ liệu:** bản đồ nền tự host, không gọi dịch vụ bản đồ
  nước ngoài lúc chạy — điều này đúng ở mọi profile build. Nền tảng quy hoạch
  tích hợp (`iocqh.vnptdaklak.vn`) là hạ tầng VNPT trong nước.
  **Bản public đang chạy thật hiện tại được lưu trên GitHub Pages** (static
  hosting nước ngoài, không có backend/credential) — xem badge "Deploy GitHub
  Pages" ở README. Hạ tầng nội bộ do VNPT vận hành trong nước là **profile
  `secure`**: interface đã có trong code nhưng build/CI/hosting riêng cho
  profile này **chưa được dựng** — xem
  [deployment-profiles.md](deployment-profiles.md) mục "chỉ `public` được
  build và triển khai hôm nay". Muốn có claim "lưu trữ tại VN" đúng nghĩa cho
  bản đang chạy thật, cần hoàn thành việc dựng profile `secure` trước.
  Xem thêm [internal-data-integration.md](internal-data-integration.md).

## 3. Công đoạn cốt lõi do người Việt Nam nghiên cứu, phát triển, thực hiện

- **Toàn bộ mã nguồn sản phẩm** (frontend, pipeline GIS, label engine, projection
  adapter, read-model nghiệp vụ, kiểm định dữ liệu) do đội phát triển người Việt
  Nam tự viết. Không có mã reused/adapted từ repo tham khảo — xem
  [originality-report.md](originality-report.md).
- **Kiến trúc quyết định thiết kế** ghi lại công khai trong `docs/adr/` (11 ADR):
  domain-first, static-host routing, i18n, ingestion dữ liệu công khai, hợp đồng
  dữ liệu danh mục dự án chuẩn tắc, chiến lược fail-closed khi dữ liệu chưa sẵn
  sàng…
- **Dữ liệu:** ranh giới hành chính từ nguồn mở có giấy phép; địa hình/ảnh nền từ
  SRTM/Sentinel-2 (dữ liệu mở); pipeline xử lý và bằng chứng kiểm định do đội tự
  xây. Không phụ thuộc API dữ liệu bản đồ thương mại nước ngoài.
- **Tài liệu chứng minh cho hồ sơ:** Giấy chứng nhận đăng ký quyền tác giả phần
  mềm — _đơn vị chủ quản nộp đơn đăng ký; bổ sung số/ngày cấp khi có._

## 4. Tính năng sản phẩm (dễ dùng, tương thích, tuỳ biến, mở rộng)

- **Song ngữ Việt/Anh**, chuyển đổi ngay không tải lại trang; lựa chọn phản ánh
  trong URL chia sẻ được và ghi nhớ qua `localStorage`; Back/Forward hoàn tác đúng
  lần đổi ngôn ngữ gần nhất. Audit tĩnh trong `npm test` chặn build nếu có chuỗi
  tiếng Việt hard-code ngoài từ điển dịch. Xem [adr/0003-internationalization.md](adr/0003-internationalization.md).
- **Thiết kế ưu tiên tiếp cận:** cỡ chữ lớn cho người lớn tuổi / thị lực kém; nút
  A− / A / A+ trên thanh tiêu đề (ghi nhớ giữa các lần truy cập, áp đồng bộ toàn
  giao diện); trạng thái luôn kèm nhãn chữ, không chỉ dựa màu; số tiền lớn hiển
  thị "… tỷ ₫" kèm số chính xác trong tooltip và nhãn trình đọc màn hình.
- **Điều hướng bàn phím + trình đọc màn hình** đầy đủ; bản 2D dùng được trên máy
  yếu và là fallback khi không hỗ trợ WebGL.
- **Xuất CSV** danh mục dự án đang hiển thị (đã áp bộ lọc) để phân tích lại bằng
  Excel/Sheets.
- **Kiến trúc nhân rộng:** projection adapter + pipeline GIS tham số hoá theo
  nguồn dữ liệu → có thể dựng cho tỉnh/thành khác mà không sửa lõi.

## 5. Tính cấp thiết của bài toán tại Việt Nam

Sau sáp nhập đơn vị hành chính 2025, dữ liệu ranh giới / địa hình / quy hoạch /
tiến độ dự án đầu tư công phân tán ở nhiều nguồn, khó tổng hợp phục vụ điều hành.
Lãnh đạo tỉnh cần công cụ trực quan, tức thời để nắm tình hình danh mục dự án
(ngân sách, tiến độ, giải ngân, vướng mắc) và bối cảnh không gian của từng dự án.
Sản phẩm số hoá đúng bài toán này, dùng dữ liệu thật, chạy trên hạ tầng trong
nước.

## 6. Mô hình, chiến lược và quy mô thị trường

- **Thị trường:** 34 tỉnh/thành có nhu cầu giám sát đầu tư công + digital twin
  hành chính tương tự; ngành xây dựng / kế hoạch đầu tư / văn phòng UBND cấp tỉnh.
- **Kênh triển khai:** VNPT có mạng lưới đơn vị địa phương toàn quốc.
- **Mô hình:** triển khai theo hình thức đầu tư công / thuê dịch vụ CNTT của cơ
  quan nhà nước; phần digital twin phục vụ thêm xúc tiến đầu tư và quảng bá du lịch.

## 7. Tác động, khả năng mở rộng

- **Tác động:** minh bạch hoá tiến độ và giải ngân dự án đầu tư trọng điểm; rút
  ngắn thời gian tổng hợp báo cáo điều hành; hỗ trợ ra quyết định bằng bối cảnh
  không gian.
- **Mở rộng trong nước:** nhân rộng cho tỉnh/thành khác qua pipeline tham số hoá.
- **Quốc tế:** sản phẩm quản trị công nội địa — ưu tiên thấp; phần công nghệ nền
  (label engine, pipeline GIS offline, digital twin từ dữ liệu vệ tinh mở) có thể
  đóng gói lại cho bài toán tương tự ở nước khác.

---

## Phụ lục — checklist tài liệu chứng minh cần đính kèm hồ sơ

- [ ] Giấy chứng nhận đăng ký quyền tác giả phần mềm (hoặc biên nhận đã nộp đơn).
- [ ] Văn bản giao nhiệm vụ / hợp đồng / biên bản nghiệm thu / xác nhận sử dụng của đơn vị.
- [ ] Ảnh chụp bản triển khai thật (dữ liệu thật, không phải bản demo GitHub Pages).
- [ ] Danh sách đội ngũ phát triển (người Việt Nam).
- [ ] Báo cáo kết quả kiểm thử (CI `quality.yml`, số liệu hiệu năng thực đo).
- [ ] Xác nhận hạ tầng lưu trữ/vận hành đặt tại Việt Nam.
