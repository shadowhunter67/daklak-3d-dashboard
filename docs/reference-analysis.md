# Phân tích nguồn tham khảo

## Repo đã kiểm tra

1. `knight-L/sc-datav`, snapshot `c1aebf1…`, Apache-2.0. Quan sát cách một dashboard R3F tổ chức scene, extrusion, label, raycasting và chart. Chỉ dùng làm ý tưởng kỹ thuật; không copy layout, component, shader, animation, asset, tên hoặc cấu trúc thư mục.
2. `thanglequoc/vietnamese-provinces-database`, snapshot `1253e2ad…`, MIT. Dùng 102 tệp GeoJSON thuộc `66_dak_lak/wards` làm nguồn geometry và metadata. License đã được đọc tại repo.

## Kiến trúc độc lập

Project chọn pipeline GIS offline → artifacts tĩnh có contract nhỏ → scene component hóa theo domain → Zustand lưu interaction code-based → ECharts chỉ đọc metric map. Kiến trúc này tách việc topology nặng khỏi browser, cho phép validation tái lập, giảm coupling và tránh import bất kỳ source nào từ `references` vào runtime.

Thư viện chính thức: React, TypeScript, Vite, Three.js, React Three Fiber, Drei, d3-geo, Zustand, ECharts, GeoPandas, Shapely, PyProj và Fiona.

## Rủi ro và kiểm soát

- Dữ liệu GIS mở không đồng nghĩa với địa giới pháp lý: UI và README luôn có disclaimer.
- Dataset nguồn có thể đổi: khóa snapshot và ghi source summary.
- Tên pháp lý và geometry có thể lệch phiên bản: validation kiểm 102/88/14 và code; chưa tuyên bố độ chính xác địa chính.
- Derived outline/borders/labels vẫn chịu MIT attribution của nguồn.

Project chính không import source từ `references`; scripts chỉ đọc dữ liệu snapshot khi build GIS.
