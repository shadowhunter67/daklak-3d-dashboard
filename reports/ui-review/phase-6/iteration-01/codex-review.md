## Kết luận

**FAIL — chưa nên duyệt UI ở iteration 01.**

Có **3 finding HIGH**, tập trung vào tính nhất quán của KPI, khả năng dùng trên mobile và trải nghiệm song ngữ. Không thấy BLOCKER được chứng minh trực tiếp từ code, nhưng ảnh Data Readiness không cung cấp bằng chứng thị giác hợp lệ để nghiệm thu thay đổi nút drill-down.

## Findings cần sửa

### UX-001 — HIGH

- **Route:** `#/projects/prj-015`
- **Viewport:** 1440×900
- **Screenshot:** `project-detail-prj015-desktop-vi.png`
- **Vấn đề:** Trang vẫn hiển thị KPI `70% / 65%` và biểu đồ lịch sử, trong khi section “Snapshot dùng để tính KPI” nói lần quan sát mới nhất không có bản ghi đủ điều kiện được chọn. Người dùng không biết các KPI đang thấy đến từ snapshot nào, snapshot cũ hơn, hay trường tổng hợp độc lập.
- **Tác động người dùng:** Có nguy cơ coi số liệu không có nguồn hợp lệ là KPI hiện hành. Cảnh báo nằm thấp hơn nhiều so với summary nên dễ bị bỏ qua.
- **Nguyên nhân có thể:** `explainLatestAuthoritativeSnapshot()` chỉ xét nhóm quan sát mới nhất; khi nhóm đó chỉ có `rejected`, `selectedSnapshot` là `null`, nhưng summary vẫn lấy các trường KPI của project mà không diễn giải provenance hoặc trạng thái fallback.
- **Đề xuất sửa cụ thể:** Khi không có snapshot hợp lệ cho lần quan sát mới nhất:
  - Gắn trạng thái cảnh báo ngay cạnh các KPI bị ảnh hưởng trong summary.
  - Nói rõ KPI đang dùng snapshot hợp lệ gần nhất, nguồn khác, hay không thể xác minh.
  - Nếu không có nguồn hợp lệ, không trình bày KPI như số liệu bình thường; dùng trạng thái “Không có snapshot hợp lệ” thay vì chỉ giải thích ở section phía dưới.
- **Acceptance check:** Trên `prj-015`, một người chỉ đọc summary phải xác định được nguồn và trạng thái hợp lệ của `overallProgress`, `plannedProgress`, `financialProgress`, `disbursementRate`, `scheduleVariance`, `budgetVariance` mà không cần cuộn tới section snapshot.

### UX-002 — HIGH

- **Route:** `#/projects/prj-013`
- **Viewport:** 390×844
- **Screenshot:** `project-detail-prj013-mobile-vi-snapshot-section.png`
- **Vấn đề:** Section mở rộng vượt xa chiều rộng mobile. Các chuỗi kỹ thuật dài như identity, `sourceRecordId` và câu quy tắc lựa chọn không có điểm ngắt phù hợp. Ảnh element-scoped rộng khoảng 1.328 px thay vì bám viewport 390 px là dấu hiệu overflow ngang rõ ràng.
- **Tác động người dùng:** Người dùng phải cuộn ngang để đọc; nội dung cạnh tranh và trạng thái selected có thể nằm ngoài màn hình. Đây là lỗi usability nghiêm trọng trên mobile.
- **Nguyên nhân có thể:** `.project-detail__card` không có `min-width: 0` hoặc `overflow-wrap`; các chuỗi `identity: ...Z:project-progress-illustrative` và `sourceRecordId=...` gần như không có khoảng trắng. Danh sách lồng dùng lại card desktop mà không có xử lý chuỗi máy.
- **Đề xuất sửa cụ thể:**
  - Áp dụng `min-width: 0` cho section, details, list và card lồng.
  - Dùng `overflow-wrap: anywhere` cho ID/identity.
  - Tách source record, trạng thái và thời gian thành các hàng label/value; không ghép thành một câu dài.
  - Rút gọn ID hiển thị và cho phép xem/copy đầy đủ theo cách accessible nếu cần.
- **Acceptance check:** Ở 320×700 và 390×844, `document.documentElement.scrollWidth <= clientWidth`; mọi nội dung expanded đọc được không cần cuộn ngang, không bị cắt và không đè lên phần tử khác.

### UX-003 — HIGH

- **Route:** `#/projects/prj-013?lang=en`
- **Viewport:** 1440×900
- **Screenshot:** `project-detail-prj013-desktop-en-snapshot-section.png`
- **Vấn đề:** Static label được dịch sang English nhưng selection reason và exclusion reason vẫn là tiếng Việt. Đây là phần giải thích quan trọng nhất của feature.
- **Tác động người dùng:** Người dùng English hiểu trạng thái và ngày nhưng không hiểu “vì sao bản ghi này được chọn” — mục tiêu chính của thay đổi không đạt trong locale English.
- **Nguyên nhân có thể:** `authoritativeSnapshotExplanation.ts` tạo trực tiếp câu tiếng Việt trong `selectedReason` và `exclusionReason`, thay vì trả về reason code cùng tham số để lớp UI dịch.
- **Đề xuất sửa cụ thể:** View-model chỉ trả về reason code có cấu trúc, ví dụ `highestVerificationPriority`, `rejected`, `superseded`, `olderImportedAt`, cùng interpolation values. Dịch toàn bộ câu qua dictionary `vi/en`.
- **Acceptance check:** Khi `lang=en`, section không còn câu tiếng Việt; khi `lang=vi`, không còn câu tiếng Anh ngoài identifier/domain value được xác định rõ là dữ liệu kỹ thuật.

### UX-004 — MEDIUM

- **Route:** `#/projects/prj-013`
- **Viewport:** 1440×900 và 390×844
- **Screenshot:** `project-detail-prj013-desktop-vi-expanded.png`, `project-detail-prj013-mobile-vi-snapshot-section.png`
- **Vấn đề:** Section mới không dùng cùng outer-card treatment với các section liền kề. Selector CSS chung bao gồm progress history và issues nhưng thiếu `.project-detail__snapshot-explanation`. Vì vậy heading đứng ngoài khung, còn chỉ phần nội dung bên trong có card.
- **Tác động người dùng:** Snapshot explanation trông như diagnostics được chèn thêm, không phải một phần chính thức trong kiến trúc Project Detail. Quan hệ “Progress history → Snapshot dùng cho KPI → Issues” kém rõ.
- **Nguyên nhân có thể:** Class mới chưa được thêm vào nhóm CSS của `.project-detail__header`, `__summary`, `__progress-history`, `__issues`, v.v.
- **Đề xuất sửa cụ thể:** Cho section mới dùng cùng margin, padding, border, radius và background của các section cấp một. Nếu vẫn cần card lồng cho competing records, chỉ dùng card ở từng record, tránh “card trong section trống”.
- **Acceptance check:** Khoảng cách dọc, mép trái heading, padding và đường biên của snapshot section khớp progress-history/issues ở cả desktop và mobile.

### UX-005 — MEDIUM

- **Route:** `#/projects/prj-013`
- **Viewport:** 1440×900 và 390×844
- **Screenshot:** `project-detail-prj013-desktop-vi-expanded.png`, `project-detail-prj013-mobile-vi-snapshot-section.png`
- **Vấn đề:** Nội dung chính dùng raw domain identifiers như `overallProgress`, `plannedProgress`, `financialProgress`, `disbursementRate`, `scheduleVariance`, `budgetVariance`. Câu selection rule còn đưa cả thuật toán ưu tiên và identity đầy đủ vào luồng đọc chính.
- **Tác động người dùng:** Operator phải hiểu schema nội bộ mới biết KPI nào bị ảnh hưởng. Mật độ kỹ thuật cao làm trạng thái quan trọng như “Đã rà soát” và “Được chọn” khó quét nhanh.
- **Nguyên nhân có thể:** `affectedKpis` được join trực tiếp; nội dung audit/debug chưa được tách khỏi giải thích vận hành.
- **Đề xuất sửa cụ thể:**
  - Dịch identifier thành nhãn KPI đang dùng trong summary.
  - Hiển thị thành chips hoặc danh sách ngắn có thể quét.
  - Đưa selection rule đầy đủ và identity vào disclosure “Chi tiết kỹ thuật”.
  - Phần mặc định chỉ nên trả lời: ngày nào, trạng thái gì, vì sao được chọn và KPI nào dùng nó.
- **Acceptance check:** Người không biết tên field TypeScript vẫn đối chiếu được từng KPI với summary; nội dung mặc định không chứa camelCase identifiers.

### UX-006 — MEDIUM

- **Route:** `#/projects/prj-013`
- **Viewport:** 1440×900 và 390×844
- **Screenshot:** `project-detail-prj013-desktop-vi-expanded.png`, `project-detail-prj013-mobile-vi-snapshot-section.png`
- **Vấn đề:** Hai competing records chỉ được phân biệt bằng đoạn văn. Record được chọn có dấu `✓`, nhưng record bị loại không có treatment thị giác tương đương; reason, status, imported time và ID đều hòa vào cùng cỡ chữ.
- **Tác động người dùng:** Khó so sánh nhanh “được chọn” với “bị loại”, đặc biệt khi danh sách có thêm record hoặc trên màn hình nhỏ.
- **Nguyên nhân có thể:** Cùng một `.project-detail__card` và paragraph styling được tái sử dụng, chưa có component/status hierarchy riêng cho audit records.
- **Đề xuất sửa cụ thể:** Mỗi record nên có:
  - Badge trạng thái `Được chọn` hoặc `Không được chọn`.
  - Các hàng riêng cho nguồn, verification status và thời gian nhập.
  - Reason nằm dưới badge, dùng màu phụ nhưng vẫn đủ contrast.
  - Không chỉ dùng dấu ✓ để truyền đạt trạng thái.
- **Acceptance check:** Trong vòng vài giây, người dùng xác định đúng record được chọn và lý do loại từng record mà không cần đọc toàn bộ paragraph.

## Điểm tốt cần giữ

- Vị trí information architecture giữa “Lịch sử tiến độ” và “Vướng mắc” là hợp lý về mặt nghiệp vụ.
- Dùng native `<details>/<summary>` là lựa chọn tốt: có semantics và keyboard operation sẵn.
- Disclosure chỉ xuất hiện khi có hơn một competing record, tránh control rỗng ở `prj-015`.
- Trạng thái verification và confidence được dịch qua dictionary.
- Không render field confidence khi dữ liệu vắng mặt, phù hợp acceptance criterion.
- Nhánh không có selected snapshot không giả lập giá trị `0`.
- Illustrative-data badge ở đầu trang vẫn hiện rõ; UI không giả danh số liệu vận hành chính thức.
- Global CSS có `button:focus-visible`, nên nút drill-down và các button khác có nền tảng focus indicator chung.

## Điểm chưa thể xác minh

- `data-readiness-desktop-vi.png` chỉ là nền tối trống, không hiển thị heading, issue list hoặc ba nút “Xem dự án liên quan”. Vì vậy chưa thể nghiệm thu visual hierarchy, alignment, contrast, focus visibility hay vị trí nút mới.
- Ảnh English snapshot bị lặp phần header và cắt ngang; chỉ đủ hỗ trợ finding về mixed-language, không đủ để đánh giá layout English desktop đáng tin cậy.
- Chưa có ảnh 1280×800, 768×1024 và 320×700.
- Không có ảnh trạng thái keyboard focus trên `<summary>` hoặc nút Data Readiness.
- Không có ảnh loading, error và degraded state.
- Không thể xác minh bằng ảnh rằng cả ba nút Data Readiness điều hướng đúng project và focus được chuyển tới heading Project Detail.
- Không có bằng chứng contrast đo bằng công cụ; nhận xét trên chỉ dựa vào quan sát và CSS.
- Manifest liệt kê nhiều hơn năm ảnh và thứ tự không hoàn toàn khớp danh sách ảnh đính kèm, nên traceability của capture cần được làm sạch ở vòng kế tiếp.
