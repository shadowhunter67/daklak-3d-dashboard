# ADR 0004 — Public-data ingestion pipeline foundation

## Bối cảnh

`src/data-platform/` hiện chỉ bọc dữ liệu tĩnh đã đóng gói sẵn (bundled). Không có cơ chế nào tự
động lấy dữ liệu mới từ nguồn công khai, kiểm tra thay đổi, và đề xuất cập nhật. Mục tiêu PR này là
xây **nền tảng** cho việc đó — không phải scrape hàng loạt ngay, không thay thế dữ liệu minh hoạ của
`Project` bằng dữ liệu không tương thích, và không tự động publish bất cứ thứ gì mà chưa qua review.

## Quyết định

### 1. Domain: `InvestmentOpportunity` ≠ operational `Project`

Danh mục "cơ hội đầu tư" (investment opportunity — dự án kêu gọi đầu tư, quy hoạch, mời thầu công
khai) là một entity **hoàn toàn khác** `Project` (dự án trọng điểm đang vận hành, xem
[ADR 0001](0001-project-centric-domain.md)):

|               | `Project`                                                                    | `InvestmentOpportunity`                                             |
| ------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Ý nghĩa       | Dự án đang triển khai, có ngân sách/tiến độ/gói thầu thật (hiện là minh hoạ) | Cơ hội mời gọi đầu tư — có thể chưa được duyệt, chưa có nhà đầu tư  |
| Vòng đời      | `proposed → ... → completed/cancelled`                                       | `announced → open-for-proposals → under-review → awarded/withdrawn` |
| Nguồn dữ liệu | Domain fixture minh hoạ (Phase 1/2)                                          | Danh mục xúc tiến đầu tư công khai (pipeline này)                   |
| Không được    | Trộn vào `ProjectPortfolioSource`                                            | Trộn vào danh mục `Project`                                         |

`InvestmentOpportunity` sống ở `src/entities/investment-opportunity/`, tách biệt hoàn toàn khỏi
`src/entities/project/` — không entity nào import chéo entity kia. Xem
`src/entities/investment-opportunity/types.ts`.

### 2. Source registry

`data/source-registry.yml` là danh sách khai báo mọi nguồn dữ liệu công khai dự kiến ingest, với
schema hand-written mirror (`data/source-registry.schema.json`) theo đúng pattern
`data-templates/schemas/*.schema.json` đã dùng cho domain fixture (hand-written validator chạy
trong `npm test`, JSON Schema chỉ dùng để chạy AJV **trong test** để phát hiện lệch pha — AJV vẫn là
devDependency, không lọt vào bundle công khai).

Một nguồn **không được onboard** nếu thiếu compliance field bắt buộc, hoặc `redistributionPolicy`
là `unknown` — xem `scripts/data-refresh/registry.mjs`.

### 3. Pipeline chạy ở đâu

`scripts/data-refresh/*.mjs` — Node ESM thuần (không TypeScript), theo đúng pattern
`scripts/validate_public_build.mjs`/`scripts/generate_build_metrics.mjs` đã có, test bằng
`scripts/data-refresh/*.test.mjs` (Vitest đã cấu hình include `scripts/**/*.test.mjs`). Lý do không
viết bằng TypeScript trong `src/`: script này chạy độc lập trong GitHub Actions bằng `node` trực
tiếp, không qua bước build Vite — dùng chung TS với app sẽ cần thêm bước biên dịch/loader chỉ để
chạy một script CLI.

### 4. Ba khái niệm tách biệt, không trộn

- **`SourceHealth`** — nguồn có đang truy cập được không (robots/terms/kết nối), khi nào thành công
  gần nhất.
- **`DatasetQuality`** — dữ liệu lấy về có hợp lệ không (schema, số bản ghi, trùng lặp) — **tái sử
  dụng** `DatasetQuality` đã có ở `src/data-platform/schemas/dataset.ts` (status/geometryStatus/
  knownLimitations), không định nghĩa lại một shape khác cho cùng khái niệm.
- **`BusinessAlert`** — cảnh báo nghiệp vụ (dữ liệu quá hạn, thay đổi cấu trúc, phát hiện dữ liệu cá
  nhân...) cần người xem xét.

Không trộn ba khái niệm này vào cùng một object phẳng — xem `scripts/data-refresh/types.mjs`.

### 5. Bằng chứng thô (raw evidence)

Không commit PDF/HTML lớn vào Git. Thiết kế:

- File thô (nếu có) → GitHub Actions artifact hoặc GitHub Release asset (ngoài phạm vi PR này —
  chưa có nguồn thật để tải).
- `reports/data-refresh/last-known-good/<datasetId>.json` — bản JSON đã publish gần nhất, **có**
  commit vào Git (nhỏ, đã qua validate).
- Manifest (`scripts/data-refresh/manifest.mjs`) giữ `checksum`/`evidenceReference` trỏ tới nơi lưu
  bằng chứng thô, không giữ chính bằng chứng đó trong repo.

### 6. Compliance là hard rule, không phải AI quyết định

`scripts/data-refresh/compliance.mjs` từ chối tiếp tục (hard stop) nếu: `redistributionPolicy`
unknown, `robotsCheckedAt`/`termsCheckedAt` trống, `automatedAccessApproved` không phải `true`, phát
hiện dữ liệu cá nhân (`scripts/data-refresh/privacyScan.mjs`), thay đổi schema, xoá bản ghi, hoặc
redirect ra ngoài domain đã duyệt. Đây là rule cứng bằng code, không phải một mô hình AI "đánh giá
rủi ro rồi tự quyết".

### 7. Risk engine là rule-based

`scripts/data-refresh/diffRisk.mjs` phân loại `low-risk` (nguồn machine-readable chính thức,
append-only, schema không đổi, không có bản ghi nhạy cảm, mọi validation pass) hoặc `hard-stop`
(bất kỳ điều kiện ở mục 6). Không có mức "medium risk mờ hồ" — chỉ có low-risk (đủ điều kiện
auto-merge) hoặc hard-stop (bắt buộc người duyệt).

### 8. GitHub Actions

`.github/workflows/public-data-refresh.yml`: `schedule` + `workflow_dispatch` (có input
`dryRun`), quyền tối thiểu, pin action theo SHA đầy đủ (cùng convention `quality.yml`),
`concurrency` group, `timeout-minutes`. Không bao giờ commit thẳng vào `main` — luôn qua PR (dùng
`gh` CLI có sẵn trên runner, không thêm action bên thứ ba mới cần pin SHA riêng). Auto-merge **chỉ**
bật khi risk là `low-risk` và mọi gate khác xanh; nếu `hard-stop`/cần review, gán
`shadowhunter67`, gắn nhãn `manual-review-required`, và cập nhật **một** issue theo dõi sức khỏe
nguồn duy nhất thay vì tạo issue mới mỗi lần chạy (tránh spam).

### 9. Không thực thi ngoài đời thật trong PR này

Vì chưa xác nhận compliance (robots/terms) của bất kỳ nguồn thật nào, PR này **chỉ** chạy pipeline
với fixture nội bộ (`scripts/data-refresh/fixtures/recorded-source-response.json`) — mô phỏng một
phản hồi "official-like", không gọi mạng thật trong test hay trong workflow mặc định. Workflow có
input `dryRun` để chạy thử không publish gì.

## Frontend

`DatasetAdapter<T>` (đã có ở `src/data-platform/adapters/types.ts`) **đã đúng shape** cho việc này
— không tạo `DatasetSource<T>` trùng lặp. Thêm panel "Tình trạng nguồn dữ liệu tự động"
(`src/features/data-sources/DataSourcesPanel.tsx`), lazy-load, song ngữ (dùng `src/i18n/` đã merge ở
PR trước), đọc một JSON tĩnh nhỏ do pipeline sinh ra (`src/assets/data/data-refresh-source-health.json`)
— không tự fetch trực tiếp trong browser.

## Phạm vi chưa làm (khuyến nghị phase sau)

- Onboard nguồn thật (cần xác nhận robots.txt/terms/compliance officer trước).
- GitHub Release asset thật cho raw evidence.
- Drift-guard test tự động đối chiếu `source-registry.yml` với schema (hiện chỉ có AJV validate một
  fixture cố định trong test, chưa có cơ chế tự phát hiện lệch pha như
  `schemaDriftGuard.test.ts` đã làm cho domain fixture).
- UI "Data Sources" đầy đủ (hiện là panel tối thiểu, không phải trang riêng).
