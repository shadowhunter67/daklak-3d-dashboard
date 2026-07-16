# GIS pipeline

`python -m pip install -r scripts/requirements.txt`, sau đó chạy `npm run build:gis` và `npm run validate:data`.
Pipeline đọc snapshot MIT trong `../references`, chuẩn hóa EPSG:4326, sửa geometry, dissolve outline, tạo biên/label/metadata và báo cáo. Tất cả output được tái tạo deterministically; không tải hoặc phỏng đoán CRS ngầm.
