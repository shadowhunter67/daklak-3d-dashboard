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
data/source-registry.yml           # khai báo nguồn, schema ở data/source-registry.schema.json
scripts/data-refresh/
  registry.mjs                     # load + validate shape của registry
  compliance.mjs                   # hard-stop rule dựa trên compliance field
  privacyScan.mjs                  # scanner phát hiện dữ liệu cá nhân, deterministic
  diffRisk.mjs                     # diff hai snapshot + risk engine rule-based
  manifest.mjs                     # xây refresh manifest (checksum, retrievedAt, evidenceReference)
  reportGen.mjs                    # PR body + issue body (issue dedup qua marker cố định)
  types.mjs                        # SourceHealth / DatasetQuality / BusinessAlert — 3 khái niệm tách biệt
  adapters/recordedFixtureAdapter.mjs  # adapter DUY NHẤT trong PR này — đọc file, không gọi mạng
  fixtures/recorded-source-response.json
  run.mjs                          # CLI: node scripts/data-refresh/run.mjs --dataset=<id> [--dry-run]
reports/data-refresh/
  last-known-good/<datasetId>.json # trạng thái publish gần nhất — CÓ commit vào Git
  <datasetId>.run-report.{json,md} # báo cáo mỗi lần chạy — KHÔNG commit (xem .gitignore)
  <datasetId>.issue-body.md        # nội dung issue theo dõi sức khỏe nguồn — KHÔNG commit
.github/workflows/public-data-refresh.yml  # schedule + workflow_dispatch(dryRun)
```

## Chạy thử cục bộ

```bash
node scripts/data-refresh/run.mjs --dataset=investment-opportunities-daklak-illustrative --dry-run
```

In ra `runStatus=<...> riskLevel=<low-risk|hard-stop>` và (nếu hard-stop) danh sách lý do. `--dry-run`
không bao giờ ghi đè `reports/data-refresh/last-known-good/`.

## Thêm nguồn mới (khi có nguồn thật đã xác nhận compliance)

1. Xác nhận robots.txt/terms of use thủ công **trước** — ghi ngày vào
   `compliance.robotsCheckedAt`/`termsCheckedAt`. Không bao giờ để pipeline tự suy đoán.
2. Xác định `redistributionPolicy` thật (không dùng `unknown` — registry sẽ không được validate
   qua nếu để trống, nhưng `unknown` là giá trị hợp lệ về _shape_, chỉ bị `compliance.mjs` chặn ở
   bước _policy_).
3. Viết adapter mới trong `scripts/data-refresh/adapters/` (không dùng `recorded-fixture` cho
   nguồn thật) — hiện chưa có adapter HTTP thật nào, đây là việc của phase tiếp theo.
4. Thêm entry vào `data/source-registry.yml`, chạy `npm test` để xác nhận qua
   `registry.test.mjs`/AJV parity test.

## Vận hành GitHub Actions

`public-data-refresh.yml` chạy hàng tuần + `workflow_dispatch` (input `dryRun`). Kết quả:

- **low-risk**: mở PR cập nhật `reports/data-refresh/last-known-good/`, bật auto-merge (vẫn cần
  `quality` workflow xanh — không bypass quality gate).
- **hard-stop**: cập nhật (hoặc tạo mới nếu chưa có) **một** issue theo dõi sức khỏe nguồn duy nhất
  (marker `<!-- daklak-data-refresh-source-health -->` trong nội dung để tìm lại), gán
  `shadowhunter67`, gắn nhãn `manual-review-required`.

**Thiết lập một lần trước khi workflow chạy thật lần đầu**: tạo nhãn `manual-review-required`
(`gh label create manual-review-required --color d93f0b`) — workflow không tự tạo nhãn.

## Giới hạn hiện tại (xem thêm ADR 0004 "Phạm vi chưa làm")

- Chỉ có adapter fixture nội bộ — chưa có nguồn thật nào được onboard.
- Chưa có nơi lưu raw evidence thật (GitHub Release asset) — `evidenceReference` hiện là placeholder.
- Chưa có drift-guard tự động cho `source-registry.schema.json` (chỉ AJV-validate một lần trong
  test, không tự phát hiện lệch pha như `schemaDriftGuard.test.ts` đã làm cho domain fixture).
- Workflow chưa được chạy thật trên GitHub Actions (chỉ chạy offline trong `npm test` và thủ công
  cục bộ) — cần một lần chạy `workflow_dispatch(dryRun=true)` thật để xác nhận trước khi tin tưởng
  lịch `schedule`.
