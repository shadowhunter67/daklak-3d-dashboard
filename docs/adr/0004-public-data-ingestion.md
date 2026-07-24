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

## 10. Live commissioning và hardening (bổ sung)

Phần này ghi lại các quyết định khi lần đầu chứng minh pipeline chạy thật trên GitHub Actions,
trước khi kết nối bất kỳ nguồn mạng thật nào (xem PR "chore/data-refresh-live-commissioning").

### Schedule

Bỏ hẳn trigger `schedule` — chỉ còn `workflow_dispatch`. Lý do: nguồn duy nhất đã đăng ký là
recorded fixture; chạy hàng tuần vô thời hạn với fixture đó chỉ tạo ra kết quả `no-change` lặp lại
vô nghĩa (hoặc phải tắt lịch ngay khi có nguồn thật cần chu kỳ riêng). Lịch chạy tự động sẽ được
thêm lại — theo từng `datasetId`, dùng đúng field `schedule` khai báo trong
`data/source-registry.yml` — khi PR onboard nguồn thật đầu tiên landed.

### Source maturity — tách khỏi risk engine

Thêm `SourceMaturity` (`scripts/data-refresh/types.mjs`): `experimental` | `review-required` |
`observed` | `auto-merge-eligible`. Đây là một **fact được khai báo bởi người** trong
`data/source-registry.yml` (field `maturity`, bắt buộc), không phải điều risk engine
(`diffRisk.mjs`) tự suy ra. `diffRisk.mjs` trả lời "run này có an toàn để mở PR không"; maturity trả
lời một câu hỏi khác: "nguồn này đã đủ tin cậy để merge không người can thiệp chưa". Recorded
fixture khai báo `maturity: experimental` — nó có thể luôn ra `low-risk` nhưng **không bao giờ**
auto-merge.

### Auto-merge policy — `scripts/data-refresh/autoMergePolicy.mjs`

Một run chỉ auto-merge-eligible khi **tất cả** đúng: `maturity === 'auto-merge-eligible'`,
`riskLevel === 'low-risk'`, và không có: schema đổi, adapter version đổi (chưa được review riêng),
xoá bản ghi, identity-remap (heuristic: nội dung không đổi nhưng id đổi — xem
`countLikelyIdentityRemaps` trong `run.mjs`, không bao quát mọi trường hợp), thay đổi trạng thái
pháp lý/duyệt (heuristic trên field `status`/`legalStatus`/`approvalStatus`), phát hiện dữ liệu cá
nhân, thay đổi compliance block, thay đổi `redistributionPolicy`, redirect ngoài domain đã duyệt,
hoặc evidence-checksum conflict (chưa có kho evidence-checksum thật — luôn `false` cho tới khi đó
được xây). Nếu bất kỳ điều kiện nào fail, PR vẫn được mở (nếu risk là `low-risk`) nhưng không
auto-merge — gán `shadowhunter67`, mention trong PR body, gắn nhãn `manual-review-required`. Nếu
GitHub repository chưa bật auto-merge ở settings, `gh pr merge --auto` fail không được coi là lỗi
workflow — PR đã mở thành công là đủ.

### Generated source health — không còn cập nhật thủ công

`src/assets/data/data-refresh-source-health.json` không còn là file hand-edited. Canonical location
là `data/published/source-health.json`, sinh ra từ `run.mjs` mỗi lần chạy (không dry-run) —
`writeGeneratedSourceHealth()` giữ lại trạng thái của mọi dataset khác trong registry mà lần chạy
này không đụng tới, và mirror y hệt nội dung sang `src/assets/data/data-refresh-source-health.json`
để browser bundle đọc (Vite chỉ bundle được file trong `src/`). Không ai được sửa tay hai file này.

### Schema drift guard thật

`scripts/data-refresh/registrySchemaDriftGuard.test.mjs` thay thế cách kiểm tra cũ ("compile schema
rồi validate một object cố định"). Với mỗi required field (entry-level và compliance-level) và mỗi
enum field (`authority`, `classification`, `redistributionPolicy`, `maturity`), test tạo cả fixture
hợp lệ (positive) và fixture phá field/giá trị đó (negative), rồi khẳng định **cả hai** validator
(hand-written `validateRegistryShape` và AJV-compiled JSON Schema) đồng thuận — cùng accept, hoặc
cùng reject. Việc viết test này lộ ra một lệch pha thật: `validateRegistryShape` trước đây không từ
chối field lạ ở top-level/compliance dù schema có `additionalProperties: false` — đã fix trong cùng
PR.

### Workflow robustness

- `run.mjs` ghi `reports/data-refresh/run-result.json` (machine-readable: `riskLevel`,
  `autoMergeEligible`, `hasLastKnownGoodChange`, `maturity`, `dryRun`) — workflow đọc bằng `jq`,
  không còn `grep -oP` parse console output.
- Bước đầu workflow tự tạo nhãn `manual-review-required` (`gh label create --force`, idempotent) —
  bỏ yêu cầu "tạo nhãn thủ công một lần" trong docs/public-data-refresh.md.
- Cập nhật issue hard-stop hiện có cũng re-apply assignee/label (không chỉ comment) — phòng trường
  hợp một trong hai bị gỡ giữa các lần chạy.
- Input `commissioningScenario` (`none`/`low-risk`/`hard-stop`) trỏ tới hai fixture bổ sung
  (`scripts/data-refresh/fixtures/commissioning-*.json`, vẫn hoàn toàn offline) để diễn tập PR/issue
  pathway thật trên Actions mà không cần chờ nguồn thật.

## Phạm vi chưa làm (khuyến nghị phase sau)

- Onboard nguồn thật (cần xác nhận robots.txt/terms/compliance officer trước) — xem
  `docs/data-sources/*-assessment.md` khi có.
- GitHub Release asset thật cho raw evidence.
- Evidence-checksum store thật cho `autoMergePolicy.mjs`'s `evidenceChecksumConflict` (hiện luôn
  `false`).
- Identity-remap/legal-status-change detection hiện là heuristic đơn giản
  (`countLikelyIdentityRemaps`/`hasLegalStatusChange` trong `run.mjs`) — không bao quát mọi trường
  hợp một schema đa dạng hơn có thể gặp.
- UI "Data Sources" đầy đủ (hiện là panel tối thiểu, không phải trang riêng).
- Lịch chạy tự động theo từng dataset (xem mục 10 "Schedule") — chờ nguồn thật đầu tiên.
