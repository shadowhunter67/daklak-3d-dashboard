# Phương pháp nghiên cứu dữ liệu dự án thật

Cập nhật: 2026-10-18. Mọi số liệu/ảnh trong mockup UI chỉ là minh hoạ; bộ dữ liệu này chỉ lấy từ nguồn dưới đây.

## Nguyên tắc

1. Nguồn chính thống (văn bản pháp lý, ấn phẩm cơ quan nhà nước) thắng báo chí; báo chí chỉ để tìm hướng.
2. Không bịa: trường không có trong nguồn thì để trống ("Chưa có dữ liệu"). Không có tiến độ, giải ngân, nhà đầu tư cho bất kỳ dự án nào trong bộ này.
3. Vị trí: chỉ biết xã/phường → `administrative-centroid`. Địa danh không khớp chính xác tên đơn vị hành chính thì KHÔNG gán mã, chỉ ghi chú.
4. Mỗi quan sát có `sourceId`, `observedAt` (ngày văn bản), `status`. Xung đột được giữ lại, không ghi đè.

## Quy trình tái tạo (tất định)

1. `docs/data-sources/evidence/1985-qd-ubnd/extract_1985.py` tải lại 5 phụ lục PDF của Quyết định 1985/QĐ-UBND và trích bảng bằng PyMuPDF (PDF gốc không commit — ADR 0004 mục 5).
2. `node scripts/research/build_researched_projects.mjs` dựng `reports/research/researched-projects.json` (bản đọc được) và `public/data/researched-projects.json.gz` (bản chạy, ~10 KB).
3. `src/entities/researched-project/researchedDataset.test.ts` chạy validator trên bản chạy với mã đơn vị thật từ `daklak-labels.json`.

## Kiểm tra chéo đã làm

- Số dòng từng nhóm so với số ghi trong tiêu đề nhóm của văn bản (xem README của thư mục bằng chứng): khớp, trừ 2 nhóm lệch 1 dòng do chính văn bản đếm sai.
- Tổng vốn từng nhóm so với con số ghi trong tiêu đề nhóm: 12/17 nhóm khớp tuyệt đối; 5 nhóm lệch — xem `data-conflicts.md`.
- Tên đơn vị hành chính khớp nguyên tên (không khớp chuỗi con) với 102 nhãn; bảng alias duy nhất: `BMT → Buôn Ma Thuột` (viết tắt trong chính văn bản).

## Giới hạn

- Phụ lục 3 trên cổng UBND trùng byte với phụ lục 2 (nguồn đăng nhầm): một lĩnh vực chưa có trong bộ.
- Bộ này là DANH MỤC THU HÚT ĐẦU TƯ 2026–2030: vốn là DỰ KIẾN, chưa có chủ trương đầu tư/nhà đầu tư. UI phải gọi đúng là "Thu hút đầu tư", không phải "đang triển khai".
- Cổng `daklak.gov.vn` không truy cập được từ công cụ tìm kiếm của phiên này (lỗi xác minh tên miền), nên chưa thể trích dẫn trực tiếp các tin của cổng chính; các dự án đang triển khai (ví dụ cao tốc Khánh Hòa – Buôn Ma Thuột) nằm ở `unverified-candidates.md`.
- Chính sách tái phân phối của tên miền `vpubnd.daklak.gov.vn` chưa xác nhận (xem `usageNotes` của từng nguồn); cần owner duyệt trước khi xuất bản diện rộng.
