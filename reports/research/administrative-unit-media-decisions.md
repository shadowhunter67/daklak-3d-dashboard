# Quyết định về ảnh xã/phường (xem bằng mắt)

Cập nhật 2026-10-25. Đã tải bản thu nhỏ 480 px của 42/45 ảnh ứng viên Commons (3 ảnh không tải được) bằng `scripts/research/download_unit_media_thumbs.mjs` và xem từng ảnh. Bản thu nhỏ chỉ nằm ở thư mục tạm, không vào repo.

## Kết quả

- **Không ảnh ứng viên Commons nào được đưa vào bản chạy thật.** Phần lớn là cảnh đường phố, đồng ruộng, ảnh sự kiện hoặc hiện vật bảo tàng: tên đơn vị có trong tiêu đề nhưng ảnh không đặc trưng cho đơn vị, hoặc chủ thể nằm ngoài địa bàn.
- Ví dụ loại: `Easo02/07.JPG` (xã Ea Sô, không phải Ea Kar), `Tháp Yang Prong` (nằm ở Ea Rốk, không phải Ea Súp), `Tuy Hòa` gán cho Hòa Phú, ảnh công ty Dakruco ở Cư Bao, hồ Đắk R'tih thuộc Đắk Nông, ảnh hiện vật bảo tàng ở Vân Hòa.
- Một ảnh đọc rõ được chủ thể (biển UBND phường Phú Yên) nhưng chỉ là ảnh biển hiệu; chưa tải về vì cần thêm dung lượng build và giá trị đại diện thấp.

## Cách đã dùng thay thế

Ảnh của **điểm đến du lịch đã xác minh** nằm trong ranh giới đơn vị (point-in-polygon) được dùng làm ảnh minh họa cho đơn vị đó, dùng lại file đã có trong `public/images/destinations/` (không thêm byte ảnh mới). Giao diện nói rõ đây là ảnh của một điểm đến trong địa bàn (gán theo tọa độ), không phải ảnh toàn cảnh của đơn vị, và hiện giấy phép + ghi công.

- 14/102 đơn vị có ảnh theo cách này: Liên Sơn Lắk (Hồ Lắk), Buôn Đôn (Yok Đôn), Ea Na (Đray Nur), Krông Bông (Krông Kmar), Hòa Xuân (Mũi Điện), Bình Kiến (Núi Chóp Chài), Tuy Hòa (Tháp Nhạn), Ea Rốk (Tháp Yang Prong), Ea Wer (Thác Bảy Nhánh), Ea Knốp (Ea Sô), Buôn Ma Thuột (Đình Lạc Giao), M'Đrắk (Thác Dray K'nao), Ô Loan (Đầm Ô Loan), Hòa Sơn (Đức Mẹ Giang Sơn).
- 88/102 đơn vị vẫn dùng hình dạng ranh giới GIS.

## Việc còn lại cần người

- Chụp hoặc xin ảnh có giấy phép cho 88 đơn vị còn lại (ảnh trung tâm hành chính, địa điểm đặc trưng).
- Xác nhận cách gán "xã chứa điểm đến" khi ranh giới đơn giản hóa làm điểm sát biên rơi sang đơn vị bên cạnh.
