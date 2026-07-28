# Public projection policy (Phase 6)

Nguồn thật cho quyết định thiết kế: [ADR 0009](../adr/0009-public-projection-and-ui-review-gate.md).
Tài liệu này là hướng dẫn vận hành/tham chiếu nhanh — không lặp lại lý do kiến trúc đã có trong ADR.

## Nguyên tắc

1. **Allowlist, không denylist.** `config/public-project-fields.json` liệt kê field được phép public
   cho từng entity (`projects`, `workPackages`, `milestones`, `projectIssues`, `progressSnapshots`,
   `agencies`, `contractors`, `evidence`, `referenceDocuments`). Field không có trong danh sách LUÔN
   bị loại — kể cả field mới thêm vào canonical schema sau này mà chưa ai cập nhật allowlist.
2. **Projection chạy build-time/offline, không bao giờ trong browser.** Xem
   `src/entities/project/publicProjection/projectPublicBundle.ts` — hàm thuần, chỉ được gọi từ
   `scripts/public-projection/cli.ts` (Node) và test.
3. **Bundle-level classification là gate cứng, không phải gợi ý.** Bundle nguồn có
   `classification ∈ {restricted, confidential}` → `projectCanonicalBundleToPublic` throw
   `PublicProjectionRefusedError`, không sinh output nào.
4. **Projection không tự cấp quyền công bố.** Field/record nằm trong allowlist chỉ có nghĩa "được
   phép về mặt kỹ thuật để lọt qua bộ lọc" — KHÔNG có nghĩa dữ liệu đã được người có thẩm quyền phê
   duyệt công bố. Xem `docs/project-data-import/public-release-runbook.md`.
5. **Re-validate sau projection.** CLI chạy lại JSON Schema + referential-integrity check trên
   bundle ĐÃ chiếu trước khi ghi file — không có "best-effort", fail-closed.

## Thêm field mới vào allowlist

1. Xác định field đó có nên public không, theo cùng thứ tự câu hỏi trong
   `docs/data-classification.md` §"Choosing a classification for a new dataset" (áp dụng tương tự
   cho field: field này có gây hại/lộ thông tin cá nhân nếu công khai vĩnh viễn không?).
2. Nếu field là REQUIRED trong `data-templates/schemas/definitions/*.schema.json`, allowlist BẮT
   BUỘC phải bao gồm nó — thiếu sẽ làm mọi lần chạy `project:public-data` fail ở bước JSON Schema.
3. Thêm field vào mảng tương ứng trong `config/public-project-fields.json`, chạy lại
   `npm run test:public-projection` (test contract nằm ở
   `src/entities/project/publicProjection/projectPublicBundle.test.ts`).

## Loại trừ có chủ đích (không public dù có mặt trong canonical bundle)

- `Project.projectManagerId`, `ProjectIssue.ownerUserId` — định danh cá nhân.
- `Evidence.note` — ghi chú tự do có thể chứa nội dung nội bộ chưa qua kiểm duyệt.
- `Project.approvalDecision` — số hiệu văn bản nội bộ chưa xác nhận công khai.
- Mọi `auditEvents` — không bao giờ public (không nằm trong danh sách entity được phép chiếu).

## Record-level classification (hiện tại: chưa phải per-record thật)

Canonical JSON Schema (Phase 3-5) chưa có field classification ở mức từng record — chỉ có
`CanonicalBundleMetadata.classification` ở mức BUNDLE. `projectCanonicalBundleToPublic` hỗ trợ một
field optional `recordClassification` (không có trong schema hiện tại, dự phòng cho tương lai);
khi vắng mặt, mặc định coi là `'public'` — an toàn thực sự nằm ở field-level allowlist (mục 1), không
phải ở giả định "record chưa gắn nhãn thì nguy hiểm". Nếu một ngày canonical schema có
classification thật ở mức record, cập nhật logic này để field đó điều khiển việc loại RECORD (không
chỉ field) — xem `resolveRecordClassification` trong `projectPublicBundle.ts`.

## Chạy thật

```bash
npm run project:public-data -- --input <đường-dẫn-bundle-internal> --output ./generated-public-data
# review thủ công ./generated-public-data/*.json
npm run stage:public-portfolio -- --input ./generated-public-data
npm run build:public-static
npm run validate:portfolio-data-mode:public-static
```

`generated-public-data/` bị gitignore — không commit output projection thô, chỉ commit sau khi đã
stage vào `src/assets/data/`.
