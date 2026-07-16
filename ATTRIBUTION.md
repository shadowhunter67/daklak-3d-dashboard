# Attribution

## Surface imagery

Terrain surface imagery uses [Sentinel-2 cloudless](https://s2maps.eu/) by
[EOX IT Services GmbH](https://eox.at/) (contains modified Copernicus Sentinel
data 2016), licensed under CC BY-SA 4.0.

## Dữ liệu hành chính và GIS

- **Geometry, tên, mã, diện tích:** [thanglequoc/vietnamese-provinces-database](https://github.com/thanglequoc/vietnamese-provinces-database), snapshot `1253e2ad7933bcc59a5b68a03a81b532cd939e3e` ngày 12/07/2026, MIT License, © 2021 Thang Le Quoc. Các output trong `src/assets/maps/daklak/` là dữ liệu đã lọc/chuẩn hóa/derived từ nguồn này.
- **Tên và số lượng pháp lý:** Nghị quyết 1660/NQ-UBTVQH15 ngày 16/06/2025.
- **Mã đơn vị:** Quyết định 19/2025/QĐ-TTg, hiệu lực 01/07/2025.
- **Địa hình:** Mapzen Terrain Tiles trên AWS Open Data, tại Việt Nam chủ yếu từ NASA SRTM. Các texture `daklak-terrain-*` là sản phẩm dẫn xuất do dự án tự crop, chuẩn hóa, tạo normal/hillshade và mask. Truy cập tháng 07/2026.

Không có source code, asset, shader hoặc component nào được copy từ `sc-datav`. Repo đó chỉ được đọc để khảo sát các khái niệm phổ biến về extrusion, projection và interaction.
