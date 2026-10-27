# Báo cáo cuối V4 — hardening

Cập nhật 2026-10-27. Mọi con số lấy từ dữ liệu và lần chạy thật.

## Trạng thái: READY WITH KNOWN LIMITATIONS (có điều kiện)

Các hạng mục P0, P1 và phần lớn P2 đã làm, có kiểm thử và nguồn. Trạng thái này chỉ áp dụng cho phần đã
làm; các giới hạn bên dưới vẫn còn nguyên và **không được coi là sản phẩm sẵn sàng vận hành**:
thiếu ranh giới quy hoạch chính thức, thiếu dữ liệu vận hành dự án chính thức, thiếu số liệu du lịch,
ảnh xã/phường mới 14/102, nhãn 3D và bản đồ chi tiết chưa kiểm trên GPU thật, chưa thử với người dùng thật.

## Đã sửa

| Hạng mục                             | Thay đổi                                                                                                                                                                                                                                         | PR   |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---- |
| Nhãn bản đồ Tổng quan (P0)           | Cỡ nhãn 11 → 15 đơn vị, viewBox ôm trọn mọi nhãn (không cắt mép), bộ bố trí thêm bán kính dịch; e2e đo **visible rate** (102/102) và **readable rate** (cỡ chữ vẽ ≥ 9px và không chồng; ≥ 95% trên desktop), 0 cặp chồng ở desktop, mobile và A+ | #232 |
| Tách hai loại "Dự án" (P0)           | Thanh bên: "Theo dõi dự án — Dữ liệu minh họa" và "Thu hút đầu tư — 201 dự án có nguồn"; số 201 có test khớp dữ liệu                                                                                                                             | #232 |
| Trợ năng (P0)                        | e2e cho 7 trang chính ở cỡ chữ A+, phóng 200% và bàn phím; **phát hiện và sửa lỗi thật**: liên kết "Bỏ qua tới nội dung" đẩy người dùng ra khỏi các trang hash-route                                                                             | #232 |
| Hàng chờ Việc cần xử lý (P1)         | Tổng quan có từng dự án: loại vấn đề, ưu tiên theo loại, vốn nếu có, nguồn, địa bàn; chủ trách nhiệm và hạn xử lý ghi "Chưa có dữ liệu"                                                                                                          | #233 |
| Dữ liệu & nguồn hai chế độ (P1)      | Mặc định Đơn giản (Đã có nguồn / Cần xác minh / Thiếu nguồn / Dữ liệu cần cập nhật + độ phủ ảnh); Kỹ thuật mở bảng nguồn, cảnh báo, truy xuất                                                                                                    | #233 |
| Báo cáo V2 (P1)                      | Xu hướng (chưa có lịch sử → ghi rõ, không vẽ giả), điểm nghẽn (chỉ Quy hoạch có số), vốn liên quan tới dự án có vấn đề (không gọi là tác động kinh tế), so sánh lĩnh vực / xã-phường                                                             | #235 |
| Thứ bậc thông tin theo góc nhìn (P1) | Mỗi góc nhìn quyết định thêm nhãn phụ; tên 102 xã/phường luôn bật                                                                                                                                                                                | #234 |
| Du lịch liên kết (P2)                | Điểm đến → địa bàn → dự án → quy hoạch → cơ hội đầu tư; hạ tầng tiếp cận: Chưa có dữ liệu                                                                                                                                                        | #236 |
| Quy hoạch thận trọng (P2)            | Bảng thuật ngữ và thẻ "Chưa có ranh giới chính thức"; test chặn "vi phạm / không phù hợp quy hoạch"                                                                                                                                              | #237 |
| Media pipeline (P2)                  | `MediaItem`, thumbnail WebP, `ResponsiveImage`, script sinh thumbnail, `docs/media-pipeline.md`                                                                                                                                                  | #238 |

## Đã kiểm chứng

- Unit: 2.002 ca pass (210 file). Lint, format, typecheck, build, `check:budget`, `validate:public-build` đều pass.
- e2e (desktop-chromium, mobile-chromium, desktop-webkit trên CI): nhãn, góc nhìn, hàng chờ, Dữ liệu & nguồn, Báo cáo V2, du lịch, quy hoạch, media, trợ năng A+/200%/bàn phím; axe sáng/tối không vi phạm serious/critical.
- Ảnh chụp: `reports/ui-review/v4/`.
- Ngân sách (đã đo, từng lần nâng có lý do trong `scripts/check_build_budget.mjs`): JS 3.540.000, gzip 976.000, build 23.225.000 byte (đo sau khi gộp toàn bộ V4: 3.539.381 / 973.620 / 23.214.711). Phần tăng lớn nhất là 25 thumbnail WebP (≈ 0,33 MB); phần còn lại là mã mới ở các route đã tách lazy.

## Chưa giải quyết (nói thẳng)

1. **Ảnh xã/phường 14 → 30 không đạt**: nguồn ảnh tự do chỉ phủ khoảng 14–20 đơn vị (đã xem 94 + 42 ảnh ứng viên, không thêm được); ảnh từ báo/UBND cần giấy phép (thư xin phép đã soạn, chưa gửi). Không lấy ảnh không rõ quyền.
2. **Nhãn 3D và bản đồ chi tiết MapLibre** chưa kiểm chứng: Chrome không GPU nên vị trí chiếu 3D không đo được, nhãn MapLibre vẽ trên canvas. Chỉ bản đồ định vị ở Tổng quan được đo trong trình duyệt thật. Cần quy trình thủ công trên máy có GPU và lưu ảnh chụp. Trên mobile bản đồ định vị vẫn nhỏ (cỡ chữ vẽ ≈ 9–10px); người dùng dùng danh sách xã/phường thay thế.
3. **Chưa có ranh giới quy hoạch chính thức**: không có công cụ đối chiếu vị trí dự án với quy hoạch; chủ ý chưa xây "planning conflict engine".
4. **Chưa có dữ liệu vận hành dự án chính thức**: chủ đầu tư, giải ngân, chủ trách nhiệm, hạn xử lý, số ngày tồn tại, lịch sử theo tháng (nên Xu hướng ghi "Chưa có dữ liệu lịch sử").
5. **Số liệu du lịch**: không có lượt khách; hạ tầng tiếp cận chưa có dữ liệu liên kết.
6. **Số hiệu văn bản quy hoạch** trích bằng biểu thức chính quy, chưa đối chiếu với bản gốc; 4 nhóm vốn trong Quyết định 1985 lệch tổng so với tiêu đề.
7. **Chưa thử với người dùng thật** (người lớn tuổi, cán bộ); mới kiểm bằng axe, e2e và ảnh chụp.
8. **Đổi tên thương hiệu** ("Đắk Lắk Spatial Intelligence") chưa làm vì tránh rủi ro hồi quy; sidebar vẫn ghi "ĐẮK LẮK 3D".
9. **Kiểm thử trực quan Windows** (4 ca so ảnh nền) vẫn lệch cục bộ; CI Linux là nguồn chuẩn.
10. Một số thành phần cũ trong store (lối vào "wards" của bản đồ) không còn ai gọi tới, chưa dọn.

## Việc tiếp theo đề xuất

- Gửi thư xin phép ảnh (`reports/research/permission-request-draft.md`) và nhập danh sách địa danh đặc trưng theo xã/phường do người địa phương cung cấp.
- Kiểm nhãn 3D và MapLibre trên máy có GPU; lưu ảnh chụp vào `reports/ui-review/v4/gpu/`.
- Xin dữ liệu vận hành (chủ đầu tư, tiến độ, giải ngân) và ranh giới quy hoạch chính thức từ cơ quan có thẩm quyền trước khi mở rộng Báo cáo/Quy hoạch.
