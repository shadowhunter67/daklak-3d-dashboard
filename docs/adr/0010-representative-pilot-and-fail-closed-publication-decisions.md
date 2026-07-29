# ADR 0010 — Representative pilot rehearsal and fail-closed publication decisions

- Status: accepted
- Date: 2026-07-29
- Liên quan: [ADR 0006](0006-canonical-project-portfolio-data-contract.md) (canonical bundle),
  [ADR 0007](0007-offline-project-data-importer-and-last-known-good-promotion.md) (importer,
  atomic staging), [ADR 0009](0009-public-projection-and-ui-review-gate.md) (public projection
  engine, Quyết định 2 — record classification mặc định public khi vắng mặt, "backlog Phase 7 nếu
  cần")

## Bối cảnh

Một bản review kỹ thuật độc lập chạy sau khi Phase 6 merge (commit `5fb40cee`) xác nhận kiến trúc
đúng hướng nhưng nêu 2 finding HIGH và 3 MEDIUM cụ thể:

- **F-001**: chưa có lần chạy nào đưa output importer THẬT (không phải fixture JSON viết tay) qua
  public projection engine — ADR 0009 tự ghi nhận giới hạn này trong backlog của chính nó.
- **F-002**: `resolveRecordClassification` (Phase 6) mặc định record là `'public'` khi không tự khai
  `recordClassification` — an toàn thực sự dồn hết vào field-level allowlist; với một bundle THẬT
  chứa cả record public lẫn không-public trộn lẫn, không có cơ chế nào buộc người vận hành phải quyết
  định RÕ RÀNG record nào được công bố trước khi field-allowlist chạy.
- **F-003**: `validate:project-data-contract`/`test:public-projection`/`verify:portfolio-data-modes`
  chạy được local nhưng không có trong `.github/workflows/quality.yml`.
- **F-004**: UI review Phase 6 (ADR 0009) chỉ phủ 2/5 viewport yêu cầu.
- **F-005**: phê duyệt công bố (public-release-runbook.md bước 2, "review THỦ CÔNG") không buộc chặt
  vào checksum cụ thể của output đã duyệt — output có thể bị regenerate sau khi duyệt mà receipt cũ
  (nếu có) vẫn "trông như" còn hợp lệ.

Phase 7 đóng F-001, F-002, F-003, F-005 và một phần F-004 (UI verify bằng dữ liệu pilot, không phải
Codex loop đầy đủ — xem Quyết định 4). Không thêm database/backend/API/authentication — toàn bộ vẫn
build-time/offline, đúng kiến trúc đã có.

## Quyết định 1 — Publication decision là artifact TÁCH RIÊNG, fail-closed khi bật, không sửa canonical schema

Cân nhắc 2 hướng cho F-002:

1. Thêm field `recordClassification` THẬT vào canonical JSON Schema (biến field TypeScript-only hiện
   tại thành field chính thức).
2. Một artifact JSON riêng (`PublicationDecisionSet`) key theo `entityKind:recordId`, KHÔNG sửa
   canonical schema.

Chọn (2). Lý do: canonical schema là hợp đồng dữ liệu — đổi nó ảnh hưởng mọi bundle hiện có, mọi
importer, mọi test schema-drift-guard. Một artifact tách riêng chỉ ảnh hưởng bước projection (build-
time, offline), không đụng canonical bundle/importer/domain logic — đúng nguyên tắc "thay đổi tối
thiểu cần thiết" (không lặp lại phần đã hoàn thành, không mở rộng phạm vi nếu chưa cần — xem prompt
review gốc). Đây CHÍNH LÀ lựa chọn ADR 0009 để ngỏ ("backlog Phase 7 nếu cần") — Phase 7 chọn nhánh
không sửa schema.

Thiết kế:

```ts
type PublicationDecisionValue = 'public' | 'excluded';
interface PublicationDecisionEntry {
  entityKind: CanonicalEntityKind;
  recordId: string; // entityKind:recordId → key tra cứu O(1)
  decision: PublicationDecisionValue;
  reason: string;
  decidedBy: string;
  decidedAt: string;
}
interface PublicationDecisionSet {
  policyVersion: string;
  generatedAt: string;
  decisions: readonly PublicationDecisionEntry[];
}
```

`projectCanonicalBundleToPublic` nhận thêm `publicationDecisions?` + `requirePublicationDecisions?`
(mặc định `false`). Khi `requirePublicationDecisions=true`: record KHÔNG có entry trong decision set
bị LOẠI (fail-closed) — khác hẳn hành vi Phase 6 ("thiếu = public"). Khi `false` (mặc định, không
truyền gì): hành vi Phase 6 giữ NGUYÊN 100% — toàn bộ 18 test cũ của Phase 6 pass không sửa. Quyết
định trong decision set LUÔN được ưu tiên trên `recordClassification` tự khai của record (một record
không thể tự "khai mình public" để vượt qua quyết định đã ký).

CLI (`scripts/public-projection/cli.ts`) thêm 2 flag tuỳ chọn: `--publication-decisions <path>`,
`--require-publication-decisions`. Không bật hai flag này = hành vi cũ, không phá quy trình
demo/fixture hiện có.

## Quyết định 2 — Approval receipt buộc chặt vào checksum CHÍNH XÁC của output đã duyệt

`PublicApprovalReceipt` (F-005): một artifact JSON chứa
`{ sourceNormalizedContentChecksum, projectedContentChecksum, allowedFieldPolicyVersion,
publicationDecisionSetChecksum, reviewer, decidedAt, referenceId? }`. `stage_public_portfolio_bundle.ts
--require-approval-receipt` so khớp TUYỆT ĐỐI với manifest đang stage trước khi ghi bất kỳ file nào —
một checksum lệch (output bị regenerate sau khi duyệt) chặn stage, báo rõ field nào không khớp. Không
bật flag này = hành vi Phase 6 giữ nguyên (stage không cần receipt, phù hợp demo/fixture).

Đây vẫn KHÔNG phải workflow phê duyệt runtime — receipt là file tĩnh, ký/ghi thủ công offline, đúng
kiến trúc "không backend" toàn bộ pipeline. Không thay thế phê duyệt nghiệp vụ con người (vẫn đúng
nguyên tắc "public projection không phải publication approval", ADR 0009 §3).

## Quyết định 3 — Pilot rehearsal dùng CSV, không dùng canonical JSON viết tay

F-001 cần chứng minh IMPORTER THẬT (không phải fixture JSON) đi qua projection engine. Chọn nguồn CSV
(`data-templates/pilot/phase7-integration-rehearsal/`) thay vì thêm một canonical JSON fixture nữa —
CSV buộc đi qua toàn bộ đường ống thật (`csvColumnSpecs.ts`, `normalize.ts`, mapper, validate, `--
strict`, `--source-registry`), trong khi một fixture JSON viết tay bỏ qua gần hết các bước đó (đây
chính xác là giới hạn `data-templates/examples/representative-valid/` đã có từ Phase 3). Dữ liệu vẫn
hư cấu 100% — chỉ khác Ở CHỖ đi qua đúng ống dẫn thật, không phải ở việc trở thành "dữ liệu thật".

Fixture pilot cố ý có 1 project (`pilot-proj-004`) hợp lệ về dữ liệu nhưng bị đánh dấu `excluded`
trong publication decision, để chứng minh Quyết định 1 hoạt động trên một trường hợp thật (không chỉ
unit test) — xem `docs/project-data-import/phase7-pilot-rehearsal.md` cho log lệnh + checksum thật.

Không lặp lại negative-path (FK gãy, ID trùng, dataset id lạ) trong pilot mới — 11 fixture âm tính đã
có ở `data-templates/examples/invalid/`, được `test:project-data-import` bao phủ.

## Quyết định 4 — UI verification bằng dữ liệu pilot, KHÔNG chạy lại Codex UI review loop đầy đủ

Phase 7 KHÔNG thêm màn hình/component UI mới — chỉ thêm dữ liệu (pilot bundle) chảy qua UI hiện có.
Rủi ro regression UI vì vậy thấp hơn nhiều so với Phase 6 (đổi code UI thật). Quyết định: verify thủ
công (build `internal-static` thật với bundle pilot, mở qua chrome-devtools, xác nhận không lỗi
console/không tràn layout với text tiếng Việt dài, xác nhận authoritative-snapshot chọn đúng bản
`approved` giữa 3 snapshot cạnh tranh), KHÔNG chạy đủ vòng Codex 5-viewport × 2-ngôn ngữ × Codex loop
như ADR 0009 — hoãn tới khi có PHASE nào thật sự đổi code UI. F-004 (viewport Phase 6 còn thiếu:
1280×800, 768×1024, 320×700, trạng thái loading/error/degraded) vẫn CHƯA đóng — ghi lại như backlog,
không giả vờ đã làm.

## Không làm (do không có nhu cầu cụ thể, tránh scope creep)

- Không thêm database/backend/API/authentication/approval-workflow runtime.
- Không sửa canonical JSON Schema (xem Quyết định 1).
- Không viết XLSX parser (vẫn hoãn — không có nguồn thật nào đòi hỏi XLSX).
- Không tự động hoá "publication decision" (vd tự suy luận từ field nào đó) — quyết định LUÔN từ một
  file tĩnh do người có thẩm quyền ghi thủ công.
- Không tự merge (theo yêu cầu quy trình của phiên làm việc tạo Phase 7).

## Hệ quả

- `ProjectionManifest` có thêm field optional `publicationDecisionSetChecksum: string | null` —
  additive, một manifest Phase 6 cũ (không có field này) vẫn đọc được.
- Không có breaking change nào cho demo/internal-static build hiện có — toàn bộ thay đổi nằm trong
  luồng `public-static`/CLI projection, có opt-in bằng flag.
- README, `public-release-runbook.md`, `public-projection-policy.md` cập nhật để mô tả 2 flag mới và
  khi nào một public release THẬT bắt buộc dùng chúng.
