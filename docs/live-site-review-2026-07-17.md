# Live-site review — 2026-07-17

Kiểm tra thủ công trang GitHub Pages đang chạy (không phải build local) bằng chrome-devtools MCP:

`https://shadowhunter67.github.io/daklak-3d-dashboard/?view=3d&mode=overview`

Ảnh chụp lưu tại [`docs/images/live-site-review-2026-07-17/`](images/live-site-review-2026-07-17/).

## Các thao tác đã thực hiện và kết quả

| #   | Ảnh                                     | Thao tác                                   | Kết quả                                                                                                                                                                      |
| --- | --------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `01-overview.png`                       | Tải trang, tab Tổng quan (mặc định)        | Render đúng: 102 đơn vị, 88 xã/14 phường, GRDP +6.68%, panel "Chạm vào đại ngàn"                                                                                             |
| 2   | `02-list-2d.png`                        | Bấm "Mở danh sách 2D"                      | Chuyển `view=2d`, hiện bản đồ choropleth 2D + bảng 102 xã/phường có ô tìm kiếm, điều hướng bàn phím                                                                          |
| 3   | `03-list-2d-ward-selected.png`          | Click dòng "Buôn Ma Thuột" trong danh sách | URL thêm `ward=24133`, live region báo "Đang chọn Buôn Ma Thuột", đúng dòng được highlight                                                                                   |
| 4   | `04-3d-ward-profile.png`                | Bấm "Mở bản đồ 3D" (giữ ward đã chọn)      | Selection được giữ nguyên qua 2D→3D; panel hồ sơ hiện đúng dữ liệu: Phường, mã 24133, diện tích 71,99 km², dân số minh họa 30.703, tiếp cận dịch vụ 67.1%, tăng trưởng +3.4% |
| 5   | `05-energy-tab-selection-preserved.png` | Chuyển tab "Năng lượng"                    | Selection Buôn Ma Thuột **vẫn giữ nguyên** khi đổi data mode (đúng yêu cầu AGENTS.md); hiện 5 điểm năng lượng minh họa                                                       |
| 6   | `06-heatmap-tab.png`                    | Chuyển tab "Heatmap"                       | Selection vẫn giữ; hiện 20 điểm cường độ cao dạng heat blob, có badge "DỮ LIỆU MINH HỌA"                                                                                     |
| 7   | `07-roads-on-labels-hidden.png`         | Bấm "Hiện đường" + "Ẩn nhãn trung tâm"     | Lớp đường giao thông (quốc lộ/tỉnh lộ/đường huyện, viền cam-vàng) hiện đúng; nhãn Buôn Ma Thuột/Tuy Hoà ẩn đúng; nút đổi label tương ứng                                     |
| 8   | `08-rotate-360.png`                     | Bấm "Xoay bản đồ" (Xoay 360°), chờ 3s      | Camera thực sự xoay quanh bản đồ (góc nhìn đổi rõ rệt so với ảnh trước), nút chuyển thành "Dừng xoay"                                                                        |

## Vấn đề kỹ thuật phát hiện

1. **`THREE.Clock` deprecated** — console warning: _"THREE.Clock: This module has been deprecated. Please use THREE.Timer instead."_ Xuất hiện ổn định ở mọi lần tải. Không ảnh hưởng chức năng, nhưng nên thay bằng `THREE.Timer` khi rảnh để tránh cảnh báo bị loại bỏ ở bản Three.js tương lai.

2. **1 lỗi 404 xuất hiện ở lần tải đầu tiên** — console log ghi nhận `Failed to load resource: the server responded with a status of 404 ()` trong phiên mở đầu tiên. Khi tải lại trang y hệt (`?view=3d&mode=overview`) và kiểm tra toàn bộ network requests (JS, CSS, ảnh terrain), tất cả đều trả 200 — không tái hiện được lỗi 404 lần thứ hai. Nhiều khả năng là request favicon hoặc một asset phụ không thiết yếu, không lặp lại ổn định. Đáng để codex kiểm tra network tab kỹ hơn (ví dụ `/favicon.ico`) nhưng không phải lỗi chặn chức năng chính.

3. **Lưu ý về phương pháp test, không phải bug của app**: khi tôi click vào một dòng trong danh sách 2D bằng `uid` snapshot cũ (lấy từ trước một lần điều hướng trang), lựa chọn bị sai lệch (click "Buôn Ma Thuột" nhưng app chọn "Buôn Hồ", sau đó tự chuyển sang "Cư Pui" và reset về tab Tổng quan không rõ nguyên nhân). Khi lặp lại đúng quy trình — luôn lấy snapshot mới ngay trước khi click — hành vi hoàn toàn chính xác và ổn định (xem bước #3–#6 ở trên). Kết luận: đây là lỗi thao tác do dùng `uid` lỗi thời của công cụ automation, **không phải bug thực sự trong app**. Ghi lại để codex không mất thời gian điều tra nhầm hướng nếu thấy log cũ.

## Kết luận

Trang production hoạt động đúng như mô tả trong `AGENTS.md`/`README.md`: dữ liệu cấp tỉnh có nguồn (badge riêng), dữ liệu cấp xã/chuyên đề gắn nhãn "DỮ LIỆU MINH HỌA" rõ ràng, selection được bảo toàn qua các lần đổi data mode, đầy đủ nút điều khiển bàn phím/2D fallback. Không phát hiện lỗi chức năng nghiêm trọng — chỉ có 1 deprecation warning vô hại và 1 lỗi 404 không tái hiện được, cần theo dõi thêm nếu muốn dọn sạch console hoàn toàn.
