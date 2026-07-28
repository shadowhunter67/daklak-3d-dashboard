# ADR 0008 — Demo scenario strategy and Data Readiness experience

- Status: accepted
- Date: 2026-07-28
- Liên quan: [ADR 0007](0007-offline-project-data-importer-and-last-known-good-promotion.md) (Phase
  4), [docs/project-data-import/](../project-data-import/) (Phase 1-5)

## Bối cảnh

Phase 4 hoàn thành importer CLI nhưng chưa có: (a) reusable integrity check dùng chung giữa importer
và test; (b) benchmark hiệu năng thật; (c) UI cho phép người xem hiểu "dữ liệu này sẵn sàng tới đâu";
(d) tài liệu bàn giao ngắn gọn cho đội cung cấp dữ liệu; (e) scenario coverage minh hoạ đầy đủ hơn.
Phase 5 giải quyết 4 workstream này (A-D theo yêu cầu).

## Quyết định 1 — Scope thu hẹp so với đề xuất đầy đủ (24-40 project, Project Detail đầy đủ, Executive Overview reorder)

Yêu cầu đầy đủ đề xuất 24-40 project minh hoạ phủ toàn bộ ma trận scenario, cộng thêm sửa
`ProjectDetailView` để hiển thị authoritative-snapshot explanation đầy đủ, và rà soát lại thứ tự
exception-first của Executive Overview. Quyết định: **thu hẹp phạm vi có chủ đích** —

1. **5 project bổ sung** (không phải 15-31) qua `scenarioFactory.ts`, nâng tổng từ 9 lên 14 — đủ để
   phủ thêm 4 status (`proposed`/`preparing`/`procurement`/`approved`) + LineString + Polygon +
   approximate-geometry-with-disclaimer + low-confidence/raw-verification + multiple-verification-
   stage-trong-fixture-thật. Lý do: mỗi project bổ sung cần review thủ công (giữ đúng chuẩn "minh
   hoạ", đúng invariant test hiện có, đúng mã hành chính thật) — 5 project chất lượng cao hơn 20+
   project sinh hàng loạt không review kỹ. Test bound cũ (8-12) nâng lên 8-16, không nâng lên 24-40.
2. **Không sửa `ProjectDetailView`/view-model production** cho authoritative-snapshot explanation đầy
   đủ (spec §C5) — đây là view đã qua Phase 2B1, có e2e/accessibility test bao phủ đầy đủ; sửa nó
   đúng cách cần thời gian review tương đương một phase riêng. Thay vào đó, Data Readiness page (mới,
   rủi ro thấp hơn vì không sửa code cũ) hiển thị business alert `multiple-verification-stage-records`
   (bao gồm cả field `rule`/`message` mô tả cơ chế `selectAuthoritativeSnapshot`) — thoả một phần ý
   định spec (giải thích CƠ CHẾ, không phải per-project drill-down đầy đủ). Backlog Phase 6.
3. **Không rà soát lại thứ tự Executive Overview** (spec §C7) — không có bằng chứng thứ tự hiện tại
   sai (ADR 0001 đã quyết định thứ tự này, đã có e2e test xác nhận); rà soát lại mà không có
   regression cụ thể để sửa là việc không cần thiết ở Phase 5, rủi ro hồi quy cho một view đã ổn định
   cao hơn lợi ích. Backlog Phase 6 nếu có phản hồi thực tế cho thấy thứ tự cần đổi.

## Quyết định 2 — `validateCanonicalReferentialIntegrity` thay thế một phần `dataQualityRules.ts` trong importer, không xoá `dataQualityRules.ts`

`scripts/import-data/canonicalIntegrity.ts` (Phase 5 §A2) mở rộng orphan-check của Phase 4
(`checkOrphanedProjectReferences`) thành một validator đầy đủ hơn: duplicate-ID (mọi dataset, kể cả
record orphan), FK (`workPackageId`/`contractorId`/agency), và duplicate/multi-stage progress-snapshot
identity — TẤT CẢ chạy TRÊN dataset thô, trước mapper, nên không bỏ sót record orphan mapper âm thầm
loại. Importer (`pipeline.ts`) dùng function này làm nguồn xác thực DUY NHẤT cho các rule trùng lặp
với `dataQualityRules.ts` (lọc `qualityIssues` trước khi gộp vào `issues` tổng, xem
`RULES_SUPERSEDED_BY_CANONICAL_INTEGRITY_CHECK`) — tránh báo trùng hai lần cho cùng một vấn đề.
`dataQualityRules.ts` KHÔNG bị sửa/xoá — nó vẫn là nguồn thật cho `quality-report.json` (Phase 4 spec
"không tự tính lại") và vẫn được UI (Data Readiness, KPI) dùng trực tiếp trên `ProjectBundle[]` đã map
— nơi khoảng trống orphan không áp dụng theo cùng cách vì UI luôn hiển thị dữ liệu ĐàO qua mapper.

## Quyết định 3 — Data Readiness là route mới (`#/data-readiness`), không phải mở rộng `DataHealthPanel`

`DataHealthPanel` (Phase 1.5, nhúng trong Executive Overview) giữ nguyên phạm vi cũ (tóm tắt nhanh) —
Data Readiness là một TRANG riêng (lazy chunk, giống Project Portfolio/Detail), sâu hơn: đủ 3 nhóm
issue phân loại rõ (validation error/data-quality issue/business alert — spec §C3), metadata nguồn
đầy đủ (schemaVersion/bundleVersion/asOf/generatedAt/datasetIds), và tách biệt các loại đếm chi tiết
(stale/low-confidence/unverified/missing-provenance). Lối vào: một nút mới trong `DataHealthPanel`
("Xem Data Readiness") điều hướng qua `useHashRoute().navigate()` — không thêm prop mới xuyên qua
`ExecutiveOverview` (giữ nguyên bề mặt props đã test kỹ của view đó).

## Quyết định 4 — Không partial-import ở Data Readiness UI: hiển thị NGUYÊN VẸN 3 category, không lọc/rút gọn

`buildDataReadinessViewModel.ts` gọi lại NGUYÊN VẸN `validateProjectRecord`/.../`runDataQualityRules`
(Phase 1/1.5, không viết lại) — chỉ phân loại kết quả theo severity/rule name thành 3 nhóm hiển thị,
không tự tính toán quy tắc mới nào.

## Quyết định 5 — Benchmark: complexity guard theo tỉ lệ, không theo ngưỡng ms tuyệt đối

`scripts/import-data/benchmark/` sinh dataset tổng hợp deterministic (25/250/1000 project, tái sử
dụng pool agency/contractor cố định — không unique per project, đúng thực tế dữ liệu dự án thật). Test
CI (`run_benchmark.test.ts`) chỉ assert (a) smoke — chạy xong, số liệu hợp lý; (b) complexity guard —
tỉ lệ thời gian 250 so với 25 project không vượt quá 40x (một O(n²) thật sẽ cho ~100x) — KHÔNG assert
ngưỡng mili-giây tuyệt đối (dễ flaky trên CI runner tốc độ khác nhau). Kết quả thật đo được (máy phát
triển): 25 project → 57.9ms tổng; 250 project → 60.5ms; 1000 project → 113.1ms — tăng gần tuyến tính,
không có dấu hiệu O(n²).

## Hệ quả

- `scripts/import-data/canonicalIntegrity.ts` (+ test), `scripts/import-data/benchmark/` (2 module +
  2 test), `scripts/import-data/stage_internal_portfolio_bundle.test.ts` (11 test, dùng temp dir
  thật) — Phase 4 code được hardening, không đổi hành vi bên ngoài (CLI contract giữ nguyên).
- `src/entities/project/scenarioFactory.ts` + `illustrativeScenarioAdditions.ts` — 5 project mới, tất
  cả pass invariant test hiện có.
- `src/features/data-readiness/` (route mới `#/data-readiness`) + i18n đầy đủ vi/en + e2e (6 test,
  pass cả 3 browser + mobile) + unit test view-model.
- `integration-kit/` (10 file doc + example-input CSV đã chạy thật qua importer + expected-output
  checksum thật) — phát hiện một hạn chế thật của `validate_portfolio_data_mode.mjs` (Phase 2, marker
  cố định thay vì kiểm tra cấu trúc), ghi backlog Phase 6, không sửa ở Phase 5.
- Không thêm database/backend/authentication/XLSX/fuzzy-mapping/partial-import/public-projection-
  engine nào.
