# Destination diorama (`#/diorama/:id`)

Cảnh 3D **minh hoạ** cho từng điểm đến trong `src/entities/tourism/verifiedTourismDestinations.ts` (27 điểm). Vào bằng hash route `#/diorama/<destinationId>` (xem `src/routing/hashRoute.ts`); trong panel có ô chọn để chuyển sang điểm đến khác. Route này render thay cho các view query-based, giống Portfolio/Detail; mỗi nhóm cảnh là một chunk lazy riêng nên không vào bundle chính.

## Nguyên tắc: không đánh lừa về độ chính xác

Diorama KHÔNG phải mô hình đo đạc. Mỗi cảnh có badge "ILLUSTRATIVE" và một dòng nói rõ cơ sở dựng (`DIORAMA_BASIS` trong `dioramaConfig.ts`):

- `photo` — dựng theo ảnh thực tế đã xác minh giấy phép tự do và dẫn link trong dữ liệu điểm đến (`imageUrl`);
- `text` — chỉ dựng theo mô tả văn bản của nguồn, **chưa đối chiếu được ảnh thực tế**; hình dạng chỉ là gợi ý chung, có thể khác thực tế.

Test `dioramaRegistry.test.ts` giữ hai bất biến: có đúng một scene cho mỗi điểm đến, và `photo` chỉ khi điểm đến có `imageUrl` + `imageLicense` (ngược lại không bắt buộc: một điểm có thể có ảnh đối chiếu mà cảnh vẫn `text`). Bài học gốc: bản Krông Kmar đầu tiên dựng theo chữ là sai hẳn (thác bậc thang, trong khi thật là sông đá + đập thấp) cho tới khi có ảnh.

**Sáu cảnh chỉnh theo ảnh + nguồn chữ bổ sung (2026-10-07)** — Thác Gia Long (thác rộng nước đục nâu, cầu treo dây, kè đá chắn lũ), Đray K'nao (ghềnh đá tảng, cây đa rễ bám đá), Nhà đày Buôn Ma Thuột (dãy nhà ocher, ba cửa vòm xanh, mái ngói nâu; tường bao + tháp canh bốn góc lấy từ mô tả di tích vì ảnh không thấy), Buôn Akõ Dhông (ao, chòi mái tranh, lối ván cọc), Núi Đá Bia (sườn núi dài, tảng đá dựng đứng, đường quốc lộ), Buôn Đôn (voi có yên gỗ + người quản tượng). Một ảnh chỉ cho một góc nhìn nên phần bị che (mặt sau, bố cục tổng thể) được bổ sung từ mô tả chữ trong các trang di tích/du lịch; chi tiết đó là suy luận, không phải đo đạc. Chúng đã đổi sang `photo`, nhưng vẫn chỉ mang tính minh họa.

**Ảnh thật hiện ngay cạnh cảnh** (góc phải trên panel, bấm để phóng to) cho 24/27 điểm đến, để so trực tiếp: bản nén ≤ 640 px (JPEG progressive, ~35–100 KB) chép vào `public/images/destinations/<id>.jpg` — cùng origin nên hợp CSP `img-src 'self'`; ảnh gốc là Wikimedia Commons (CC BY-SA/CC BY), tác giả, giấy phép và link trang file hiện ngay dưới ảnh. Tải lười (`loading="lazy"`), không nằm trong chunk JS nào. Cảnh `text` có ảnh đối chiếu nói rõ "cảnh chưa được chỉnh theo ảnh này nên có thể khác thực tế"; điểm chưa có ảnh tự do (Cao nguyên Vân Hòa, Cầu Ông Cọp, Thác Thủy Tiên) chỉ ghi "chưa đối chiếu được ảnh thực tế". `dioramaPhotos.test.ts` giữ file ↔ dữ liệu khớp hai chiều và mỗi file ≤ 130 KB.

## Cấu trúc mã (`src/features/destination-diorama/`)

| File                                        | Vai trò                                                                                                                                                                                                                                                                                         |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DestinationDioramaView.tsx`                | Shell: fallback WebGL, badge, panel (mô tả, nguồn, ảnh, cơ sở dựng, preset camera, chọn điểm đến), mất/khôi phục context                                                                                                                                                                        |
| `dioramaRegistry.ts`                        | id điểm đến → scene (lazy, theo nhóm)                                                                                                                                                                                                                                                           |
| `dioramaConfig.ts`                          | `DIORAMA_BASIS`, kiểu camera, `SkySpec`/`SunSpec`                                                                                                                                                                                                                                               |
| `dioramaKit.tsx`                            | `DioramaCanvas` (Canvas + ánh sáng + trời + camera + giảm chuyển động), `Heightfield`, `Instances`, `Forest`, `WaterSheet`, `FallingWater`, `Mist`                                                                                                                                              |
| `dioramaMaterials.ts`                       | Chi tiết bề mặt sinh bằng shader (không texture ngoài): vân và sọc ẩm cho đá, tán lá có lỗ + AO giả, nhiễu đất. Bọt nước ven bờ (`ShoreFoam` trong kit) chỉ dùng ở cảnh ven biển/hồ vì cần bờ có độ dốc                                                                                         |
| `dioramaCover.ts` / `dioramaCoverLayer.tsx` | Lớp phủ mặt đất tạo mật độ chi tiết: cỏ có gió (lá cỏ instanced, ~26.000 lá ở máy mạnh, giảm theo cấu hình máy), lau sậy ven nước, bụi, hoa dại, thân cây đổ, hạt bụi lơ lửng. Vị trí theo độ cao/độ dốc địa hình (`coverPlacements`), cảnh khai báo vùng loại trừ (sân lát, lối đi, lòng sông) |
| `dioramaPost.tsx`                           | Bloom nhẹ (EffectComposer + MSAA), chỉ bật ở cấu hình cao và khi không giảm chuyển động                                                                                                                                                                                                         |
| `dioramaProps.tsx`                          | Khối dựng: voi, nhà dài Ê Đê, đình ngói, tháp Chăm, cột bazan, tượng, cầu gỗ, thuyền, cọ, cột ăng-ten                                                                                                                                                                                           |
| `dioramaTerrain.ts` / `dioramaGeometry.ts`  | Hàm thuần có test: nhiễu, địa hình thung lũng/ven bờ, rải cây, đá granit vỡ, normal map sóng nước                                                                                                                                                                                               |
| `scenes/waterfalls.tsx`                     | Thác bậc (Đray Nur, Gia Long, Thủy Tiên, Đray K'nao), ghềnh/sông (Bảy Nhánh, Ea Sô, Yok Đôn)                                                                                                                                                                                                    |
| `scenes/waters.tsx`                         | Hồ Lắk, Đầm Ô Loan, Vịnh Xuân Đài, Vũng Rô, Gành Đá Đĩa, Mũi Điện                                                                                                                                                                                                                               |
| `scenes/landmarks.tsx`                      | Núi Chóp Chài, Núi Đá Bia, Cao nguyên Vân Hòa                                                                                                                                                                                                                                                   |
| `scenes/structures.tsx`                     | Tháp Nhạn, Tháp Yang Prong, Buôn Đôn, Buôn Akõ Dhông, Đình Lạc Giao, Bảo tàng Đắk Lắk, Nhà đày Buôn Ma Thuột, Làng cà phê Trung Nguyên, Đức Mẹ Giang Sơn, Cầu Ông Cọp                                                                                                                           |
| `KrongKmarScene.tsx`                        | Thác Krông Kmar (cảnh đầu tiên, có Canvas riêng)                                                                                                                                                                                                                                                |

## Ràng buộc đã giữ

- Giữ loading, WebGL fallback và xử lý mất context (`DioramaCanvas` + `DestinationDioramaView`).
- Tôn trọng `prefers-reduced-motion`: `frameloop="demand"`, nước không cuộn, sương đứng yên, camera nhảy thẳng tới góc nhìn.
- Điều khiển camera là nút thật (Toàn cảnh / Cận cảnh / Trên cao) và ô chọn có nhãn, dùng được bằng bàn phím; bóng đổ tắt trên máy yếu theo cờ `contactShadows` của `graphicsQuality`.
- Kỹ thuật tạo đá (đá chôn một phần, tô màu đỉnh, mặt cắt phẳng) điều chỉnh từ skill [3dviz-pro-max](https://github.com/viettranx/3dviz-pro-max) (MIT); catalog của skill không có recipe thác/đình/tháp nên phần còn lại viết tay.

## Thêm một điểm đến mới

1. Thêm điểm vào `verifiedTourismDestinations.ts` (đủ nguồn toạ độ theo `reports/tourism-digital-twin/phase-status.md`).
2. Dựng scene (thông số cho một nhóm hiện có, hoặc cảnh mới) và đăng ký trong `dioramaRegistry.ts`.
3. Khai báo `photo`/`text` trong `DIORAMA_BASIS` — chỉ `photo` khi đã dựa vào ảnh dẫn trong dữ liệu.

## Thác Gia Long (dựng lại 2026-10-07)

Bản đầu (khối thác thẳng + cầu thẳng) trông như đập bê tông nên được dựng lại riêng trong `scenes/giaLong.tsx` + `giaLongTerrain.ts` (hàm thuần, có test): sông rộng hạ qua **bốn gờ đá bất quy tắc** (mép gờ không thẳng, mỗi gờ chẻ thành nhiều dải nước đổ xen khối đá nhô), mặt nước từng tầng khác mực/dòng chảy, vũng chân thác có sương bọt; hai bờ nhô thành bậc; đá có ba bậc kích thước (tảng neo → cụm vừa → đá nhỏ ven nước/trong vũng, đều chìm một phần); rừng ba tầng theo cụm (cây cao, cây vừa, bụi + cỏ, không mọc trong lòng sông); **cầu treo cong** (`CurvedSuspensionBridge`: sàn ván mảnh võng nhẹ, hai dây cáp catenary, dây treo thưa, trụ gỗ). Camera chéo ~30° so với cầu, đặt trên bờ (cao hơn địa hình tại chỗ). Vẫn là minh hoạ, không phải mô hình đo đạc.
