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

## Thử thêm: ảnh Commons có tọa độ nằm trong ranh giới (2026-10-25)

Script `scripts/research/geosearch_unit_media.mjs` tìm ảnh Commons có gắn tọa độ rơi đúng trong ranh giới từng đơn vị (point-in-polygon), giấy phép tự do; kết quả ở `reports/research/administrative-unit-geomedia.json` (55/102 đơn vị có ứng viên, 300 ảnh). Đã tải bản thu nhỏ của 94 ảnh cho các đơn vị chưa có ảnh và xem bằng mắt.

- Phần lớn là **ảnh chụp từ Trạm vũ trụ ISS** (tọa độ là vùng chụp, không đặc trưng cho đơn vị), ảnh thú/côn trùng, ảnh người (trẻ em, sự kiện USAID, lễ tốt nghiệp) hoặc ảnh quảng cáo. Không dùng.
- Chỉ có **Sân bay Buôn Ma Thuột** (nằm trong phường Tân Lập theo ranh giới) là địa điểm rõ ràng; chưa đưa vào vì không phải điểm đến du lịch và cần quyết định riêng về loại "công trình đặc trưng".
- Wikidata (hộp tọa độ quanh tỉnh có ảnh P18) chỉ trả về vài chục mục, đa số đã dùng hoặc thuộc Khánh Hòa; độ phủ của nguồn mở cho Đắk Lắk còn mỏng.

Kết luận: nguồn ảnh tự do chỉ phủ được khoảng 14–20 đơn vị. Muốn phủ 102 đơn vị cần ảnh từ cơ quan (UBND, Báo Đắk Lắk) có phép hoặc ảnh tự chụp.

## Kiểm kê ảnh trên trang thành phần xã/phường (2026-10-25)

Script `scripts/research/inventory_unit_sites.mjs` đọc danh mục chính thức <https://daklak.gov.vn/ubnd-cac-xa-phuong> (102 mục, 99 có liên kết) và liệt kê ảnh ở trang chủ từng xã/phường (tôn trọng robots.txt, giãn 1,5 giây): 64 trang mở được, 37 trang trả 404 (địa chỉ phụ khác với danh mục). Kết quả ở `reports/research/unit-site-image-inventory.json`. Đã tải 152 ảnh đầu của mỗi trang về thư mục tạm và xem bằng mắt.

- **Gần như toàn bộ là ảnh hội nghị, biểu ngữ, thông báo, mã QR, cờ, ảnh có người rõ mặt**, một số là ảnh do AI tạo. Không đặc trưng cho địa danh và vướng quyền hình ảnh cá nhân. Không dùng.
- Chỉ thấy vài ảnh cảnh quan, thường ở dải ảnh đầu trang: Hòa Thịnh (toàn cảnh hồ chứa), Hòa Mỹ (thác nước), Ea Ô (công trình tượng đài), Ea Kar (dải cảnh quan). Chưa tải vào ứng dụng vì chưa có phép bằng văn bản.
- Cả cổng tỉnh lẫn Báo Đắk Lắk chỉ ghi "ghi rõ nguồn khi sử dụng thông tin", không có giấy phép riêng cho ảnh.

Đã soạn thư xin phép ở `reports/research/permission-request-draft.md`. Việc cần người: duyệt và gửi thư; chỉ ra địa danh đặc trưng của từng xã/phường (hoặc ảnh tự chụp) vì trang chủ xã không cung cấp.
