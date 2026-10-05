# Destination diorama (`#/diorama/:id`)

Cảnh 3D **minh hoạ** cho từng điểm đến trong `src/entities/tourism/verifiedTourismDestinations.ts` (27 điểm). Vào bằng hash route `#/diorama/<destinationId>` (xem `src/routing/hashRoute.ts`); trong panel có ô chọn để chuyển sang điểm đến khác. Route này render thay cho các view query-based, giống Portfolio/Detail; mỗi nhóm cảnh là một chunk lazy riêng nên không vào bundle chính.

## Nguyên tắc: không đánh lừa về độ chính xác

Diorama KHÔNG phải mô hình đo đạc. Mỗi cảnh có badge "ILLUSTRATIVE" và một dòng nói rõ cơ sở dựng (`DIORAMA_BASIS` trong `dioramaConfig.ts`):

- `photo` — dựng theo ảnh thực tế đã xác minh giấy phép tự do và dẫn link trong dữ liệu điểm đến (`imageUrl`);
- `text` — chỉ dựng theo mô tả văn bản của nguồn, **chưa đối chiếu được ảnh thực tế**; hình dạng chỉ là gợi ý chung, có thể khác thực tế.

Test `dioramaRegistry.test.ts` giữ hai bất biến: có đúng một scene cho mỗi điểm đến, và `photo` ⇔ điểm đến có `imageUrl` + `imageLicense`. Bài học gốc: bản Krông Kmar đầu tiên dựng theo chữ là sai hẳn (thác bậc thang, trong khi thật là sông đá + đập thấp) cho tới khi có ảnh.

Ảnh chỉ được **liên kết** tới trang file Wikimedia Commons, không nhúng: CSP `img-src` trong `index.html` chỉ cho cùng domain, và bundle ảnh sẽ làm phình build.

## Cấu trúc mã (`src/features/destination-diorama/`)

| File                                       | Vai trò                                                                                                                                                               |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DestinationDioramaView.tsx`               | Shell: fallback WebGL, badge, panel (mô tả, nguồn, ảnh, cơ sở dựng, preset camera, chọn điểm đến), mất/khôi phục context                                              |
| `dioramaRegistry.ts`                       | id điểm đến → scene (lazy, theo nhóm)                                                                                                                                 |
| `dioramaConfig.ts`                         | `DIORAMA_BASIS`, kiểu camera, `SkySpec`/`SunSpec`                                                                                                                     |
| `dioramaKit.tsx`                           | `DioramaCanvas` (Canvas + ánh sáng + trời + camera + giảm chuyển động), `Heightfield`, `Instances`, `Forest`, `WaterSheet`, `FallingWater`, `Mist`                    |
| `dioramaProps.tsx`                         | Khối dựng: voi, nhà dài Ê Đê, đình ngói, tháp Chăm, cột bazan, tượng, cầu gỗ, thuyền, cọ, cột ăng-ten                                                                 |
| `dioramaTerrain.ts` / `dioramaGeometry.ts` | Hàm thuần có test: nhiễu, địa hình thung lũng/ven bờ, rải cây, đá granit vỡ, normal map sóng nước                                                                     |
| `scenes/waterfalls.tsx`                    | Thác bậc (Đray Nur, Gia Long, Thủy Tiên, Đray K'nao), ghềnh/sông (Bảy Nhánh, Ea Sô, Yok Đôn)                                                                          |
| `scenes/waters.tsx`                        | Hồ Lắk, Đầm Ô Loan, Vịnh Xuân Đài, Vũng Rô, Gành Đá Đĩa, Mũi Điện                                                                                                     |
| `scenes/landmarks.tsx`                     | Núi Chóp Chài, Núi Đá Bia, Cao nguyên Vân Hòa                                                                                                                         |
| `scenes/structures.tsx`                    | Tháp Nhạn, Tháp Yang Prong, Buôn Đôn, Buôn Akõ Dhông, Đình Lạc Giao, Bảo tàng Đắk Lắk, Nhà đày Buôn Ma Thuột, Làng cà phê Trung Nguyên, Đức Mẹ Giang Sơn, Cầu Ông Cọp |
| `KrongKmarScene.tsx`                       | Thác Krông Kmar (cảnh đầu tiên, có Canvas riêng)                                                                                                                      |

## Ràng buộc đã giữ

- Giữ loading, WebGL fallback và xử lý mất context (`DioramaCanvas` + `DestinationDioramaView`).
- Tôn trọng `prefers-reduced-motion`: `frameloop="demand"`, nước không cuộn, sương đứng yên, camera nhảy thẳng tới góc nhìn.
- Điều khiển camera là nút thật (Toàn cảnh / Cận cảnh / Trên cao) và ô chọn có nhãn, dùng được bằng bàn phím; bóng đổ tắt trên máy yếu theo cờ `contactShadows` của `graphicsQuality`.
- Kỹ thuật tạo đá (đá chôn một phần, tô màu đỉnh, mặt cắt phẳng) điều chỉnh từ skill [3dviz-pro-max](https://github.com/viettranx/3dviz-pro-max) (MIT); catalog của skill không có recipe thác/đình/tháp nên phần còn lại viết tay.

## Thêm một điểm đến mới

1. Thêm điểm vào `verifiedTourismDestinations.ts` (đủ nguồn toạ độ theo `reports/tourism-digital-twin/phase-status.md`).
2. Dựng scene (thông số cho một nhóm hiện có, hoặc cảnh mới) và đăng ký trong `dioramaRegistry.ts`.
3. Khai báo `photo`/`text` trong `DIORAMA_BASIS` — chỉ `photo` khi đã dựa vào ảnh dẫn trong dữ liệu.
