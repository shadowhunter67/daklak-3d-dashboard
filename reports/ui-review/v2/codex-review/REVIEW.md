# Rà soát giao diện chung với Codex (2026-10-21)

Phương pháp: chụp 12 màn hình desktop (1366×768) và 3 màn điện thoại (500 px) từ bản production dựng từ `main`; gửi ảnh cho Codex qua cầu nối (3 lượt, cùng một phiên) và tự xem từng ảnh. Không nhận xét nào được áp dụng nếu mình không tự thấy trên ảnh hoặc đo được trong trình duyệt.

## Đã xác nhận và đã sửa

| #   | Phát hiện                                                                                                                                                    | Ai thấy                                                              | Sửa                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 1   | Nút "Xem/Ẩn bằng chứng" và "Xem chi tiết": chữ tối trên nền xanh đậm (quy tắc theme sáng `:root[data-theme="light"] .project-portfolio button` đè chữ trắng) | cả hai                                                               | ép chữ trắng bằng selector đủ mạnh; đo lại `color = rgb(255,255,255)`            |
| 2   | Khi một thẻ mở bằng chứng, các thẻ cạnh nó bị kéo dãn thành khoảng trống lớn                                                                                 | mình                                                                 | `align-items: start`                                                             |
| 3   | Chip trạng thái bóp tiêu đề thẻ xuống 4–6 dòng; mã dự án bị bẻ giữa "DL-/2026-…"                                                                             | cả hai                                                               | chip lên hàng riêng, mã dự án một dòng                                           |
| 4   | Bảng "Dự án cần chú ý" ở Tổng quan: cột tên 5–8 dòng, chip bị cắt mép                                                                                        | cả hai                                                               | cột tên ≥ 200 px, ẩn cột "Lĩnh vực" dưới 1500 px (hàng 59–79 px thay vì ~200 px) |
| 5   | Dòng meta Tổng quan lẫn cỡ chữ (13 px và 16 px)                                                                                                              | mình                                                                 | đồng nhất 15–16 px                                                               |
| 6   | Báo cáo: 5 thẻ KPI xếp 4 + 1 lẻ                                                                                                                              | mình                                                                 | lưới tự co, 5 thẻ một hàng                                                       |
| 7   | Báo cáo định dạng "35.1%" (dấu chấm) trong khi Tổng quan "34,2%"                                                                                             | mình                                                                 | dùng `formatPercent` theo ngôn ngữ (test mới, viết trước)                        |
| 8   | Liên kết trong thẻ màu xanh/tím mặc định của trình duyệt                                                                                                     | cả hai                                                               | theo màu giao diện                                                               |
| 9   | "Xem chi tiết →" bị ngắt mũi tên xuống dòng                                                                                                                  | mình                                                                 | `white-space: nowrap`                                                            |
| 10  | Thanh chân trang cố định có thể che nội dung cuối trang                                                                                                      | Codex (đã kiểm: Tổng quan đã có đệm 64 px, các trang khác chưa chắc) | đệm đáy 64 px cho mọi trang                                                      |

## Nhận xét của Codex KHÔNG áp dụng

- "Đầu trang Dự án bị cắt, người dùng khó biết mình ở đâu": do chính ảnh chụp đã cuộn xuống, không phải lỗi.
- "Tiêu đề dự án quá dài, nên rút gọn": tên là dữ liệu gốc; rút gọn che mất thông tin.
- "Gom cỡ chữ/sáng-tối/trợ giúp vào Cài đặt": cỡ chữ A-/A/A+ để ngoài thanh đầu là chủ ý cho người lớn tuổi.
- "Bảng và bản đồ cạnh tranh chú ý ở trang Bản đồ": bố cục theo mẫu thiết kế đã chốt; đã có nút "Ẩn danh sách".
- "Tăng chữ chính lên 18–20 px, tối thiểu 16 px cho mọi chữ phụ": đúng hướng nhưng ảnh hưởng toàn bộ hệ thống token; ghi vào việc còn lại.

## Còn mở (chưa làm)

- Bộ lọc trên điện thoại chiếm gần cả màn hình trước khi thấy danh sách dự án (nên thu gọn kiểu accordion).
- Tám thẻ KPI ở Tổng quan cùng nổi bật như nhau, chưa có thứ bậc ưu tiên (cảnh báo nên đứng trước).
- Chữ phụ 12–13 px ở một số nơi (breadcrumb, chú thích thẻ, chân trang) dưới ngưỡng 16 px của gói yêu cầu.
- Bản đồ 3D: không xác minh được trong trình duyệt tự động (cần GPU thật).
- Nhãn 2D còn vài chỗ chạm nhau ở vùng đông dân.
