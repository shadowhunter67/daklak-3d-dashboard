# Đắk Lắk 3D Dashboard — Agent guide

File này là nguồn hướng dẫn chung cho mọi coding agent làm việc trong project. Các hướng dẫn ở workspace cha vẫn được áp dụng, đặc biệt là không tự đọc bất kỳ file `.env*` nào.

## Phạm vi và kiến trúc

- Frontend dùng React 19, TypeScript strict, Vite, React Three Fiber, Drei, Zustand và ECharts modular.
- GIS được xử lý offline trong `scripts/`; frontend chỉ đọc các artifact tĩnh tại `src/assets/maps/daklak/`.
- Không đưa xử lý GeoPandas/Shapely hoặc công việc GIS nặng vào browser.
- Giữ component bản đồ tách theo trách nhiệm: terrain, overlay, annotation, camera và hit-test.
- `src/data/datasetManifest.ts` là nguồn metadata giao diện duy nhất. Không hard-code số đơn vị, snapshot hoặc nguồn dữ liệu trong component.
- Dữ liệu minh họa phải luôn có badge/watermark rõ ràng; không trình bày như số liệu vận hành chính thức.

## Quy tắc thay đổi

- Bảo toàn selection khi đổi data mode; xóa hover tạm thời thông qua action store có nghĩa nghiệp vụ.
- Mọi tính năng tương tác chính phải dùng được bằng bàn phím hoặc có phương án tương đương trong danh sách 2D accessible.
- Tôn trọng `prefers-reduced-motion`; không tự bật auto-rotate khi người dùng yêu cầu giảm chuyển động.
- Mọi thay đổi Canvas/WebGL phải giữ loading, error fallback và xử lý context loss.
- Không thêm worker, TopoJSON, Draco hoặc abstraction mới nếu chưa có profiling chứng minh nút thắt.
- Không cập nhật ảnh Playwright bằng `--update-snapshots` chỉ để làm test xanh. Chỉ cập nhật khi thay đổi giao diện là có chủ đích và review cả baseline Windows/Linux.

## Quality gates

Trước khi giao hoặc push thay đổi, chạy:

```bash
npm run quality
npm run validate:data
```

`npm run quality` bao gồm lint, Prettier, typecheck, Vitest, production build, performance budget và Playwright desktop/mobile.

Nếu máy mới chưa có browser test runtime:

```bash
npx playwright install chromium
```

Trên Linux CI có thể cần:

```bash
npx playwright install --with-deps chromium
```

## Dữ liệu và hiệu năng

- Geometry, metrics và metadata phải có cùng tập mã đơn vị; `npm run validate:data` chịu trách nhiệm kiểm tra invariant này.
- Khi thay dữ liệu thật, cập nhật provenance, source version, attribution và trạng thái official/illustrative/mixed cùng lúc.
- `npm run check:budget` phải đạt. Không tăng giới hạn chỉ để hợp thức hóa regression; trước tiên phải đo và giải thích nguyên nhân.
- `reports/performance-budget.json` và `reports/validation-report.json` là bằng chứng máy đọc được. Chỉ commit thay đổi báo cáo khi kết quả đầu vào hoặc budget thực sự thay đổi.

## Git và CI

- Không commit `dist/`, `test-results/`, `playwright-report/`, `.env*` hoặc dependency cache.
- Dùng branch riêng cho thay đổi đáng kể; commit message ngắn, mô tả đúng phạm vi.
- Không merge khi workflow `quality` đỏ.
- Sau khi merge vào `main`, xác nhận cả `quality` và `Deploy GitHub Pages` đều xanh.

## Nội dung dành cho con người

- Hướng dẫn cài đặt, demo, nguồn dữ liệu và giới hạn sản phẩm thuộc `README.md`.
- Quy trình đóng góp mở rộng nên đặt trong `CONTRIBUTING.md` nếu project cần thêm cộng tác viên.
- Không sao chép toàn bộ nội dung file này sang tài liệu agent khác; hãy trỏ về đây để tránh drift.
