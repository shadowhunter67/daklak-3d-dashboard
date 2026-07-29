# ADR 0011 — Non-silent enforcement of Phase 7 fail-closed flags

- Status: accepted
- Date: 2026-07-29
- Liên quan: [ADR 0010](0010-representative-pilot-and-fail-closed-publication-decisions.md) (publication
  decision + approval receipt), review post-merge Phase 7 (finding F-007, F-009)

## Bối cảnh

Một lượt review kỹ thuật độc lập sau khi Phase 7 merge (commit `99f212c`) tái hiện trực tiếp một khoảng
trống: `npm run project:public-data`/`npm run stage:public-portfolio` chấp nhận `--require-publication-
decisions`/`--require-approval-receipt` như flag TUỲ CHỌN. Chạy đúng hai lệnh documented trong
`public-release-runbook.md` nhưng QUÊN một trong hai flag đó khiến:

1. Một record đã bị đánh dấu `excluded` trong publication-decision set vẫn được xuất sang public bundle
   (rơi về mặc định Phase 6: thiếu quyết định = public).
2. `stage:public-portfolio` ghi file public-static thật mà KHÔNG kiểm tra bất kỳ approval receipt nào.

Cả hai xảy ra **im lặng** — exit code 0, không log nào cảnh báo rằng bảo vệ fail-closed đã bị bỏ qua.
Đây là F-007 trong bản review.

## Quyết định 1 — Cảnh báo không chặn, không đổi exit code mặc định

Cân nhắc 3 hướng:

1. Đổi exit code khi thiếu flag (chặn cứng) — bị loại: sẽ phá vỡ mọi demo/fixture workflow hiện có
   (Phase 6 cũ, `data-templates/examples/`, tests) vốn CHỦ Ý không cần các flag này.
2. Không làm gì, chỉ dựa vào tài liệu — đây chính là trạng thái đã bị review chỉ ra là không đủ.
3. In cảnh báo rõ ràng ra `stderr` khi chạy KHÔNG kèm flag, giữ nguyên exit code 0.

Chọn (3). Lý do: giữ đúng nguyên tắc "không backend, không workflow phê duyệt runtime" — một cảnh báo
CLI là cơ chế đúng tầng (build-time/offline, người vận hành tự đọc output), không cần thêm trạng thái
hay service nào. Không đổi hành vi mặc định nghĩa là 100% test/demo/fixture hiện có tiếp tục chạy y
nguyên (đã xác nhận: toàn bộ `test:public-projection` cũ pass không sửa).

Vị trí implement:

- `scripts/public-projection/cli.ts`: cảnh báo khi thiếu `--require-publication-decisions`.
- `scripts/public-projection/stage_public_portfolio_bundle.ts`: cảnh báo khi thiếu
  `--approval-receipt`.

## Quyết định 2 — Thêm npm script "release" hardcode flag, thay vì chỉ dựa vào cảnh báo

Cảnh báo (Quyết định 1) vẫn có thể bị bỏ qua nếu người vận hành không đọc kỹ output. Thêm hai npm
script mới, hardcode sẵn flag bắt buộc:

```json
"project:public-data:release": "tsx scripts/public-projection/cli.ts --require-publication-decisions",
"stage:public-portfolio:release": "tsx scripts/public-projection/stage_public_portfolio_bundle.ts --require-approval-receipt",
```

Gọi qua `npm run project:public-data:release -- --input ... --output ... --publication-decisions ...`
— các tham số CLI append phía sau flag đã hardcode. Đây là lối đi KHUYẾN NGHỊ cho một public release
THẬT (đã cập nhật vào `public-release-runbook.md`); `project:public-data`/`stage:public-portfolio` gốc
(không hardcode flag) vẫn giữ nguyên cho demo/fixture, không bị xoá hay đổi hành vi mặc định.

Không thêm một biến môi trường kiểu `DAKLAK_RELEASE_MODE=1` để tự động bật flag — một npm script tường
minh dễ audit hơn (thấy ngay trong `package.json`, không phụ thuộc trạng thái shell ẩn).

## Quyết định 3 — Test tự động cho toàn bộ chuỗi pilot, thay vì chỉ tài liệu hoá thủ công

F-009 (cùng bản review): `docs/project-data-import/phase7-pilot-rehearsal.md` ghi lại kết quả CHẠY
THỦ CÔNG một lần — không có gì tự động re-run để bắt regression. Thêm
`scripts/public-projection/pilotRehearsal.test.ts`: gọi trực tiếp `main()` của cả ba CLI
(`import-data/cli.ts`, `public-projection/cli.ts`, `stage_public_portfolio_bundle.ts`) trên chính bộ
CSV pilot đã có (`data-templates/pilot/phase7-integration-rehearsal/`), trong `tmpdir()` +
`STAGE_PUBLIC_*_TARGET_PATH_OVERRIDE` (không đụng file thật), 5 test case:

1. Fail-closed loại đúng record `excluded`.
2. **Không** có `--require-publication-decisions` → cảnh báo đúng + record quay lại bị public (guard
   chống regression cho chính hành vi F-007 mô tả).
3. Approval receipt khớp → stage thành công.
4. Approval receipt sai checksum → từ chối, không ghi file.
5. **Không** có `--approval-receipt` → cảnh báo đúng nhưng vẫn stage (xác nhận demo path không bị phá).

`test:public-projection` (`package.json`) mở rộng glob từ `src/entities/project/publicProjection` sang
thêm `scripts/public-projection` để CI job `contract-and-modes` (đã có từ Phase 7) tự động chạy 5 test
này mà không cần thêm job CI mới.

## Không làm

- Không chặn cứng (đổi exit code) khi thiếu flag — xem Quyết định 1.
- Không thêm biến môi trường ẩn điều khiển release mode — xem Quyết định 2.
- Không đụng UI/domain/KPI — Phase 8 không có lý do UI nào (không có gì thay đổi trong
  `src/features/**`).
- Không regenerate `src/assets/data/project-portfolio.public-projected.json` (F-008, review post-merge
  Phase 7) — đây là quyết định TÁCH RIÊNG, ngoài phạm vi Phase 8, chưa được giao.

## Hệ quả

- Không breaking change nào — mọi caller hiện có (demo build, test cũ, CI) không đổi hành vi.
- Người vận hành chạy đúng runbook (`*:release` scripts) không thể vô tình bỏ qua fail-closed nữa; người
  chạy lệnh gốc mà quên flag vẫn được cảnh báo rõ ràng thay vì im lặng.
- F-009 đóng: pilot rehearsal giờ có test tự động, chạy trong CI, không chỉ ghi trong tài liệu.
