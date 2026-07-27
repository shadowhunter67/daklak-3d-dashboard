# Geometry contract — canonical project portfolio

Phase 3. Áp dụng cho `Project.geometry` và `ProjectIssue.relatedGeometry`
(`src/entities/project/types.ts`).

## Các loại geometry được hỗ trợ

```text
(không có geometry)   → project.geometry vắng mặt (optional) — dự án không có vị trí không gian cụ
                         thể, hoặc chưa xác định. KHÔNG dùng geometry giả (vd toạ độ trung tâm tỉnh)
                         để "lấp chỗ trống".
Point                 → dự án điểm (trường học, trạm y tế, nhà máy...).
LineString             → dự án tuyến (đường giao thông, đường điện, kênh mương). Thêm ở Phase 3 —
                         trước đó KHÔNG thể biểu diễn được (gap cấu trúc thật, không chỉ thiếu dữ
                         liệu mẫu).
Polygon                → dự án có ranh giới khu vực (khu công nghiệp, khu tái định cư...).
```

**Không hỗ trợ** `MultiPoint`/`MultiLineString`/`MultiPolygon`/`GeometryCollection` — chưa có use
case thật nào trong domain hiện tại (một dự án có nhiều điểm/tuyến rời rạc chưa xuất hiện trong dữ
liệu minh hoạ hay yêu cầu nghiệp vụ). Thêm các loại này khi có dự án thật cần chúng, không thêm
trước để "đủ bộ GeoJSON" — đúng nguyên tắc "không hỗ trợ mọi GeoJSON type nếu domain chưa cần".

## Geometry metadata — tách khỏi bản thân geometry

`Project.geometryMetadata?: ProjectGeometryMetadata` (Phase 3, additive, optional — chỉ có ý nghĩa
khi `geometry` có mặt):

```text
source        → 'surveyed' | 'design-drawing' | 'administrative-boundary-derived' |
                'approximate-manual' | 'unknown'
confidence     → tái dùng DataConfidence đã có ('verified'|'high'|'medium'|'low'|'unknown') —
                KHÔNG tạo enum "geometry confidence" riêng cho cùng một khái niệm.
approximate    → boolean.
legalStatusDisclaimer → bắt buộc CÓ NỘI DUNG khi approximate=true (validateProjectRecord chặn nếu
                thiếu). Không tự suy luận câu chữ này trong component — importer/fixture cung cấp
                text đã duyệt.
```

Vì sao KHÔNG lồng metadata vào bên trong `ProjectGeometry`: `project.geometry` phải giữ nguyên là
GeoJSON THUẦN — component render bản đồ (MapLibre) tiếp tục dùng trực tiếp làm GeoJSON mà không cần
bóc tách field lạ trước khi truyền vào MapLibre source. Field mô tả (không phải hình học) sống ở một
sibling field riêng.

## Không hiển thị approximate geometry như ranh giới pháp lý chính thức

Bất biến bắt buộc: khi `geometryMetadata.approximate === true`, UI (Phase 5, chưa triển khai trong
Phase 3) phải hiển thị `legalStatusDisclaimer` rõ ràng cạnh geometry — không vẽ ranh giới gần đúng
với cùng kiểu dáng/độ tin cậy thị giác như ranh giới hành chính chính thức (`daklak-wards.geojson`).
Phase 3 chỉ đảm bảo dữ liệu MANG được disclaimer này (type + validation); việc UI thực sự hiển thị nó
khác biệt trực quan là việc của Phase 5.

## Validation — 3 lớp

- **Layer 1 (JSON Schema, `data-templates/schemas/definitions/common.schema.json`)**: đúng shape
  GeoJSON (`type`/`coordinates` đúng cấu trúc), longitude ∈ [-180, 180], latitude ∈ [-90, 90],
  `LineString` có ≥ 2 điểm, `Polygon` ring có ≥ 4 điểm. Không parse `GeometryCollection` (không có
  định nghĩa nào cho nó trong schema — một bundle chứa `GeometryCollection` sẽ FAIL `oneOf` không
  khớp bất kỳ 3 loại nào).
- **Layer 2 (`isValidProjectGeometry`, `validateProject.ts`)**: cùng các ràng buộc trên (số hữu hạn,
  phạm vi toạ độ, ring khép kín cho Polygon, ≥ 2 điểm cho LineString) — chạy lại SAU khi đã map sang
  domain type, độc lập với JSON Schema (không phụ thuộc Ajv). `geometryMetadata` cũng được kiểm tra
  ở layer này (enum `source`/`confidence` hợp lệ, `legalStatusDisclaimer` bắt buộc khi
  `approximate: true`).
- **Layer 3**: không có rule cross-record riêng cho geometry trong phạm vi Phase 3 (không kiểm tra
  ví dụ "geometry có nằm trong ranh giới tỉnh Đắk Lắk không" — đó là một rule tiềm năng cho tương
  lai, chưa triển khai, cần một giới hạn an toàn về số lượng toạ độ/độ phức tạp nếu có importer thật
  ở Phase 4 xử lý file lớn).

## Ví dụ

Xem `data-templates/examples/representative-valid/project-portfolio-bundle.json`: một project point
(`geometryMetadata.source: 'surveyed'`, `approximate: false`) và một project LineString
(`geometryMetadata.source: 'approximate-manual'`, `approximate: true`, kèm
`legalStatusDisclaimer`). `data-templates/examples/invalid/invalid-geometry.json` minh hoạ toạ độ
ngoài phạm vi (fail cả Layer 1 lẫn Layer 2).
