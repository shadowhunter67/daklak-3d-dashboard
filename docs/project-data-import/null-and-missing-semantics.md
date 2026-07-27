# Null, optional và missing — semantics

Phase 3. Áp dụng cho canonical bundle và cho fixture/generated JSON nói chung.

## Bảng năm trạng thái

```text
Field absent (key không xuất hiện)   → field optional trong TS type — không bắt buộc phải có.
Field present, giá trị null          → JSON Schema không cho phép null trên bất kỳ field nào ở
                                       schema hiện tại (không có field nào khai `"type": ["string",
                                       "null"]`) — nếu một field optional không có giá trị, XOÁ HẲN
                                       key đó khỏi object, không ghi `null`. Quyết định này khác với
                                       nguyên tắc chung "dùng null cho thiếu dữ liệu" ở tầng UI
                                       (KpiResult.value: null) — ở tầng WIRE FORMAT, "vắng mặt" và
                                       "null" được coi là MỘT khái niệm duy nhất để tránh JSON Schema
                                       phải khai hai kiểu cho mọi field optional. Phase 4 (importer)
                                       chịu trách nhiệm coerce cell CSV rỗng → OMIT KEY, không phải
                                       → null.
Field present, giá trị 0             → giá trị nghiệp vụ hợp lệ (vd disbursedAmount: 0 nghĩa là
                                       "chưa giải ngân đồng nào", KHÔNG phải "thiếu dữ liệu"). Không
                                       bao giờ dùng 0 để biểu diễn "không tính được"/"chưa biết" —
                                       xem KpiResult.status: 'unavailable' + value: null ở tầng KPI
                                       (khác tầng wire format — KPI là kết quả TÍNH TOÁN, không phải
                                       một field trong canonical bundle).
Field present, chuỗi rỗng ""         → KHÔNG hợp lệ cho bất kỳ field nào có `minLength: 1`
                                       (identifier, name, title...) — JSON Schema chặn (xem
                                       data-templates/examples/invalid/empty-required-string.json).
                                       Field text tự do không bắt buộc non-empty (vd
                                       `description`) VẪN chấp nhận "" về mặt schema, nhưng nên tránh
                                       — "" cho description nghĩa là "không có mô tả", nên omit field
                                       nếu field đó optional, hoặc ghi rõ "(chưa có mô tả)" nếu field
                                       bắt buộc.
Field present, mảng rỗng []          → "đã biết là không có liên kết nào" — khác field vắng mặt.
                                       Ví dụ: `ProjectIssue.evidenceIds: []` nghĩa là "issue này
                                       không có evidence nào đính kèm" (đã xác nhận), trong khi field
                                       array KHÔNG optional trong domain type hiện tại (evidenceIds,
                                       administrativeAreaCodes yêu cầu ít nhất 1 phần tử — mảng rỗng
                                       cho administrativeAreaCodes bị `validateProjectRecord` từ chối
                                       vì "dự án cần ít nhất một bộ lọc không gian").
```

## Field nào bắt buộc non-empty, field nào cho phép rỗng

Tra theo JSON Schema (`data-templates/schemas/definitions/*.schema.json`,
`common.schema.json#/definitions/nonEmptyString`): mọi field dùng `nonEmptyString` (id, code,
name/title, sourceDatasetId, sourceRecordId, dataOwner khi bắt buộc...) cấm chuỗi rỗng. Field dùng
`{"type": "string"}` trần (không qua `nonEmptyString`) cho phép chuỗi rỗng về mặt schema — hiện tại
là các field text tự do/không bắt buộc (`description`, `note`, `approvalDecision`...).

## Không triển khai tri-state đầy đủ cho mọi field

Rule cho phép giới hạn phạm vi: domain hiện tại (Phase 0-3) chưa phân biệt tường minh "chưa nhập"
với "đã xác nhận không có giá trị" cho MỌI optional field (vd `Project.adjustedBudget` vắng mặt có
thể nghĩa là "chưa điều chỉnh ngân sách" hoặc "chưa nhập dữ liệu điều chỉnh" — hai ý nghĩa khác
nhau, domain hiện tại không phân biệt được). Đây là limitation đã biết, không phải bug — thêm
tri-state (vd một field `adjustedBudgetStatus: 'not-applicable' | 'not-yet-entered'`) là một quyết
định mở rộng domain cần use case thật từ Phase 4 importer, không làm trước khi có nhu cầu (đúng rule
"không thêm field chưa có use case và compatibility analysis").
