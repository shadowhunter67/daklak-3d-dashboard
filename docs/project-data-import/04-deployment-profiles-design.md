# Deployment profiles design — demo / internal-static / public-static (Phase 1 design)

Trạng thái: **Phase 2 đã triển khai** — xem [ADR 0005](../adr/0005-project-portfolio-source-abstraction.md).
Sai lệch so với bản thiết kế Phase 1 dưới đây:

- **Không dùng `VITE_PORTFOLIO_PROFILE`/`.env.<mode>` như §3 đề xuất.** Cơ chế thật dùng
  `resolve.alias` của Vite chọn theo `--mode` CLI trực tiếp (không qua biến môi trường
  `VITE_PORTFOLIO_DATA_MODE` nữa) — lý do: một `switch` runtime đọc biến môi trường không đủ để
  Rollup tree-shake dữ liệu minh hoạ ra khỏi bundle `internal-static` (xác nhận bằng build thật). Đặt
  tên biến/mode là `VITE_PORTFOLIO_DATA_MODE`/`data mode` (không phải "profile") đúng như §1 đã cảnh
  báo tránh trùng thuật ngữ với `deployment-profiles.md`, nhưng cơ chế đọc giá trị đã đổi từ env-file
  sang build-config alias.
- Script leakage-guard thật có tên `scripts/validate_portfolio_data_mode.mjs` +
  `npm run verify:portfolio-data-modes` (không phải `validate_internal_static_build.mjs` như §2 đề
  cập) — gộp cả demo/internal-static/public-static vào một script tham số hoá bằng
  `--expected-mode`, thay vì một script riêng chỉ cho internal-static.
- `public-static` Phase 2 xác nhận đúng như thiết kế: dùng chung `GeneratedJsonProjectPortfolioSource`
  với `internal-static`, `metadata.deploymentCompatibility` chỉ khai `['internal-static']` (không
  khai `public-static`) để không ngộ nhận bundle đã qua lọc.

Phần còn lại của tài liệu Phase 1 dưới đây khớp với triển khai thật.

## 1. Vấn đề đặt tên phải giải quyết trước

`docs/deployment-profiles.md` đã định nghĩa **`public`** (build thật, GitHub Pages) và **`secure`**
(chỉ tài liệu — ngụ ý auth/backend thật trong tương lai). Yêu cầu hiện tại dùng
**demo/internal-static/public-static** cho một trục khác: _nguồn dữ liệu project-portfolio nào được
dùng và bao nhiêu dữ liệu được ship_, không liên quan tới auth.

**Quyết định: đây là hai trục độc lập, không gộp, không đổi tên tài liệu cũ.**

|                 | Trục "auth" (đã có, `deployment-profiles.md`) | Trục "nguồn project-portfolio" (mới, tài liệu này)         |
| --------------- | --------------------------------------------- | ---------------------------------------------------------- |
| Câu hỏi trả lời | Ai được xem, có cần đăng nhập không?          | Đang hiển thị dữ liệu minh hoạ hay dữ liệu thật đã import? |
| Giá trị hiện có | `public` (đã build), `secure` (tài liệu-only) | _(chưa có)_                                                |
| Giá trị đề xuất | Không đổi                                     | `demo`, `internal-static`, `public-static`                 |

Một build **luôn** thuộc `public` (trục auth — GitHub Pages không có auth) và **đồng thời** thuộc một
trong `demo`/`internal-static`/`public-static` (trục nguồn dữ liệu). `internal-static` (trục nguồn dữ
liệu) **không** có nghĩa là `secure` (trục auth) — một build `internal-static` triển khai trong mạng
nội bộ vẫn không có auth, đúng như cảnh báo bắt buộc trong yêu cầu gốc ("Không tuyên bố bảo vệ được
dữ liệu mật chỉ bằng frontend"). Tài liệu này phải dẫn lại nguyên văn disclaimer đã có trong
`docs/deployment-profiles.md`/`docs/internal-data-integration.md`, không viết lại bằng lời khác.

## 2. Ba profile

### `demo`

- Nguồn: `IllustrativeProjectPortfolioSource` (xem 01-target-architecture.md).
- Build: **không đổi** — chính là `npm run build`/`quality:frontend` hiện tại, deploy GitHub Pages
  như hiện nay (`deploy-pages.yml` không đổi).
- Hiển thị: nhãn "Dữ liệu minh họa" — **đã có sẵn** khắp UI hiện tại (README, disclaimer, dataset
  `authority: 'illustrative'`), không cần thêm cơ chế mới, chỉ cần đảm bảo profile `demo` không vô
  tình tắt các nhãn này.

### `internal-static`

- Nguồn: `GeneratedJsonProjectPortfolioSource`, đọc `generated-data/project-portfolio.bundle.json`
  (output importer, xem 03-importer-design.md).
- **Bắt buộc: build này không được chứa `illustrativeProjectPortfolio.ts`** (839 dòng dữ liệu minh
  hoạ) trong bundle JS — đây là yêu cầu ngược lại với leakage guard hiện có (leakage guard hiện tại
  ngăn dữ liệu _internal_ lọt vào build _public_; ở đây cần ngăn dữ liệu _minh hoạ_ lọt vào build
  _internal-static_, để người xem không nhầm dữ liệu demo với dữ liệu thật đã import).
  - Cơ chế đề xuất: `createProjectPortfolioSource()` (01-target-architecture.md §3) chọn nhánh theo
    biến build-time `VITE_PORTFOLIO_PROFILE`. Vite tree-shake nhánh `demo` (và do đó
    `illustrativeProjectPortfolio.ts`) ra khỏi bundle **chỉ khi** import là static và biến là
    `import.meta.env` (Vite define, thay thế tại build time, cho phép dead-code-elimination) — không
    dùng `process.env` runtime check (không tree-shake được).
  - Cần một test mới tương tự `scripts/validate_public_build.mjs` nhưng **đảo ngược mục đích**: quét
    `dist/` của build `internal-static` để xác nhận không có chuỗi đặc trưng của dữ liệu minh hoạ
    (ví dụ tên 9 project id `prj-001`..`prj-009`, hoặc field `MOCK_REFERENCE_DATE`) xuất hiện trong
    bundle đã build. Đặt tên script khác (`validate_internal_static_build.mjs`) — không sửa
    `validate_public_build.mjs` để nhồi thêm một mục đích thứ hai không liên quan.
- Hiển thị: kỳ dữ liệu, `asOf`, thời điểm import, checksum — lấy trực tiếp từ
  `ProjectPortfolioBundleMetadata` (01-target-architecture.md §1), hiển thị qua Data Readiness UI
  (Phase 5).
- Disclaimer bắt buộc, dẫn nguyên văn từ `docs/deployment-profiles.md`: build này **không** có auth,
  **không** phù hợp để bảo vệ dữ liệu mật chỉ bằng cách "để trong mạng nội bộ" nếu dữ liệu thực sự
  `confidential`/`restricted` — phải triển khai trong môi trường có kiểm soát truy cập ở tầng mạng
  (không phải tầng ứng dụng).

### `public-static`

- Nguồn dữ liệu: cũng `GeneratedJsonProjectPortfolioSource`, nhưng bundle đã được **lọc** chỉ còn
  record `classification: 'public'` **trước khi** build (lọc ở bước importer hoặc một bước riêng
  sau importer, không lọc bằng cách ẩn ở UI — ẩn ở UI không phải leakage guard thật, xem
  `docs/data-classification.md` "Frontend guards are UX, not security").
- Cơ chế: tái dùng **nguyên vẹn kiến trúc** `config/public-data-files.json` +
  `scripts/validate_public_build.mjs` đã có cho data-platform — mở rộng registry này (hoặc thêm một
  registry song song cùng cơ chế, ví dụ `config/public-project-fields.json`) liệt kê chính xác những
  `sourceDatasetId` project-domain nào được phép có mặt trong build `public-static`. Không phát minh
  cơ chế allowlist thứ hai khác kiểu.
- Build-time leakage guard: mở rộng (hoặc thêm script song song theo cùng pattern)
  `scripts/validate_public_build.mjs` để, khi profile là `public-static`, quét
  `generated-data/project-portfolio.bundle.json` và từ chối build nếu có bất kỳ project nào có
  `sourceDatasetId` trỏ tới dataset `classification !== 'public'`.
- **Không** bao gồm ghi chú/tài liệu nội bộ: nghĩa là các field như `dataOwner` nội bộ, `Evidence`
  nội bộ chưa công bố, `ReferenceDocument` có `legalStatus: 'draft'` — cần một quyết định rõ ràng ở
  Phase 6 về việc có ẩn hoàn toàn các field này khỏi bundle `public-static` hay chỉ ẩn ở dataset
  không đạt classification — đề xuất: ẩn ở cấp **dataset** (nếu dataset không public, toàn bộ record
  thuộc dataset đó bị loại khỏi bundle `public-static`), không ẩn theo field lẻ (ẩn theo field lẻ dễ
  bỏ sót, khó audit).

## 3. Build wiring (đề xuất, Phase 2/6, không làm ở Phase 1)

```jsonc
// package.json — scripts mới, tên tạm, chốt ở đầu Phase 2
"build:demo": "vite build", // = build hiện tại, alias để rõ ý định
"build:internal-static": "vite build --mode internal-static",
"build:public-static": "vite build --mode public-static", // Phase 6, sau khi có allowlist project-domain
```

Mỗi `--mode` tương ứng một file `.env.<mode>` (Vite convention có sẵn, không cần plugin mới) định
nghĩa `VITE_PORTFOLIO_PROFILE`.

## 4. Không xây trong phạm vi này

- `internal-api` — chỉ là extension point tài liệu hoá, đúng như `docs/internal-data-integration.md`
  đã ghi ("A BFF/API gateway" là điều kiện tiên quyết còn thiếu) — không lặp lại nội dung đó, chỉ
  trỏ tới.
- Không tạo hosting environment thứ hai, không tạo CI job deploy riêng cho `internal-static`/
  `public-static` trong Phase 1 — các profile này build ra `dist/` để người vận hành tự deploy thủ
  công vào môi trường của họ (intranet, file server nội bộ...), đúng giới hạn "static, không server"
  của toàn bộ yêu cầu.
