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
