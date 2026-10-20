# Báo cáo nâng cấp V2 — Đắk Lắk Spatial Intelligence & Project Transparency

Ngày: 2026-10-18 · Nhánh `feat/v2-investment-catalog` · PR #208

## Rà soát UI sau merge (2026-10-19)

Rà soát trên bản production (chrome-devtools, ảnh trong `reports/ui-review/v2/audit/`). Đã sửa:

- **Mục điều hướng lặp:** "Xã, phường" chỉ là lối tắt vào đúng màn "Bản đồ" (và khi bấm lại thì "Bản đồ" sáng) → nay có lối vào riêng (`mapEntry`): mở danh sách 102 đơn vị, đặt con trỏ vào ô tìm, và chỉ một trong ba mục bản đồ sáng. Bốn chip lớp bản đồ trùng nhãn với sidebar ("Dự án", "Quy hoạch") → đổi thành "Lớp ranh giới / giao thông / quy hoạch / dự án".
- **Lỗi do mình gây ra trước đó:** `overflow-wrap: anywhere` cho giá trị KPI làm số tiền bị bẻ giữa các chữ số ("180.00 / 0.000. / 000 đ") → dùng `break-word` và định dạng "180 tỷ ₫" bằng hàm có sẵn `formatVndInBillions`.
- Mũi tên "→ →" ở nút "Xem danh mục dự án" (khóa i18n đã có mũi tên, mã lại thêm một cái).
- **Bản đồ 2D:** tâm mặc định lệch ~0,2° về phía tây nên bờ biển phía đông bị cắt ở canvas 864 px → tâm đặt theo khung biên thật của tỉnh. Nhãn: engine chỉ thử bán kính đến 42 px nên còn 17 cặp chồng nhau với 102 nhãn thật ở zoom 8; mở rộng đến 104 px thì mô hình cho 0 cặp, 0 nhãn ra ngoài canvas (có test hồi quy dùng dữ liệu thật).

**Còn mở (chưa sửa, cần kiểm trên máy có GPU):**

- Bản đồ 3D trong trình duyệt tự động chỉ vẽ lưới, không thấy địa hình, và 102 nhãn dồn thành cụm chồng nhau (tỉnh được vẽ rất nhỏ giữa hai panel). Chưa xác định là lỗi thật hay do WebGL phần mềm.
- Bản vẽ 2D thật vẫn còn vài nhãn chạm nhau ở vùng đông dù mô hình tính là không: chênh lệch giữa ước lượng kích thước chữ của engine và bộ vẽ MapLibre chưa được điều tra.
- Header 40 px: đã xử lý ở lượt sau (xem "Đã sửa tiếp").

## Phiên kiểm thử như người dùng mới (2026-10-19)

Trình duyệt sạch (ngữ cảnh cô lập), laptop 1366×768 và điện thoại ~500 px; ảnh trong `reports/ui-review/v2/newuser/`. Việc đã thử: mở app, tìm kiếm, đi qua từng mục menu, đổi chế độ tối, đổi tiếng Anh, mở Trợ giúp, mở hộp cài đặt trên điện thoại.

Đã sửa:

- **Tìm kiếm không thấy dữ liệu thật:** gõ "điện gió"/"sân golf" báo "Không có kết quả" dù 201 dự án thật có từ đó → thêm nhóm "Thu hút đầu tư" (tải lười khi focus); chọn kết quả mở `#/investment-catalog?q=…` đã lọc sẵn.
- **Bản đồ 2D trên laptop vẫn bị cắt:** khung bản đồ thấp hơn mô hình (thanh chân trang 44 px che phần dưới) → tự khớp toàn tỉnh theo kích thước khung thật, có chừa chỗ cho chân trang và nút nổi.
- **Hai nơi "nguồn dữ liệu" nghe như một:** trang "Dữ liệu & nguồn" (độ tin cậy dữ liệu dự án) và hộp "Nguồn dữ liệu" trong cài đặt (danh mục 20 bộ dữ liệu, trong đó có QĐ 1985) → hộp đổi tên "Danh mục bộ dữ liệu", trang dữ liệu có nút mở thẳng danh mục.
- Vùng bấm < 44 px: nút A-/A/A+ (34 px), nút trên thanh đầu (40 px), liên kết "Xem danh mục dự án →" (19 px).
- 3 tên dự án thật còn dấu `;`/`,` thừa do trích PDF (làm sạch trong script dựng dữ liệu; checksum đã cập nhật).

Đã sửa tiếp (lượt "làm hết"):

- **KPI:** trên điện thoại xếp 2 cột (từng 1 cột chiếm gần 4 màn hình), ô gọn hơn nên bản đồ ở Tổng quan lọt vào màn đầu tiên của laptop 1366×768 (thẻ bắt đầu ở y=561 thay vì nằm hẳn dưới màn).
- **Chú giải quy hoạch:** khi bật lớp "Quy hoạch" hiện màu từng loại và ghi rõ "sơ đồ minh họa, không có giá trị pháp lý"; xếp trên chú giải xã/phường, không đè nhau.
- **Chip "Nghiêm trọng"** nay có nhãn "Tình trạng danh mục".
- **Trợ giúp ở Tổng quan** giải thích cách dùng ứng dụng (thanh bên, ô tìm kiếm, cỡ chữ) thay vì hướng dẫn kéo/xoay 3D.
- **Tiếng Anh:** chi tiết thông báo chất lượng dữ liệu không còn là chuỗi tiếng Việt cố định (hiện mã đối tượng).
- **Điện thoại:** mở menu là thấy ngay Cỡ chữ và Ngôn ngữ (khung cài đặt tự mở); nút A-/A/A+ 44×44.
- Vùng bấm 44 px cho liên kết "Xem dự án liên quan", liên kết bỏ qua, nút đóng menu.
- Trần JS nâng 3.422.000 → 3.428.000 (đo 3.424.049; đã quét khóa i18n chết, không còn gì bỏ được).

**Còn mở (chưa sửa):**

- Bản đồ 3D: trong trình duyệt tự động chỉ vẽ lưới (không thấy địa hình) và 102 nhãn dồn thành cụm; cần kiểm trên máy có GPU thật, mình không thể xác nhận từ đây.
- Bản vẽ 2D thật vẫn còn vài nhãn chạm nhau dù mô hình tính là không chồng (chênh lệch giữa ước lượng kích thước chữ và bộ vẽ MapLibre).
- Chú giải quy hoạch che một phần bờ biển phía đông ở laptop.
- Test ảnh chuẩn Windows `dashboard-detail-name-24580-desktop` đã cũ (241×327 so với giao diện hiện tại); không do thay đổi này, CI (Linux) qua.

## Final Status

**NOT READY.** Đợt này hoàn thành nền dữ liệu có bằng chứng và một màn hình dùng dữ liệu đó, nhưng nhiều hạng mục trong Definition of Done chưa làm hoặc chưa được kiểm chứng (xem "Remaining Work"). Không hạng mục nào dưới đây được báo "xong" nếu chưa có bằng chứng đi kèm.

## Executive Summary

- Dựng domain mới `src/entities/researched-project/` (provenance theo từng trường, lịch sử quan sát không ghi đè, độ chính xác vị trí, vòng đời dự án, validator, validator license ảnh) mà **không** sửa `Project` (tránh lệch 4 chỗ: JSON Schema, drift guard, projection allowlist, validator).
- Thu thập **201 dự án thật** từ Quyết định 1985/QĐ-UBND (24/06/2026) — văn bản pháp lý chính thức — dựng tất định, kèm báo cáo xung đột và ứng viên chưa xác minh.
- Trang mới `#/investment-catalog` hiển thị dữ liệu đó; không hiển thị tiến độ/giải ngân/nhà đầu tư vì nguồn không có.
- Sửa lỗi bố cục thật tìm thấy khi kiểm tra trình duyệt: tiêu đề/KPI tràn ngang ở màn hẹp, A+ và zoom; breadcrumb lặp dấu; sidebar tô nhầm mục.
- Vitest 188 file / 1859 test xanh trước các sửa review; sau đó thêm 5 test (nhóm liên quan 185/185 xanh).

## UI Implementation

Đã làm trong lượt này: trang danh mục thu hút đầu tư (lọc tên không dấu, lĩnh vực, địa bàn, sắp xếp, phân trang 24, link nguồn có tên dự án và vùng bấm 44px). Phần UI còn lại của gói (shell, Overview, bản đồ 2D/3D, thẻ/bảng dự án, nguồn dữ liệu, báo cáo) đã vào `main` qua #203–#206; lượt này **không** kiểm lại chúng ngoài unit test.

## Accessibility

- Đã đo trong trình duyệt thật (chrome-devtools, production build): trang mới không tràn ngang, không chồng lấn, không cắt chữ ở 1440 px, 500 px (cửa sổ tối thiểu của trình duyệt, không đạt được 390 px đúng) và 720 px với A+ (hệ số 1,25).
- Lỗi gốc đã sửa: quy tắc toàn cục `h1 { white-space: nowrap }` trong media mobile của `global.css` làm mọi tiêu đề dài tràn ngang.
- **Chưa đạt:** nút mở menu và liên kết "bỏ qua" ở header cao 40 px (< 44 px); có sẵn từ trước, chưa sửa. Chưa chạy axe, chưa kiểm tra bàn phím/focus thủ công, chưa kiểm tra reduced-motion cho trang mới.
- Cỡ chữ nền hiện 16 px (gói yêu cầu 17–18 px trở lên): chưa đổi.

## Responsive Matrix / Overlap Testing

Chỉ đo trang mới tại 1440, 500, 720 (A+). Chưa chạy ma trận 10 độ rộng × 3 mức zoom và chưa chạy Playwright cục bộ (theo quy ước tuần tự, để CI chạy). Ma trận e2e (chồng lấn, zoom, 102 nhãn) của các commit trước chạy trong CI: ở commit `e1cf5bb` của PR #208, toàn bộ job xanh, gồm 4 shard e2e (desktop-chromium, desktop-webkit, mobile-chromium), build-and-budget, unit-and-data, contract-and-modes, security, static-analysis, CodeQL/analyze. Lần chạy trước đó đỏ vì 7 spec của trang Chi tiết dự án còn dùng selector cũ (đã sửa).

## 102 Label Engine / GIS Changes

Không thay đổi trong lượt này. Engine nhãn theo không gian màn hình và test bất biến 102 nhãn đến từ commit `f98eadd`/`5ad724b` (#204–#206); chưa kiểm lại.

## Project Portfolio / Project Detail / Context Lens

- Danh mục dự án minh họa (thẻ/bảng): không đổi. Trang Chi tiết dự án dựng theo UI kit (`326fa75`) được đưa vào PR này vì là commit cục bộ chưa từng vào `main`.
- **Provenance theo trường và "Lịch sử thay đổi": đã có** trên thẻ dự án thu hút đầu tư (nút "Xem bằng chứng": giá trị hiện hành, mức bằng chứng, độ tin cậy, ngày văn bản, nguồn; quan sát cũ được giữ lại). **Chưa có** trên trang Chi tiết dự án minh họa (dữ liệu minh họa không có nguồn theo trường). **Context Lens dùng chung: chưa làm.**

## Data Trust / Data Model

Domain `researched-project`:

| Khái niệm            | Hiện thực                                                                                                                                                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quan sát theo trường | `FieldObservation {value, sourceId, observedAt, confidence, status}`                                                                                                                                                |
| Giải quyết giá trị   | `resolveField`: mức bằng chứng cao nhất, rồi mới nhất; mâu thuẫn được giữ trong `conflicts`                                                                                                                         |
| Vị trí               | `administrative-centroid` / `approximate` / `official-coordinate` / `verified` + `verificationMethods`; `verified` cần ≥ 2 phương pháp độc lập                                                                      |
| Vòng đời             | 12 giá trị (`investment-attraction` … `unknown`), tách khỏi `ProjectStatus`                                                                                                                                         |
| Nguồn                | `SourceRecord` (số hiệu, loại nguồn, ngày công bố/tải, checksum, giới hạn, ghi chú sử dụng)                                                                                                                         |
| Validator            | trùng ID, nguồn lạ, "official" mà nguồn là báo chí, mã đơn vị lạ, URL không https, vị trí khai quá mức, `verified` thiếu bằng chứng, xung đột, quan sát cũ, ngày không hợp lệ, ngày tương lai, dự án trùng khả nghi |

Trên 201 dự án thật, validator trả 0 lỗi, 0 cảnh báo.

## Public Data Research / Official Sources Used

- Chính thống đã dùng: Quyết định 1985/QĐ-UBND, UBND tỉnh Đắk Lắk, ký 24/06/2026, 5 phụ lục PDF trên `vpubnd.daklak.gov.vn` (MD5 ghi trong từng `SourceRecord`).
- Thứ cấp đã đọc để định hướng, **không** đưa vào production: vneconomy (03/04/2023) về cao tốc Khánh Hòa – Buôn Ma Thuột.
- Chỉ thấy tiêu đề/tóm tắt tìm kiếm, chưa đọc chính văn: các bài báo khác và các quyết định trên `daklak.gov.vn`. WebFetch không truy cập được tên miền này (lỗi xác minh tên miền), nên các văn bản trên cổng chính chưa đọc được.
- Phương pháp: `reports/research/research-method.md`.

## Projects Added

201 dự án thu hút đầu tư 2026–2030 (5/6 phụ lục), vòng đời `investment-attraction`, mức `partial`. Mỗi dự án có tên, lĩnh vực, tổng vốn **dự kiến**, nguồn; 182 có ≥ 1 mã đơn vị hành chính, 163 có vị trí (tâm xã/phường). Không dự án nào có tiến độ, giải ngân, nhà đầu tư. Không có dự án nào ở mức `verified`.

Đã tồn tại từ trước (không thuộc đợt này): pilot 3 dự án đang triển khai qua pipeline `Project` (nguồn báo chí, chỉ internal-static).

## Images Researched / Approved / Rejected / Licensing

- Đã xác minh license: `Buôn Ma Thuột city square.jpg` — Wikimedia Commons, tác giả Rdavout, CC BY-SA 3.0 (hoặc GFDL 1.2+), chụp 2008. Phân loại **reference-only**: ảnh cũ 17 năm, không có chỗ dùng đúng chủ thể, chưa tải về.
- **Ảnh duyệt cho production: 0.** UI dùng nhãn/biểu tượng, không dùng ảnh giả.
- Chưa tìm ảnh cho dự án cụ thể nào. Manifest: `config/media-sources.json`, validator: `media.ts`.

## Location Verification

Chỉ có tâm đơn vị hành chính (khớp nguyên tên với 102 nhãn, một alias duy nhất `BMT → Buôn Ma Thuột` có trong văn bản nguồn). 0 vị trí `verified` hay `official-coordinate`. 45 dự án có địa danh chưa khớp (ví dụ nguồn viết "Cư Prơng", đơn vị hiện hành là "Cư Pơng"): không gán mã, ghi chú trong `notes`. Chưa đối chiếu OSM/Nominatim.

## Conflicting Data

Chi tiết `reports/research/data-conflicts.md`: 5/17 nhóm lệch tổng vốn so với tiêu đề nhóm (1 nhóm do làm tròn, 4 chưa giải thích được; riêng "nhà ở xã hội" có thể thiếu 1 dòng ở nguồn); phụ lục 3 trùng byte phụ lục 2; số liệu báo chí cao tốc mâu thuẫn giữa các nguồn. Không xung đột nào được tự sửa cho khớp.

## Missing Data

Phụ lục 3 (một lĩnh vực); tiến độ, giải ngân, nhà đầu tư, toạ độ dự án cho cả 201 dự án; văn bản chấp thuận chủ trương 2026 trên cổng chính.

## Build Metrics Before/After

| Chỉ số      | `origin/main` | Nhánh này | Trần mới                     |
| ----------- | ------------- | --------- | ---------------------------- |
| JS tổng (B) | 3.398.958     | 3.419.091 | 3.422.000 (trước: 3.400.000) |
| JS gzip (B) | 932.665       | 939.366   | 950.000                      |

**Trần JS đã được nâng 22 KB.** Lý do: `main` chỉ còn dư 1.042 B nên không route mới nào lọt vào. Trước khi nâng đã dọn 40 khóa i18n chết (−6,5 KB) và tái dùng nhãn lĩnh vực. Chi phí +20,1 KB gồm chunk danh mục ~8,8 KB, chuỗi vi/en và trang Chi tiết dự án dựng lại. Số đo đầu tiên của mình bị lệch vì `maplibre-gl` cục bộ là 6.11.2 thay vì 6.14.0 (lockfile): CI bắt được, đã đo lại sau `npm ci`. Mình không tách riêng được chi phí của `326fa75` vì commit sau phụ thuộc nó. Cần reviewer chấp thuận việc nâng trần.

## Automated Tests

typecheck, eslint (0 lỗi), prettier, vitest 188 file/1859 test, test import dữ liệu, contract (26), public-projection, secrets, validate:public-build (source + dist), check:budget, build:metrics, validate:data — xanh cục bộ. `npm ci` báo 0 lỗ hổng. Playwright, axe, Lighthouse: chưa chạy cục bộ.

## Manual Browser Review

Ảnh thật trong `reports/ui-review/v2/after/` (desktop, mobile hẹp, A+ ở 720 px). Chưa chụp "before" (không có phiên bản cũ của trang mới); chưa chụp các màn khác.

## Codex Review Findings

Cầu nối Codex không ổn định (đã ghi nhận từ trước): hai lần đầu chỉ lặp lại đề, không đọc được file; mã trong khối code bị cắt.

- **Checkpoint 1 (trước khi làm):** Codex không trả nội dung. Mình tự audit: `Project` có 4 điểm đồng bộ schema; `InvestmentOpportunity` đã tách riêng → quyết định tạo domain riêng. Trạng thái: thay bằng tự audit.
- **Checkpoint 2 (shell/overview/bản đồ):** **chưa thực hiện.**
- **Checkpoint 3 (domain dữ liệu), một phần:** Codex review logic dưới dạng văn bản thuần (8 ý). Đã xử lý: ngày không tồn tại bị `Date.parse` chuẩn hoá (sửa), ngày tương lai (sửa), sắp xếp bất định khi ngày NaN (sửa), thiếu phát hiện dự án trùng (sửa), `verified` bị coi quá mức chỉ vì có liệt kê tâm hành chính (sửa một phần). Từ chối: yêu cầu ≥ 2 phương pháp độc lập là chủ đích của đặc tả; "nhãn evidence" là suy đoán; so sánh object không xảy ra vì giá trị trong schema là số hoặc chuỗi. Chưa review script build và view.
- **Checkpoint 4 (diff cuối):** **chưa thực hiện.**

## Security

Secrets scan sạch (979 file); `npm ci` 0 lỗ hổng. Không thêm origin ngoài (CSP không đổi); liên kết nguồn dùng `rel="noopener noreferrer"`. Không đọc `.env*`; `.env.production` bị sửa cục bộ từ trước, không commit.

## Known Limitations

- Chính sách tái phân phối của `vpubnd.daklak.gov.vn` chưa được owner xác nhận (ghi trong `usageNotes`); cần xác nhận trước khi xuất bản diện rộng.
- Vốn là số dự kiến trong văn bản; tổng 918.997 tỷ là tổng cộng các dòng, không phải tổng mức đầu tư được duyệt; 5 nhóm lệch so với tiêu đề.
- Trích xuất PDF tự động; chưa có người đối chiếu thủ công.

## Remaining Work

1. Checkpoint 2 và 4 của Codex (cần cầu nối ổn định hoặc review thủ công).
2. Context Lens dùng chung (panel ngữ cảnh theo lựa chọn cho xã/phường và dự án); provenance theo trường cho trang Chi tiết dự án nếu có dữ liệu có nguồn.
3. Ảnh production có license (cần tìm đúng chủ thể) hoặc minh họa trung tính có nhãn.
4. Header 40 px → 44 px; cỡ chữ nền 17–18 px; axe + kiểm tra bàn phím; ma trận 10 độ rộng × zoom 125/150/200%.
5. Đọc chính văn quyết định trên `daklak.gov.vn` (cần truy cập từ máy người dùng) để thêm dự án đang triển khai có nguồn chính thức; đối chiếu 4 nhóm lệch tổng vốn với PDF.
6. Đối chiếu vị trí OSM/Nominatim cho dự án có địa điểm cụ thể.

## Final Status

**NOT READY** — lý do: các hạng mục bắt buộc ở "Remaining Work" 1–4 chưa hoàn thành.
