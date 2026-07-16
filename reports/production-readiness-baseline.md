# Production readiness baseline

Ngày audit: 2026-07-16. Baseline được đo trên Windows, Node.js 22 và Python local trước khi thực hiện các thay đổi trong đợt nâng cấp này.

## Quality gates ban đầu

| Gate                          | Kết quả  | Thời gian | Ghi chú                                                                                                                                           |
| ----------------------------- | -------- | --------: | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm ci`                      | Pass     |    7,43 s | 334 package; npm báo 0 vulnerability. Có warning deprecation từ `whatwg-encoding`.                                                                |
| `npm run lint`                | Pass     |    2,54 s | Không có lint error/warning.                                                                                                                      |
| `npm run format:check`        | **Fail** |    0,86 s | 25 file bị Prettier đánh dấu do checkout Windows dùng CRLF (`core.autocrlf=true`); CI Linux trước đó vẫn pass. Đây là lỗi tái lập cross-platform. |
| `npm run typecheck`           | Pass     |    2,88 s | TypeScript strict pass.                                                                                                                           |
| `npm test`                    | Pass     |    2,51 s | 19 test, 5 test file.                                                                                                                             |
| `npm run validate:data`       | Pass     |    4,05 s | 102 đơn vị, 88 xã, 14 phường, 0 geometry invalid, 0 overlap; validation 2.030 ms.                                                                 |
| `npm run build`               | Pass     |    9,24 s | Vite build 6,56 s; có warning chunk trên 500 kB.                                                                                                  |
| `npm run check:budget`        | Pass     |    0,35 s | Các budget hiện tại đều pass.                                                                                                                     |
| `npm run test:e2e`            | Pass     |   23,09 s | 12 Chromium tests; đang chạy Vite development server, chưa kiểm tra production output.                                                            |
| `npm audit --audit-level=low` | Pass     |    1,03 s | 0 vulnerability tại thời điểm audit.                                                                                                              |

## Bundle và asset baseline

| Artifact                 | Raw bytes | Gzip bytes (nếu có) |
| ------------------------ | --------: | ------------------: |
| `three-*.js`             |   882.275 |             237.691 |
| application `index-*.js` |   499.378 |             127.804 |
| `vendor-*.js`            |   417.714 |             137.806 |
| `charts-*.js`            |   303.845 |             105.662 |
| Tổng JavaScript          | 2.103.212 |             608.963 |
| Terrain color            | 1.829.459 |                   — |
| Terrain normal           |   719.308 |                   — |
| Terrain height           |   258.103 |                   — |
| Terrain mask             |     7.014 |                   — |
| Tổng texture             | 2.813.884 |                   — |

GIS source artifacts lớn nhất: canonical wards GeoJSON 10.906.132 bytes, byte-identical JSON 10.906.132 bytes, borders 9.002.671 bytes, outline 1.003.982 bytes và render LOD 553.838 bytes. Production bundle không phát hành toàn bộ canonical source artifacts, nhưng repository/storage và pipeline cần tiếp tục kiểm soát determinism/hash.

## Điểm yếu phát hiện

1. E2E dùng `vite dev`, chưa chứng minh `dist/`, hashed chunks, texture và base path GitHub Pages hoạt động.
2. Chỉ Chromium desktop/mobile; chưa có WebKit smoke hoặc phân tách smoke/visual theo browser.
3. Chưa có automated WCAG/axe test; chart thiếu accessible summary rõ ràng và selection chưa có live announcement chuyên biệt.
4. WebGL context listeners được đăng ký trong `onCreated` nhưng không cleanup; capability detection tạo canvas mỗi render.
5. Zustand chưa chặn administrative code không tồn tại và reduced-motion invariant vẫn được giữ trong UI.
6. Three.js, ECharts và dữ liệu nặng đều nằm trong import graph ban đầu; chế độ 2D không tránh được tải code 3D.
7. Performance budget chưa chặn total production payload hoặc single asset quá lớn; chưa có hit-test benchmark/draw-call/triangle evidence.
8. Metric provenance chỉ là các field dashboard rời rạc, chưa có schema đầy đủ cho status, owner, license, publication/retrieval date và validation notes.
9. GIS validator chưa kiểm tra label point-in-polygon, artifact hash/determinism và provenance schema.
10. CI chưa có accessibility/security scan, actions chưa pin full SHA, thiếu concurrency và deploy chưa phụ thuộc trực tiếp vào quality workflow.
11. README còn gánh nhiều chi tiết; thiếu architecture, provenance, testing, performance, accessibility, security và contributing docs riêng.
12. Console/network errors chưa được assertion trong browser suite; baseline không được phép tuyên bố sạch ở hạng mục này dù smoke test pass.

## Điểm baseline

| Hạng mục                    | Điểm / 10 | Bằng chứng chính                                                                           |
| --------------------------- | --------: | ------------------------------------------------------------------------------------------ |
| Ý tưởng và giá trị sản phẩm |       8,8 | Trải nghiệm GIS 3D rõ ràng, nhưng data vận hành vẫn illustrative.                          |
| Kiến trúc frontend          |       8,5 | Phân lớp map/store tốt; import graph và lifecycle còn khoảng trống.                        |
| GIS và data pipeline        |       8,6 | CRS/validity/count/overlap tốt; thiếu determinism/hash/provenance sâu.                     |
| Chất lượng code             |       8,7 | Strict/lint/test pass; một số invariant còn ở UI và lifecycle listener chưa kín.           |
| Testing và quality gates    |       8,3 | Unit + Chromium + visual tốt; chưa production E2E/WebKit/axe.                              |
| Accessibility               |       8,0 | Có 2D alternative/keyboard/reduced motion; chưa có axe/live selection/chart summary audit. |
| Hiệu năng                   |       8,0 | Budget và DPR cap có sẵn; initial payload còn tải eager và thiếu runtime measurements.     |
| Production readiness        |       8,0 | Pages/CI/fallback tốt; dev-only E2E và security gates còn thiếu.                           |
| Documentation               |       8,2 | README/attribution tốt; thiếu bộ tài liệu vận hành chuyên biệt.                            |
| Security và supply chain    |       7,5 | Audit sạch; chưa Dependabot/CodeQL/pinned actions/security policy.                         |

## Tiêu chí xác nhận nâng cấp thành công

- Tất cả command acceptance pass trên checkout sạch, gồm format check cross-platform và production E2E.
- Chromium desktop/mobile và WebKit smoke pass; visual regression chỉ chạy Chromium với baseline ổn định.
- Axe không phát hiện vi phạm nghiêm trọng trên màn hình 3D và 2D; selection có live announcement.
- WebGL listener có cleanup được test; context loss/restore/reload recovery rõ ràng.
- Store bảo vệ administrative code và reduced-motion invariant bằng domain action có unit test.
- Chế độ 2D/WebGL unsupported tránh tải chunk 3D khi luồng khởi động cho phép; lazy chunks và base path được E2E xác minh.
- Budget bao phủ tổng JS, từng chunk lớn, tổng texture, single asset và total production payload.
- GIS validation bao phủ label containment, provenance schema, metric completeness/orphan và artifact hashes/determinism phù hợp.
- `npm audit` không có vulnerability nghiêm trọng; Dependabot, CodeQL, permissions tối thiểu và pinned actions được cấu hình.
- CI chạy các gate tách bạch, lưu trace/screenshot khi fail và deploy chỉ sau quality pass.
- Bộ tài liệu được tạo và báo cáo final ghi rõ before/after, trade-off, giới hạn và rủi ro còn lại.
