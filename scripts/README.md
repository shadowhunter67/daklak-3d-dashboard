# GIS pipeline

`prepare_gis_source.py` reads `gis-source.json`, sparse-clones the pinned upstream commit into `.cache/gis-source/repository`, and validates a deterministic directory SHA-256. It reuses a valid cache without network access. Use `--offline` to forbid downloads and `--refresh` to replace the cache; `../references` is no longer used.

`python -m pip install -r scripts/requirements.txt`, sau đó chạy `npm run build:gis` và `npm run validate:data`.
Pipeline đọc snapshot MIT trong cache đã xác minh, chuẩn hóa EPSG:4326, sửa geometry, dissolve outline, tạo biên/label/metadata và báo cáo. Tất cả output được tái tạo deterministically; không phỏng đoán CRS ngầm.
