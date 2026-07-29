# Public release runbook (Phase 6)

Quy trình cho người vận hành muốn xuất bản một bản `public-static` thật, dùng dữ liệu từ importer
(Phase 4) thay vì fixture Phase 3. Xem [ADR 0009](../adr/0009-public-projection-and-ui-review-gate.md)
cho lý do thiết kế.

## Điều kiện tiên quyết

- Đã có bundle internal hợp lệ tại vị trí `build:internal-static` đọc
  (`src/assets/data/project-portfolio.generated-fixture-demo.json`), sinh bởi
  `npm run import:data` + `npm run stage:internal-portfolio` — xem `README.md` phần importer.
- **Một người có thẩm quyền đã review nội dung** sẽ được public — projection chỉ lọc theo field
  allowlist kỹ thuật, KHÔNG thay thế bước phê duyệt nghiệp vụ. Không chạy runbook này chỉ vì
  projection "pass" kỹ thuật.
- Cho một public release THẬT (không phải demo/fixture minh hoạ): đã có
  `PublicationDecisionSet` (mỗi record trong bundle internal có quyết định `public`/`excluded` RÕ
  RÀNG do người có thẩm quyền ký) — xem
  [public-projection-policy.md](public-projection-policy.md#publication-decision-phase-7-adr-0010--bắt-buộc-cho-public-release-thật)
  và [ADR 0010](../adr/0010-representative-pilot-and-fail-closed-publication-decisions.md). KHÔNG bỏ
  qua bước này chỉ vì bundle "trông có vẻ" toàn record public — thiếu decision set +
  `--require-publication-decisions` nghĩa là runbook đang chạy ở chế độ mặc định Phase 6 (record
  không tự khai `recordClassification` bị coi là public), phù hợp demo, KHÔNG phù hợp dữ liệu thật.

## Các bước

```bash
# 1. Chiếu bundle internal sang public (build-time, offline). Cho release THẬT, thêm
#    --publication-decisions/--require-publication-decisions (xem điều kiện tiên quyết ở trên).
npm run project:public-data -- \
  --input src/assets/data/project-portfolio.generated-fixture-demo.json \
  --output ./generated-public-data \
  --publication-decisions <decision-set.json> --require-publication-decisions

# 2. Review THỦ CÔNG output — đọc cả 3 file
cat ./generated-public-data/project-portfolio.public.bundle.json
cat ./generated-public-data/public-projection-manifest.json   # counts, checksums, policy version
cat ./generated-public-data/public-projection-report.json     # field/record đã loại + lý do

# 3. Ký approval receipt (Phase 7, ADR 0010) — chép checksum THẬT từ
#    public-projection-manifest.json vừa sinh (sourceNormalizedContentChecksum,
#    projectedContentChecksum, allowedFieldPolicyVersion, publicationDecisionSetChecksum) vào một
#    file receipt (xem PublicApprovalReceipt trong approvalReceipt.ts cho shape đầy đủ + reviewer/
#    decidedAt/referenceId). Bỏ qua bước này nếu chỉ đang release demo/fixture (không dùng
#    --require-approval-receipt ở bước 4).

# 4. Nếu đạt yêu cầu, stage vào vị trí public-static build đọc — release THẬT dùng
#    --approval-receipt/--require-approval-receipt để buộc receipt khớp checksum thật của output.
npm run stage:public-portfolio -- \
  --input ./generated-public-data \
  --approval-receipt <receipt.json> --require-approval-receipt

# 5. Đăng ký checksum thật vào config/public-data-files.json (2 entry:
#    project-portfolio.public-projected.json + project-portfolio.public-projection-manifest.json)
node -e "const {createHash}=require('crypto');const {readFileSync}=require('fs');for (const f of ['src/assets/data/project-portfolio.public-projected.json','src/assets/data/project-portfolio.public-projection-manifest.json']) console.log(f, createHash('sha256').update(readFileSync(f)).digest('hex'));"

# 6. Build + validate
npm run build:public-static
npm run validate:portfolio-data-mode:public-static
npm run generate:public-manifest
npm run validate:public-build
npm run build
npm run validate:public-build:dist

# 7. git add + review diff thủ công trước khi commit — KHÔNG script nào tự commit. Kèm theo
#    decision-set.json + receipt.json đã ký vào cùng commit (bằng chứng phê duyệt, không phải bí
#    mật — không chứa giá trị nhạy cảm, chỉ ID/checksum/lý do).
```

## Điều gì runbook này KHÔNG làm

- Không tự động phê duyệt classification của dữ liệu nguồn.
- Không kiểm tra dữ liệu cá nhân/nhạy cảm ngoài field allowlist đã khai báo sẵn — nếu dữ liệu nguồn
  chứa PII trong một field ĐÃ nằm trong allowlist (ví dụ ai đó vô tình điền tên người vào
  `Project.description`), projection KHÔNG phát hiện được — đây là trách nhiệm review ở bước 2.
- Không cấp quyền host `public-static` build ở đâu — đó là quyết định hạ tầng riêng.

## Rủi ro cần nhớ

- Static site public không có access control — bất kỳ ai truy cập được URL đều đọc được TOÀN BỘ
  bundle đã chiếu (không có khái niệm "một phần trang", toàn bộ JSON nằm trong bundle JS).
- Projection giảm dữ liệu theo allowlist đã khai báo SẴN, không phản ứng động theo nội dung thật —
  một field allowlist quá rộng chỉ lộ ra khi có dữ liệu thật đi qua nó, không phải lúc thiết kế
  allowlist.
