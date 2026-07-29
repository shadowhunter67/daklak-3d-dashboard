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

## Các bước

```bash
# 1. Chiếu bundle internal sang public (build-time, offline)
npm run project:public-data -- \
  --input src/assets/data/project-portfolio.generated-fixture-demo.json \
  --output ./generated-public-data

# 2. Review THỦ CÔNG output — đọc cả 3 file
cat ./generated-public-data/project-portfolio.public.bundle.json
cat ./generated-public-data/public-projection-manifest.json   # counts, checksums, policy version
cat ./generated-public-data/public-projection-report.json     # field/record đã loại + lý do

# 3. Nếu đạt yêu cầu, stage vào vị trí public-static build đọc
npm run stage:public-portfolio -- --input ./generated-public-data

# 4. Đăng ký checksum thật vào config/public-data-files.json (2 entry:
#    project-portfolio.public-projected.json + project-portfolio.public-projection-manifest.json)
node -e "const {createHash}=require('crypto');const {readFileSync}=require('fs');for (const f of ['src/assets/data/project-portfolio.public-projected.json','src/assets/data/project-portfolio.public-projection-manifest.json']) console.log(f, createHash('sha256').update(readFileSync(f)).digest('hex'));"

# 5. Build + validate
npm run build:public-static
npm run validate:portfolio-data-mode:public-static
npm run generate:public-manifest
npm run validate:public-build
npm run build
npm run validate:public-build:dist

# 6. git add + review diff thủ công trước khi commit — KHÔNG script nào tự commit.
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
