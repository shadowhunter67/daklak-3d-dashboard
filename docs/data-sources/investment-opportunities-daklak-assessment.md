# Source assessment: đầu tư/xúc tiến đầu tư tỉnh Đắk Lắk (investment opportunities)

**Reviewer:** shadowhunter67 (owner sign-off required before any acquisition is enabled — see
"Cần xác nhận" at the end of this document; AI only assisted researching and summarizing, it did
not and cannot conclude legality).

**Date reviewed:** 2026-07-24

**Outcome: BLOCKED — no source found that meets the acquisition bar in this PR.** No adapter was
written, nothing was scraped, and `data/source-registry.yml` was **not** modified — see
docs/data-sources/README.md conventions and PR F ("feat/first-verified-public-source") scope in
docs/adr/0004-public-data-ingestion.md. This document exists so the next attempt doesn't repeat the
same dead ends, and so the decision not to build an adapter is itself reviewable.

## What was being looked for

Per the acquisition bar (docs/adr/0004-public-data-ingestion.md, PR F scope): an official source
about Đắk Lắk investment-attraction opportunities/projects, in a machine-readable format (official
JSON/API preferred, then CSV, then XLSX, then structured HTML, PDF only as a last resort), with a
determinable redistribution policy, no login/CAPTCHA, no personal data beyond what's necessary, and
a **deterministic** parser feasible — i.e., a stable, repeatable shape per record, not free-form
prose that would need per-document judgment calls to extract fields from.

## Candidates evaluated

### 1. `https://daklak.gov.vn/cac-du-an-keu-goi-dau-tu` — official provincial portal, investment-projects section

- **Publisher / authority:** Cổng thông tin điện tử tỉnh Đắk Lắk (official provincial government
  portal) — clearly official.
- **`robots.txt`** (`https://daklak.gov.vn/robots.txt`, checked 2026-07-24):
  ```
  User-Agent: *
  Disallow:
  Sitemap: https://daklak.gov.vn/sitemap.xml
  ```
  No disallow — automated access is not blocked by robots.txt.
- **Redistribution notice found on-page:** "Ghi rõ nguồn tin 'http://daklak.gov.vn' khi phát hành
  lại các thông tin từ Cổng TTĐT này" (cite the source when republishing) — this reads as
  `allowed-with-attribution`, the one piece of good news here.
- **Access method / content type:** plain HTML, no API, no CSV/XLSX/PDF export link found on the
  listing page.
- **Structure — the actual blocker:** the page is a **chronological news list**, ~206 entries, each
  just a title + publish date (example: "Quyết định chấp thuận chủ trương đầu tư đồng thời chấp
  thuận nhà đầu tư dự án Nhà máy điện gió Thuận Phong Đắk Lắk. (29/06/2026, 14:49)"). No sector,
  location, investment capital, or status field appears in the list itself — those would only be
  inside each linked decision document, which is free-form legal/administrative prose (a
  `Quyết định` — an official decision document), not a structured record. Extracting
  `sector`/`estimatedInvestment`/`administrativeAreaCodes` from 206 different decision documents
  would require per-document natural-language interpretation, not a deterministic field-by-position
  or field-by-selector parse — exactly the case section 1 of the acquisition bar rules out ("parser
  deterministic khả thi" is not met), and doing it with an LLM would be exactly the "AI xác nhận
  hợp pháp/chính xác" shortcut this process is designed to prevent.
- **Personal data:** not assessed in depth — moot given the structural blocker above.
- **Verdict: does not qualify** — official, robots-allowed, attribution policy is clear, but no
  deterministic per-record structure exists to parse.

### 2. `https://dttmdl.daklak.gov.vn/en/-/potential-and-opportunities-for-investment` — dedicated investment-promotion portal

- This subdomain (Cổng thông tin xúc tiến đầu tư - thương mại tỉnh Đắk Lắk) was referenced by
  multiple news articles as the province's dedicated investment-promotion site and looked, going
  in, like the most promising candidate — an investment-specific portal is more likely to carry a
  real structured project catalog than a general news feed.
- **DNS resolution failed** (`getaddrinfo ENOTFOUND dttmdl.daklak.gov.vn`) on 2026-07-24, for both
  the page itself and `dttmdl.daklak.gov.vn/robots.txt`. The subdomain appears to be decommissioned
  or migrated — plausible given Vietnam's 2025 provincial-merger administrative restructuring,
  which affected Đắk Lắk directly (see `README.md`'s note on the 2025 merger).
- **Verdict: does not qualify** — unreachable, nothing to assess further. Worth re-checking in a
  future attempt in case the migration lands on a new, working URL.

### 3. `https://sotaichinh.daklak.gov.vn/danh-muc-du-an-trong-diem-thu-hut-dau-tu-cua-tinh-den-nam-2025-1917.html` — Sở Tài chính (Dept. of Finance) summary page

- **Publisher / authority:** official (provincial Department of Finance), citing Decision
  2082/QĐ-UBND (31/07/2024).
- **Structure:** only an **aggregate count by sector** (e.g. "Agriculture & food processing: 8
  projects", total 36 projects) — no per-project table, no attached PDF/XLSX/CSV.
- The page itself displays "Website đang chạy thử nghiệm" (site is in trial operation) — an
  additional signal against treating it as a stable, citable source right now.
- **Verdict: does not qualify** — no per-record data of any kind to acquire, structured or not.

### 4. National open-data portals (`data.gov.vn`, `open.data.gov.vn`)

- Vietnam's national open-data portal was checked as a possible alternate host for a structured
  Đắk Lắk investment/economic dataset (CKAN-style portals like this sometimes carry provincial
  datasets with a real CSV/JSON API).
- Both `https://data.gov.vn/` and `https://open.data.gov.vn/dataset` **failed to resolve**
  (`getaddrinfo ENOTFOUND`) from this environment on 2026-07-24.
- **Verdict: inconclusive, not "does not qualify"** — this could be a transient/environment-specific
  DNS issue rather than the portal being genuinely down; worth retrying from a different network
  before ruling it out entirely. Flagged here rather than silently dropped.

## Cập nhật 2026-09-29: Candidate #5 — Quyết định 1985/QĐ-UBND (phụ lục PDF có cấu trúc bảng)

**Không đảo ngược verdict BLOCKED ở trên — bổ sung một ứng viên MỚI, cần review riêng.** Phần dưới
đây được AI (Claude) tra cứu/trích xuất theo yêu cầu của người dùng trong phiên làm việc; giống mọi
mục khác trong tài liệu này, AI không tự kết luận đây là đánh giá pháp lý/compliance đầy đủ.

- **Nguồn:** Quyết định số **1985/QĐ-UBND** (UBND tỉnh Đắk Lắk, ký 24/06/2026) — "Phê duyệt Danh mục
  dự án thu hút đầu tư giai đoạn 2026-2030 của tỉnh Đắk Lắk". Trang tra cứu:
  https://vpubnd.daklak.gov.vn/Documents/Detail/11262 (Trang thông tin điện tử Văn phòng UBND tỉnh,
  KHÁC domain với `daklak.gov.vn` đã đánh giá ở Candidate #1 — cần review compliance riêng, không
  dùng chung kết luận robots/terms của `daklak.gov.vn`).
- **`robots.txt` của `vpubnd.daklak.gov.vn`** (kiểm tra 2026-09-29): không `Disallow` đường dẫn
  `/CMS/Content/VanBan/` hay `/Documents/Detail/` — chỉ chặn từ khoá SEO/cờ bạc/nội dung xấu không
  liên quan.
- **Redistribution notice:** CHƯA tìm thấy dòng thông báo kiểu "ghi rõ nguồn khi phát hành lại" ở
  footer riêng của `vpubnd.daklak.gov.vn` (khác Candidate #1, nơi `daklak.gov.vn` có dòng này rõ
  ràng) — đây là khoảng trống cần owner xác nhận thêm, KHÔNG mặc định suy ra chính sách từ domain
  khác cùng tỉnh.
- **Cấu trúc — điểm khác biệt then chốt so với Candidate #1:** đây không phải trang tin tức, mà là
  **6 file PDF phụ lục** đính kèm quyết định, mỗi file là **bảng dữ liệu 12 cột nhất quán** (STT, Tên
  dự án, Địa điểm theo xã/phường, Diện tích, Tổng vốn dự kiến, Nguồn gốc đất, Hiện trạng SDĐ, Quy mô
  đầu tư, Quyết định phê duyệt quy hoạch, Điều kiện hạ tầng, Hình thức đầu tư/GPMB, Ghi chú) — parser
  **deterministic khả thi đã được chứng minh bằng script thật** (`PyMuPDF.find_tables()`), không cần
  OCR, không cần LLM diễn giải nội dung. Đây là điểm khác Candidate #1 (từng bị chặn chính vì thiếu
  cấu trúc deterministic).
- **Kết quả trích xuất thử nghiệm:** 201 dự án, 5/6 phụ lục (phụ lục 3 bị chính nguồn upload trùng
  byte-for-byte với phụ lục 2 — lỗi phía tỉnh, không phải lỗi trích xuất). Chi tiết đầy đủ, script tái
  tạo được, và checksum từng file PDF gốc: xem
  [`evidence/1985-qd-ubnd/README.md`](evidence/1985-qd-ubnd/README.md).
- **Vẫn KHÔNG đủ để tự động onboard** — hai khoảng trống compliance chưa có người xác nhận:
  1. `redistributionPolicy` của riêng `vpubnd.daklak.gov.vn` (footer không có thông báo rõ ràng như
     `daklak.gov.vn`).
  2. Đây là **văn bản hành chính nhà nước** (Quyết định), không phải "dữ liệu mở" có giấy phép công
     bố tường minh — dù theo Luật SHTT VN Điều 15, văn bản hành chính không thuộc đối tượng bảo hộ
     quyền tác giả, đây vẫn là một nhận định pháp lý mà AI không có thẩm quyền tự kết luận thay
     owner.
  3. `terms`/điều khoản sử dụng chưa được review đầy đủ như quy trình Candidate #1 đã làm.
- **Chưa có** entry nào được thêm vào `data/source-registry.yml`, chưa viết adapter — đúng nguyên tắc
  ở mục "Why this stops here" bên dưới, áp dụng y hệt cho candidate mới này.

### Khuyến nghị bước tiếp theo (nếu owner muốn theo hướng này)

1. `shadowhunter67` xác nhận độc lập redistribution policy của `vpubnd.daklak.gov.vn` (liên hệ
   banbientap@vpubnd.daklak.gov.vn nếu cần) — ghi ngày thật vào `robotsCheckedAt`/`termsCheckedAt`
   khi tạo entry registry, không dùng ngày AI kiểm tra ở trên làm căn cứ compliance chính thức.
2. Liên hệ tỉnh xin bản đúng của phụ lục 3 (hiện bị trùng phụ lục 2 trên server nguồn).
3. Nếu quyết định onboard: entity đích là `InvestmentOpportunity`
   (`src/entities/investment-opportunity/`) theo ADR 0004 mục 1 — **không** trộn vào `Project`/
   `ProjectPortfolioSource` hiện có. Viết adapter thật trong `scripts/data-refresh/` theo đúng pattern
   `compliance.mjs`/`diffRisk.mjs`, không dùng script ad-hoc trong `evidence/` làm nguồn dữ liệu
   chạy production.

## Cập nhật 2026-09-29 (2): Khảo sát mở rộng toàn bộ sở/ngành tỉnh Đắk Lắk (mới, sau sáp nhập Phú Yên)

**Không tìm thêm được candidate nào đạt tiêu chí.** Theo yêu cầu người dùng, AI (Claude, qua 1
subagent) rà soát rộng cổng thông tin của các sở/ban/ngành khác thuộc tỉnh Đắk Lắk (không chỉ đầu
tư) và một số nguồn liên tỉnh, để tìm thêm nguồn deterministic-parseable như Candidate #5. Lưu ý:
Đắk Lắk hiện tại = Đắk Lắk cũ + Phú Yên cũ (sáp nhập hành chính 2025) — khảo sát có tính cả phần
Phú Yên (VD Ban QL Khu kinh tế Phú Yên).

**Kết quả: hầu hết cổng sở/ngành chỉ có tin tức + PDF quyết định rời rạc theo huyện/đơn vị, không
phải bảng danh mục tổng hợp** — không đạt tiêu chí "parser deterministic khả thi" giống Candidate #1.

| Cổng                                           | Đơn vị                          | Kết luận                                                                                                                                                                                                                                 |
| ---------------------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `snnmt.daklak.gov.vn`                          | Sở Nông nghiệp và Môi trường    | Không — chỉ danh sách quyết định theo huyện, không có bảng tổng hợp                                                                                                                                                                      |
| `daklak.gov.vn/thong-tin-quy-hoach`            | UBND tỉnh                       | Không — danh sách tin/link, 26 trang phân trang                                                                                                                                                                                          |
| `soxaydung.daklak.gov.vn`                      | Sở Xây dựng                     | Chưa kết luận — có nhắc "Hệ thống cung cấp thông tin quy hoạch đô thị và cấp phép xây dựng" (có thể là webapp bản đồ riêng), cần khảo sát riêng ở vòng sau                                                                               |
| `sogtvt.daklak.gov.vn`                         | Sở GTVT                         | Không — chỉ tin tức/văn bản, mục quy hoạch giao thông trống nội dung bảng                                                                                                                                                                |
| `socongthuong.daklak.gov.vn`                   | Sở Công Thương                  | Chưa khảo sát sâu — đáng xem mục quy hoạch điện lực 110kV (có nhắc trên moit.gov.vn)                                                                                                                                                     |
| `bqlkcn.daklak.gov.vn`                         | Ban QL các KCN (Đắk Lắk cũ)     | Không — tin tức, không có bảng tên/diện tích/tỷ lệ lấp đầy KCN                                                                                                                                                                           |
| `bqlkkt.daklak.gov.vn`                         | Ban QL Khu kinh tế (Phú Yên cũ) | Không — tin tức + danh sách tên KCN dạng menu, không bảng                                                                                                                                                                                |
| `yte.daklak.gov.vn`                            | Sở Y tế                         | Không — danh mục cơ sở dạng link rời, không bảng gộp                                                                                                                                                                                     |
| `gddt.daklak.gov.vn`                           | Sở GD&ĐT                        | Chưa khảo sát sâu                                                                                                                                                                                                                        |
| `vhttdl.daklak.gov.vn`                         | Sở VHTTDL                       | Chưa khảo sát sâu                                                                                                                                                                                                                        |
| Niên giám Thống kê (`nso.gov.vn`/`gso.gov.vn`) | Cục Thống kê Đắk Lắk            | Tiềm năng cao về mặt bản chất (ấn phẩm dạng bảng chuẩn) nhưng chưa xác nhận được link tải PDF/Excel trực tiếp — domain `gso.gov.vn` lỗi DNS lúc khảo sát (2 lần, khác thời điểm), `nso.gov.vn` phân giải được nhưng chưa thấy nút tải rõ |
| `data.gov.vn` (cổng dữ liệu mở quốc gia)       | Bộ KH&CN                        | Không truy cập được — lỗi DNS lần thứ 2 (khác thời điểm với lần đánh giá 2026-07-24) — nghi vấn hạ tầng mạng môi trường AI, chưa chắc site thật sự down; cần thử từ mạng khác                                                            |

**2 dự án hạ tầng liên tỉnh thật, không có cổng dữ liệu cấu trúc nhưng đủ rõ để ghi nhận thủ công
nếu owner muốn (không phải diện "onboard tự động" của ADR 0004, chỉ là ghi 1-2 bản ghi tay nếu cần
hiển thị hạ tầng trọng điểm quốc gia đi qua tỉnh):**

- Lưới điện 500kV Krông Búk – Tây Ninh 1 (EVNNPT): trạm 500kV đặt tại xã Ea Kiết, Đắk Lắk, tuyến
  ~330km qua Đắk Lắk–Lâm Đồng–Đồng Nai–TP.HCM–Tây Ninh, tổng vốn ~14.059 tỷ đồng.
- Cao tốc Khánh Hòa – Buôn Ma Thuột (Bộ Xây dựng/GTVT): mục tiêu hoàn thành cơ bản trước
  31/12/2026.

### Khuyến nghị bước tiếp theo (nếu owner muốn đào sâu thêm)

1. Khảo sát kỹ hệ thống tra cứu quy hoạch đô thị/cấp phép xây dựng của Sở Xây dựng — có thể là
   webapp bản đồ (giống `bando.daklak.gov.vn` chưa khảo sát kỹ), không phải file tải về, cần cách
   đánh giá khác (network tab qua chrome-devtools thay vì WebFetch tĩnh).
2. Thử lại Niên giám Thống kê GSO từ mạng khác để loại trừ nguyên nhân DNS môi trường trước khi kết
   luận "không truy cập được".
3. Không ưu tiên Sở Công Thương/GD&ĐT/VHTTDL — mới chỉ lướt qua, chưa đủ căn cứ kết luận, cần khảo
   sát riêng nếu owner thấy lĩnh vực đó đáng giá cho roadmap.

## Why this stops here, not with a workaround

- No OCR of decision-document PDFs/scans (explicitly out of scope for this PR).
- No LLM-based field extraction from the 206 unstructured decision announcements to manufacture a
  "deterministic" parser — that would just move the non-determinism into a prompt instead of
  removing it, and would fail the "AI chỉ hỗ trợ tổng hợp, không kết luận hợp pháp/chính xác" rule
  by effectively becoming the thing deciding what a project's sector/capital "really" is.
- No entry was added to `data/source-registry.yml` — there is no adapter to register, and a
  disabled/placeholder registry entry would need to satisfy the same shape validation as a real one
  (`scripts/data-refresh/registry.schema.json` requires `adapter`, `compliance`, etc.) without
  actually being acquirable, which would just be a different way of pretending progress was made.

## Recommended next steps (not done in this PR)

1. Re-check `dttmdl.daklak.gov.vn` (or whatever it has migrated to) periodically — an investment-
   promotion-specific portal is the most likely place to eventually carry a real structured catalog.
2. Retry `data.gov.vn`/`open.data.gov.vn` from a network that isn't hitting DNS failures, and search
   specifically for a Đắk Lắk provincial dataset there.
3. Consider directly contacting the Trung tâm Xúc tiến Đầu tư tỉnh Đắk Lắk (Investment Promotion
   Center, 09 Nguyễn Tất Thành, Buôn Ma Thuột) to ask whether a structured export (the underlying
   list behind the "259 dự án, 1,03 triệu tỷ đồng" 2026 announcement covered by Tuổi Trẻ/Nhân Dân/
   Báo Xây dựng) is available on request — the announcement itself suggests the province already
   has this data in tabular form internally, even if it isn't published as an open dataset.
4. If a structured source is later found, follow the same evaluation checklist as this document and
   `docs/adr/0004-public-data-ingestion.md` section on onboarding a new source, with
   `maturity: review-required` and `automatedAccessApproved` only set `true` after a human (owner)
   confirms robots.txt/terms/redistribution policy with real dates.

## Cần xác nhận (owner sign-off)

AI (Claude) thực hiện việc tra cứu và tổng hợp ở trên; **không** tự kết luận đây là đánh giá pháp lý
đầy đủ. shadowhunter67 cần xác nhận độc lập trước khi coi đây là "đã đánh giá xong" — đặc biệt nếu
sau này có ai đề xuất lại việc onboard một trong các nguồn ở trên.
