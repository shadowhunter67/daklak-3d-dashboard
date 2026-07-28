# Independent UI review process (Phase 6)

Quy trình review UI/UX độc lập bằng Codex CLI, dùng làm merge gate cho MỌI thay đổi UI kể từ Phase 6. Xem [ADR 0009](../adr/0009-public-projection-and-ui-review-gate.md) cho bối cảnh quyết định.

## Nguyên tắc bắt buộc

1. Claude (hoặc coding agent khác) là implementer — không tự kết luận UI đạt yêu cầu.
2. Codex CLI là reviewer độc lập — đọc screenshot PRODUCTION thật (không phải suy diễn từ code) +
   code liên quan, không tự sửa code.
3. Không merge UI change khi còn `BLOCKER` hoặc `HIGH` chưa giải quyết.
4. Không dùng Playwright/axe/snapshot test thay thế visual review — chúng bổ sung, không thay thế.
5. Tối đa 3 vòng review thông thường; nếu vòng 3 vẫn còn BLOCKER/HIGH, thu hẹp/revert phần UI gây
   lỗi, không tuyên bố hoàn tất.

## Cú pháp Codex CLI thật (đã xác nhận, `codex-cli 0.144.1`)

```bash
codex exec -s read-only -C <đường-dẫn-repo> \
  -i <ảnh-1.png> -i <ảnh-2.png> ... \
  - < prompt.txt > codex-review-raw.txt 2>&1
```

Ghi chú quan trọng:

- `-s read-only` đủ cho review (không cần Codex ghi file).
- `-i` lặp lại cho mỗi ảnh — thứ tự ảnh phải khớp mô tả trong prompt/screenshot-manifest.
- Prompt nhiều dòng PHẢI truyền qua stdin (`- < prompt.txt`), không truyền trực tiếp làm CLI
  argument — đã xác nhận thất bại âm thầm ("No prompt provided via stdin") khi thử truyền chuỗi
  nhiều dòng trực tiếp trong một số shell.
- Output thật của `codex exec` có thể in lại toàn bộ input (review-brief, code file đã đọc qua tool
  call của chính Codex) TRƯỚC câu trả lời cuối cùng, rồi in "tokens used" rồi in lại câu trả lời cuối
  một lần nữa — luôn lấy phần SAU dòng `tokens used` cuối cùng làm câu trả lời chính thức, đừng nhầm
  phần echo input phía trên là finding thật.

## Quy trình từng vòng

1. Implement thay đổi UI.
2. Build production (`npm run build` hoặc mode phù hợp).
3. Chụp ảnh qua chrome-devtools MCP (`new_page` → `navigate_page`/`take_snapshot` để lấy uid →
   `take_screenshot`). **Dùng `new_page` (tab mới) cho MỖI ảnh nếu ảnh trước đó bị đen hoàn toàn** —
   đây là lỗi capture đã xác nhận thật trên trang có WebGL trong môi trường headless, không phải
   lỗi app; mở tab mới khắc phục ổn định (xem
   `reports/ui-review/phase-6/final/resolution-summary.md`).
4. Viết `review-brief.md` (phạm vi, route, viewport, ngôn ngữ, trạng thái, giới hạn đã biết — không
   tự khen UI trước khi Codex xem).
5. Viết `screenshot-manifest.json` (commit, route, viewport, ngôn ngữ, trạng thái, mô tả cho MỖI
   ảnh, đúng thứ tự sẽ đính kèm).
6. Gọi Codex theo cú pháp trên.
7. Đọc kết luận thật (PASS/FAIL + danh sách finding có ID/severity/route/viewport/vấn đề/đề xuất).
8. Viết `claude-resolution.md` — mỗi finding: accepted/rejected + lý do kỹ thuật/nghiệp vụ cụ thể
   (không reject vì "test đang xanh"/"mất thời gian"/"không đồng ý thẩm mỹ nhưng không có bằng
   chứng").
9. Sửa code, build lại, chụp lại, gọi Codex lại — lặp tối đa 3 vòng.
10. Khi PASS (0 BLOCKER, 0 HIGH chưa giải quyết), viết `final/resolution-summary.md` tổng hợp toàn
    bộ vòng, copy ảnh xác nhận cuối vào `final/screenshots/`.

## Cấu trúc thư mục bằng chứng

```text
reports/ui-review/phase-<N>/
  iteration-01/
    review-brief.md
    screenshot-manifest.json
    screenshots/*.png
    codex-prompt.txt
    codex-review-raw.txt     # output thô, giữ lại để audit
    codex-review.md          # câu trả lời cuối đã trích sạch
    claude-resolution.md
  iteration-02/ ...
  final/
    screenshots/*.png        # subset ảnh xác nhận cuối
    screenshot-manifest.json
    resolution-summary.md
```

`reports/` không bị gitignore trong repo này (khác một số quy ước khác) — bằng chứng review được
commit cùng code để traceability giữa commit và finding.
