# Báo cáo tính nguyên bản

Tự triển khai: kiến trúc frontend, nhận diện thị giác, layout responsive, projection adapter, chuyển Polygon/MultiPolygon/hole sang Three Shape, terrain grid displacement, pipeline tạo height/normal/hillshade/mask từ DEM, mesh interaction, state store, tooltip/detail, labels, dashboard, mock metric generator, pipeline dissolve/border/label/metadata và validation.

Không có mã reused/adapted từ repo tham khảo. Các thư viện bên thứ ba chỉ được dùng qua public API. Geometry và derived artifacts dùng nguồn `thanglequoc/vietnamese-provinces-database` MIT; nguồn/phạm vi/file tương ứng được ghi trong `ATTRIBUTION.md`.

Khác biệt chính so với `sc-datav`: kiến trúc domain-first, palette bazan–cà phê–duyên hải, bố cục editorial bất đối xứng, dữ liệu Đắk Lắk 2025, pipeline GIS có validation và tương tác join bằng mã. Không copy hàng loạt component, shader, asset, animation hoặc layout.
