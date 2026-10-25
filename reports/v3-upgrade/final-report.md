# Báo cáo cuối V3 — Đắk Lắk Spatial Intelligence

Cập nhật 2026-10-25. Mọi con số dưới đây lấy từ dữ liệu và lần chạy thật; mockup không được coi là dữ liệu.

## Trạng thái: NOT READY

Lý do chính: các hạng mục bắt buộc của V3 chưa đạt (xem "Chưa làm / chưa đạt"). Phần đã làm đều có kiểm thử và nguồn, nhưng V3 chưa đủ để tuyên bố sẵn sàng.

## Đã làm

| Hạng mục                                              | Kết quả                                                                                                                                                                                                      | Bằng chứng                                                                           |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Hồ sơ xã/phường `#/unit/<mã>` (PR #219)               | Diện tích, dân số 2025, mật độ, đơn vị cấp dưới, dự án thu hút đầu tư và điểm du lịch trong địa bàn; hình ranh giới GIS khi chưa có ảnh                                                                      | `e2e/unit-profile.spec.ts`, ảnh `reports/ui-review/v3/after/unit-profile-*.png`      |
| Độ phủ ảnh xã/phường                                  | KPI thật đếm từ dữ liệu: 14/102 đơn vị có ảnh của một điểm đến du lịch nằm trong địa bàn (dùng lại file Commons giấy phép tự do, ghi rõ không phải toàn cảnh)                                                | `unitMedia.test.ts`, `DataReadinessView.test.tsx`, `unit-profile-photo-desktop.png`  |
| Nghiên cứu ảnh xã/phường                              | 21 đơn vị có ứng viên (45 ảnh); đã tải thu nhỏ và xem 42 ảnh bằng mắt, không ảnh ứng viên nào đủ điều kiện                                                                                                   | `administrative-unit-media-decisions.md`                                             |
| Góc nhìn bản đồ chi tiết                              | Nhóm 4 góc nhìn (Điều hành, Đầu tư, Du lịch, Quy hoạch) trong bảng lớp, lớp điểm đến du lịch thật trên bản đồ MapLibre (popup có nguồn, không có lượt khách), tab nhanh "Lớp du lịch", tham số URL `tourism` | `detailMapLens.test.ts`, `tourismPopup.test.ts`, e2e, `map-tourism-lens-desktop.png` |
| Trung tâm Du lịch `#/tourism` (PR #220)               | 28 điểm đến có nguồn, 25 có ảnh giấy phép tự do, 17 xã/phường có điểm; lượt khách ghi "Chưa có dữ liệu"                                                                                                      | `e2e/tourism-planning.spec.ts`, `tourism-desktop.png`                                |
| Trung tâm Quy hoạch `#/planning` (PR #220)            | 118 văn bản trích dẫn, 187/201 dự án có trích dẫn, 5 dự án cần rà soát (theo chính ô nguồn), ghi lại cách nguồn viết số hiệu                                                                                 | `scripts/research/extract_planning_citations.mjs`, `planning-desktop.png`            |
| Tổng quan: Việc cần chú ý và Quy mô vốn theo lĩnh vực | Chỉ khoảng trống dữ liệu thật và vốn dự kiến theo lĩnh vực từ QĐ 1985; ghi chú tổng lệch 4 nhóm; khối trách nhiệm chỉ nêu lý do chưa có nguồn                                                                | `overview-briefing-desktop.png`                                                      |
| Nhãn bản đồ Tổng quan                                 | 102 tên, 0 cặp chồng đo trong trình duyệt ở 2 độ rộng                                                                                                                                                        | e2e `Nhãn bản đồ Tổng quan`                                                          |
| Tìm kiếm                                              | Thêm nhóm "Văn bản quy hoạch"                                                                                                                                                                                | `globalSearchIndex.test.ts`, e2e                                                     |
| Sidebar                                               | Thêm "Du lịch"; "Quy hoạch" mở trang riêng; hồ sơ xã tô sáng "Xã, phường"                                                                                                                                    | `AppSidebar.test.tsx`                                                                |
| Hạ tầng                                               | `npm audit fix` (fast-uri, undici, zod) để job security xanh (PR #221)                                                                                                                                       | CI                                                                                   |
| Ngân sách                                             | JS 3.428.000 → 3.490.000, gzip 950.000 → 960.000, build 22.800.000 → 22.838.000; từng lần nâng có đo và lý do trong `scripts/check_build_budget.mjs`                                                         | `npm run check:budget`                                                               |

## Review độc lập (Codex qua bridge)

- Checkpoint 1 (V2, trước đó): thứ tự ưu tiên PR.
- Checkpoint 2: bắt được số hiệu `2791/QĐUBND` bị bỏ sót → đã sửa và có test hồi quy. Nhận định sidebar sai là do ảnh chụp cũ, mã đã đúng.
- Checkpoint 3: bắt được ngày có dấu phẩy bị bỏ sót, chuẩn hóa `DQQ` che dấu vết nguồn, cờ "(chưa đủ)" quá rộng → đã sửa cả ba. Phân loại UBND không phân biệt cấp: không tách được từ số hiệu, giữ nhãn "UBND (tỉnh hoặc cấp huyện)" và ghi rõ giới hạn. Lưu ý: ở lượt này Codex chủ yếu xem lại script quy hoạch, chưa xem kỹ khối ProvinceBriefing và các nguyên nhân về lỗi tải của nó.
- Checkpoint 4 (cuối): bắt được việc ProvinceBriefing im lặng biến mất khi tải lỗi/chậm → đã thêm trạng thái đang tải, lỗi và test. Đã đối chiếu mâu thuẫn "4 nhóm / 5 nhóm" giữa báo cáo và `data-conflicts.md`: 5 nhóm có lệch, trong đó 4 chưa giải thích được.

## Chưa làm / chưa đạt

1. **Không chồng nhãn 102 xã/phường**: bản đồ Tổng quan 2D đạt (đo bằng hộp bao DOM thật: 0 cặp chồng ở 1366 và 500 px, có e2e `Nhãn bản đồ Tổng quan`; đã nới ước lượng bề rộng/chiều cao nhãn trong `overviewMapLabels.ts`). Chưa kiểm chứng được: nhãn 3D (Chrome không GPU nên vị trí chiếu không tính được, đo ra 215 cặp chồng là số vô nghĩa) và nhãn bản đồ chi tiết MapLibre (vẽ trên canvas, không đo được bằng DOM).
2. **Ảnh xã/phường**: 14/102. 88 đơn vị còn lại cần ảnh có giấy phép (chụp mới hoặc xin phép); 45 ảnh ứng viên Commons đã xem và không đủ điều kiện.
3. **Góc nhìn bản đồ**: là các cấu hình sẵn lớp tham khảo; "Quy hoạch" vẫn dùng lớp quy hoạch minh họa và ranh quy hoạch tham khảo, không phải ranh chính thức.
4. **Bảng trách nhiệm, tác động kinh tế thật**: không có nguồn về chủ đầu tư, giải ngân, nên không dựng. Khối "Quy mô vốn" là vốn dự kiến, không phải tác động kinh tế.
5. **Ranh giới quy hoạch chính thức**: chưa có tệp công bố tải được; lớp trên bản đồ vẫn là minh họa.
6. **Lượt khách và chỉ số du lịch**: chưa có nguồn công bố.
7. **Số hiệu văn bản quy hoạch**: trích bằng biểu thức chính quy từ văn bản tự do, chưa đối chiếu từng số với bản gốc.
8. **Số liệu vốn**: 4 nhóm trong QĐ 1985 lệch tổng so với tiêu đề mà chưa giải thích được (nhóm thứ 5, thủy điện, chỉ do làm tròn); chưa đối chiếu với PDF gốc.
9. **Kiểm thử trực quan Windows**: 4 ca so ảnh nền trên Windows cục bộ lệch (dashboard.spec); CI Linux là nguồn chuẩn. Chưa cập nhật ảnh nền Windows.
10. **Chính sách tái phân phối nội dung `vpubnd.daklak.gov.vn`** chưa xác nhận.
11. **Chưa kiểm thử với người dùng thật lớn tuổi** ở cỡ chữ A+; mới kiểm bằng axe và ảnh chụp.

## Cổng chất lượng đã chạy tại thời điểm viết

eslint, prettier (`format:check` toàn repo), tsc, vitest 1935+ ca, build, `check:budget`, `validate:public-build:dist`, e2e desktop và mobile cho các file liên quan. Kết quả CI cuối cùng của PR #220 xem trên GitHub (nhánh `v3/tourism-planning`).

Khối Tổng quan mới có trạng thái đang tải và lỗi tải riêng (bổ sung sau Codex checkpoint 4).
