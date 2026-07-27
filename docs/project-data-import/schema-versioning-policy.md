# Schema versioning policy — canonical project portfolio bundle

Phase 3. Nguồn sự thật là `src/entities/project/canonicalBundle.ts` (giá trị hằng số) — tài liệu này
chỉ giải thích chính sách, không lặp lại giá trị.

## Hai version, hai câu hỏi khác nhau

|                         | `schemaVersion`                                                                            | `bundleVersion`                                 |
| ----------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| Trả lời câu hỏi         | "Cấu trúc JSON này có hình dạng gì?"                                                       | "Đây là lần xuất dữ liệu nào?"                  |
| Đổi khi nào             | Cấu trúc field/type/enum đổi                                                               | Mỗi lần importer/fixture chạy thành công        |
| Ai kiểm tra             | `GeneratedJsonProjectPortfolioSource` (allowlist runtime) + JSON Schema (định dạng semver) | Không ai "kiểm tra" — chỉ để so sánh hai bundle |
| Có dùng timestamp không | Không bao giờ                                                                              | Không bao giờ (xem dưới)                        |

**Không dùng timestamp làm `bundleVersion`.** Hai lần chạy importer trong cùng một giây (hoặc chạy
lại để sửa lỗi vận hành, không đổi dữ liệu) sẽ có timestamp gần như nhau nhưng KHÔNG có nghĩa là
cùng một version theo ngữ nghĩa "phiên bản dữ liệu" — dùng một bộ đếm/định danh do
importer/quy trình vận hành tự quyết định (vd `2026.07.27-01`, hoặc semver độc lập với
`schemaVersion`).

## Khi nào tăng major `schemaVersion`

- Xoá một field đã có.
- Đổi kiểu dữ liệu của một field (vd `string` → `number`).
- Thu hẹp enum (bỏ một giá trị đang được dùng).
- Đổi semantics của một field theo cách phá compatibility (vd đổi ý nghĩa `asOf` từ "ngày dữ liệu
  có hiệu lực" sang "ngày dữ liệu được duyệt").

Thêm field mới (optional) hoặc mở rộng enum (thêm giá trị mới) **không** cần tăng major — đó là
additive, tương thích ngược, giữ nguyên `schemaVersion`.

## Chính sách bốn tình huống bắt buộc

```text
supported schema versions      → SUPPORTED_CANONICAL_SCHEMA_VERSIONS (canonicalBundle.ts) — allowlist tường minh
unsupported version behavior   → GeneratedJsonProjectPortfolioSource trả status:'error',
                                  error.kind:'unsupported-schema-version' — KHÔNG parse best-effort
future version behavior        → Một schemaVersion "lớn hơn" (vd '2.0.0' khi mới hỗ trợ '1.0.0')
                                  bị từ chối GIỐNG HỆT version cũ không hỗ trợ — không có ngoại lệ
                                  "có thể tương thích ngược, cứ thử parse xem"
missing version behavior       → JSON Schema (project-portfolio-bundle.schema.json) yêu cầu
                                  schemaVersion là required field — bundle thiếu field này FAIL
                                  Layer 1 trước khi tới bước kiểm tra allowlist
```

`SUPPORTED_CANONICAL_SCHEMA_VERSIONS` là một **allowlist**, không phải một phép so sánh
"≥ minimum version" — một version tương lai chưa từng được thêm vào danh sách này bị từ chối dù về
lý thuyết nó có thể tương thích ngược. Lý do: importer/nguồn dữ liệu không có cách nào tự chứng minh
tính tương thích ngược của một version chưa từng được review — an toàn hơn là từ chối tường minh và
để người duy trì `canonicalBundle.ts` quyết định khi nào thêm version mới vào allowlist.

## JSON Schema chỉ kiểm tra ĐỊNH DẠNG, không kiểm tra allowlist

`project-portfolio-bundle.schema.json`'s `schemaVersion` field chỉ có `"pattern":
"^[0-9]+\\.[0-9]+\\.[0-9]+$"` — xác nhận đây LÀ một chuỗi semver, không xác nhận nó có được HỖ TRỢ
hay không. Việc allowlist là quyết định runtime (`isSupportedCanonicalSchemaVersion`), không phải
một constraint JSON Schema — lý do: JSON Schema là một tài liệu tĩnh đi kèm mã nguồn, thay đổi
allowlist không nên buộc phải sửa JSON Schema (hai mối quan tâm khác nhau, thay đổi độc lập nhau).
Xem `data-templates/examples/invalid/unknown-schema-version.json` — file này **PASS** JSON Schema có
chủ đích, minh hoạ đúng ranh giới này.
