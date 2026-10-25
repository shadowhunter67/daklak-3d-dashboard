# Kiểm kê dữ liệu Du lịch và Quy hoạch (V3)

Cập nhật 2026-10-24. Con số lấy từ dữ liệu trong repo tại thời điểm này, không lấy từ mockup.

## Du lịch

- 28 điểm đến đã xác minh nguồn (`verifiedTourismDestinations.ts`), 6 loại hình: hồ, vườn quốc gia, thác nước, làng văn hóa, công trình/di tích, danh thắng thiên nhiên.
- 25/28 có ảnh giấy phép tự do lưu cục bộ; 3 điểm chưa có ảnh nên giao diện ghi "Chưa có ảnh giấy phép tự do".
- 17 xã/phường có ít nhất một điểm đến. Quan hệ điểm → đơn vị được **suy ra** bằng point-in-polygon trên ranh giới đã đơn giản hóa và luôn gắn nhãn "suy ra". Điểm nằm ngoài mọi ranh giới thì để trống, không chọn đơn vị gần nhất.
- Không có: lượt khách, doanh thu, giờ mở cửa, giá vé, chỉ số hạ tầng du lịch. Không điền số nào cho các trường này.

## Quy hoạch

- Nguồn duy nhất là ô "quyết định quy hoạch" trong danh mục kèm Quyết định 1985/QĐ-UBND. Script `scripts/research/extract_planning_citations.mjs` trích số hiệu văn bản bằng biểu thức chính quy.
- Kết quả: 118 văn bản, 187 dự án có trích dẫn, 14 dự án không nêu số hiệu nào (một dự án để trống ô), 5 dự án mà chính ô nguồn nêu còn thiếu (ví dụ "chưa có quy hoạch phân khu").
- Giới hạn của việc trích:
  - Cơ quan ban hành chỉ suy từ hậu tố số hiệu. UBND không phân biệt được cấp tỉnh hay huyện nên giao diện ghi "UBND (tỉnh hoặc cấp huyện)".
  - Ngày chỉ có khi nằm ngay sau số hiệu; còn lại ghi "Nguồn không nêu".
  - Số hiệu viết sai trong nguồn (`945/DQQ-UBND`) được chuẩn hóa về `945/QĐ-UBND` và giao diện ghi thêm dòng "nguồn ghi: 945/DQQ-UBND" để không che dấu vết; số hiệu viết liền (`2791/QĐUBND`) cũng được nhận và ghi tương tự. Ngày được nhận cả khi có dấu phẩy trước "ngày".
  - Cờ "cần rà soát" chỉ gắn cho câu nêu thiếu ở chính ô quy hoạch ("chưa có quy hoạch…", "Quy hoạch … (chưa đủ)", "chưa có Nghị quyết"). "Cần rà soát quy hoạch" nghĩa là ô nguồn tự nêu thiếu, không phải kết luận xung đột hay vi phạm pháp lý.
- Việc cần người: đối chiếu từng số hiệu với văn bản gốc trước khi dùng cho quyết định pháp lý.
