# Automated public-data refresh pipeline

Nền tảng ingestion tự động cho dữ liệu công khai — xem
[ADR 0004](adr/0004-public-data-ingestion.md) cho quyết định kiến trúc đầy đủ. Tài liệu này là
hướng dẫn vận hành cho người, không lặp lại lý do (đã có trong ADR).

## Thuật ngữ

- **"Scheduled refresh"**, không phải "real-time" — nguồn dữ liệu hành chính/thống kê công khai
  không cập nhật liên tục; pipeline chạy theo lịch (`schedule` trong
  `data/source-registry.yml`), không tuyên bố "thời gian thực" cho bất kỳ nguồn nào.
- **`InvestmentOpportunity`** ≠ **`Project`** — xem ADR 0004 mục 1. Không bao giờ trộn danh mục cơ
  hội đầu tư vào danh mục dự án trọng điểm đang vận hành.

## Kiến trúc

```
data/source-registry.yml           # khai báo nguồn (kể cả maturity), schema ở data/source-registry.schema.json
data/published/source-health.json  # snapshot sức khỏe nguồn — SINH RA, không hand-edit (xem run.mjs)
scripts/data-refresh/
  registry.mjs                     # load + validate shape của registry
  compliance.mjs                   # hard-stop rule dựa trên compliance field
  privacyScan.mjs                  # scanner phát hiện dữ liệu cá nhân, deterministic
  diffRisk.mjs                     # diff hai snapshot + risk engine rule-based (low-risk/hard-stop)
  autoMergePolicy.mjs              # eligibility gate: maturity + hard conditions — tách khỏi diffRisk
  manifest.mjs                     # xây refresh manifest (checksum, retrievedAt, evidenceReference)
  reportGen.mjs                    # PR body + issue body (issue dedup qua marker cố định)
  types.mjs                        # SourceHealth / DatasetQuality / BusinessAlert / SourceMaturity
  adapters/recordedFixtureAdapter.mjs  # adapter DUY NHẤT trong PR này — đọc file, không gọi mạng
  fixtures/recorded-source-response.json
  fixtures/commissioning-low-risk-response.json   # chỉ dùng qua --fixture-override để diễn tập
  fixtures/commissioning-hard-stop-response.json  # chỉ dùng qua --fixture-override để diễn tập
  registrySchemaDriftGuard.test.mjs # positive/negative fixture cho mỗi rule, đối chiếu AJV vs hand-written
  run.mjs                          # CLI: node scripts/data-refresh/run.mjs --dataset=<id> [--dry-run] [--fixture-override=<path>]
reports/data-refresh/
  last-known-good/<datasetId>.json # trạng thái publish gần nhất — CÓ commit vào Git
  run-result.json                  # kết quả machine-readable mỗi lần chạy — workflow đọc bằng jq
  <datasetId>.run-report.{json,md} # báo cáo mỗi lần chạy — KHÔNG commit (xem .gitignore)
  <datasetId>.issue-body.md        # nội dung issue theo dõi sức khỏe nguồn — KHÔNG commit
.github/workflows/public-data-refresh.yml  # workflow_dispatch(dryRun, commissioningScenario) — không có schedule, xem ADR 0004 mục 10
```

## Chạy thử cục bộ

```bash
node scripts/data-refresh/run.mjs --dataset=investment-opportunities-daklak-illustrative --dry-run
```

In ra `runStatus=<...> riskLevel=<low-risk|hard-stop>` và (nếu hard-stop) danh sách lý do. `--dry-run`
không bao giờ ghi đè `reports/data-refresh/last-known-good/` hay `data/published/source-health.json`.

Để diễn tập một kịch bản cụ thể (vẫn hoàn toàn offline), thêm `--fixture-override`:

```bash
node scripts/data-refresh/run.mjs --dataset=investment-opportunities-daklak-illustrative --dry-run \
  --fixture-override=scripts/data-refresh/fixtures/commissioning-hard-stop-response.json
```

## Source maturity và auto-merge

Mỗi entry trong `data/source-registry.yml` khai báo `maturity`:
`experimental` | `review-required` | `observed` | `auto-merge-eligible`. Đây là fact do người khai
báo — risk engine (`diffRisk.mjs`) không được tự suy ra maturity. Một run chỉ auto-merge-eligible
khi `maturity === 'auto-merge-eligible'` **và** `riskLevel === 'low-risk'` **và** mọi hard condition
trong `autoMergePolicy.mjs` pass (schema/adapter/compliance/redistributionPolicy không đổi, không
xoá bản ghi, không identity-remap, không đổi trạng thái pháp lý, không phát hiện dữ liệu cá nhân,
không redirect ngoài domain, không evidence-checksum conflict). Nguồn fixture hiện tại khai báo
`experimental` — không bao giờ auto-merge dù risk luôn `low-risk`.

## Thêm nguồn mới (khi có nguồn thật đã xác nhận compliance)

1. Xác nhận robots.txt/terms of use thủ công **trước** — ghi ngày vào
   `compliance.robotsCheckedAt`/`termsCheckedAt`. Không bao giờ để pipeline tự suy đoán.
2. Xác định `redistributionPolicy` thật (không dùng `unknown` — registry sẽ không được validate
   qua nếu để trống, nhưng `unknown` là giá trị hợp lệ về _shape_, chỉ bị `compliance.mjs` chặn ở
   bước _policy_).
3. Viết adapter mới trong `scripts/data-refresh/adapters/` (không dùng `recorded-fixture` cho
   nguồn thật).
4. Khai báo `maturity: review-required` (không phải `auto-merge-eligible`) cho tới khi nguồn đã
   chứng minh ổn định qua nhiều lần chạy thật và được nâng cấp thủ công.
5. Thêm entry vào `data/source-registry.yml`, chạy `npm test` để xác nhận qua
   `registry.test.mjs`/`registrySchemaDriftGuard.test.mjs`.

## Vận hành GitHub Actions

`public-data-refresh.yml` là **`workflow_dispatch`-only** (input `dryRun`, `commissioningScenario`)
— không có `schedule` (xem ADR 0004 mục 10 "Schedule" cho lý do và điều kiện thêm lại). Kết quả:

- **low-risk kèm thay đổi**: mở PR cập nhật `reports/data-refresh/last-known-good/` và
  `data/published/source-health.json`; chỉ bật auto-merge nếu run đó auto-merge-eligible (xem mục
  trên) — ngược lại PR vẫn mở, gán `shadowhunter67`, gắn nhãn `manual-review-required`.
- **no-change**: không mở PR, không làm gì thêm.
- **hard-stop**: cập nhật (hoặc tạo mới nếu chưa có) **một** issue theo dõi sức khỏe nguồn duy nhất
  (marker `<!-- daklak-data-refresh-source-health -->` trong nội dung để tìm lại), gán
  `shadowhunter67`, gắn nhãn `manual-review-required` (re-applied mỗi lần, kể cả khi issue đã có).

Workflow tự tạo nhãn `manual-review-required` ở bước đầu (`gh label create --force`, idempotent) —
không còn bước thiết lập thủ công một lần.

## Giới hạn hiện tại (xem thêm ADR 0004 "Phạm vi chưa làm")

- Chỉ có adapter fixture nội bộ — chưa có nguồn thật nào được onboard.
- Chưa có nơi lưu raw evidence thật (GitHub Release asset) — `evidenceReference` hiện là placeholder.
- Chưa có evidence-checksum store thật — `autoMergePolicy.mjs`'s `evidenceChecksumConflict` luôn `false`.
- Identity-remap/legal-status-change detection là heuristic đơn giản trong `run.mjs`, không bao
  quát mọi trường hợp.
- Không có `schedule` trigger — chỉ chạy khi có người (hoặc CI) gọi `workflow_dispatch`.
