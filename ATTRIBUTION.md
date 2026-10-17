# Attribution

## Surface imagery

Terrain surface imagery uses [Sentinel-2 cloudless](https://s2maps.eu/) by
[EOX IT Services GmbH](https://eox.at/) (contains modified Copernicus Sentinel
data 2016), licensed under CC BY-SA 4.0.

## Dữ liệu hành chính và GIS

- **Geometry, tên, mã, diện tích:** [thanglequoc/vietnamese-provinces-database](https://github.com/thanglequoc/vietnamese-provinces-database), snapshot `1253e2ad7933bcc59a5b68a03a81b532cd939e3e` ngày 12/07/2026, MIT License, © 2021 Thang Le Quoc. Các output trong `src/assets/maps/daklak/` là dữ liệu đã lọc/chuẩn hóa/derived từ nguồn này.
- **Tên và số lượng pháp lý:** Nghị quyết 1660/NQ-UBTVQH15 ngày 16/06/2025.
- **Mã đơn vị:** Quyết định 19/2025/QĐ-TTg, hiệu lực 01/07/2025.
- **Dân số 2025 và số thôn/buôn/tổ dân phố/khu phố:** [Danh sách đơn vị hành chính thuộc tỉnh Đắk Lắk](https://vi.wikipedia.org/w/index.php?title=Danh_s%C3%A1ch_%C4%91%C6%A1n_v%E1%BB%8B_h%C3%A0nh_ch%C3%ADnh_thu%E1%BB%99c_t%E1%BB%89nh_%C4%90%E1%BA%AFk_L%E1%BA%AFk&oldid=75567164) (Wikipedia tiếng Việt, bản sửa đổi 75567164, CC BY-SA 4.0; bảng trích văn bản 2896/BNV-CQĐP của Bộ Nội vụ). Dữ liệu dẫn xuất `daklak-unit-profile.json` do `scripts/build_unit_profiles.py` tạo và được chia sẻ theo cùng giấy phép CC BY-SA 4.0.
- **Địa hình:** Mapzen Terrain Tiles trên AWS Open Data, tại Việt Nam chủ yếu từ NASA SRTM. Các texture `daklak-terrain-*` là sản phẩm dẫn xuất do dự án tự crop, chuẩn hóa, tạo normal/hillshade và mask. Truy cập tháng 07/2026.

Không có source code, asset, shader hoặc component nào được copy từ `sc-datav`. Repo đó chỉ được đọc để khảo sát các khái niệm phổ biến về extrusion, projection và interaction.
