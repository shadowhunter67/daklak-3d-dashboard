# Evidence: Quyết định 1985/QĐ-UBND (24/06/2026) — Danh mục dự án thu hút đầu tư 2026-2030

**Trạng thái: BẰNG CHỨNG THÔ CHO REVIEW, CHƯA ĐƯỢC DUYỆT ĐƯA VÀO PIPELINE.** AI (Claude) tra cứu,
tải và trích xuất tự động để chứng minh tính khả thi kỹ thuật — không tự kết luận đây là nguồn hợp
lệ để ingest. Xem đánh giá đầy đủ (kèm mục "Candidate #5" mới) ở
[`../investment-opportunities-daklak-assessment.md`](../investment-opportunities-daklak-assessment.md).
`shadowhunter67` cần xác nhận độc lập trước khi bất kỳ phần nào ở đây được đưa vào
`data/source-registry.yml` hay một adapter thật trong `scripts/data-refresh/`.

## Nguồn gốc

- Văn bản: Quyết định số **1985/QĐ-UBND**, UBND tỉnh Đắk Lắk, ký ngày **24/06/2026**.
- Trích yếu: "Về việc phê duyệt Danh mục dự án thu hút đầu tư giai đoạn 2026-2030 của tỉnh Đắk Lắk"
- Trang tra cứu: https://vpubnd.daklak.gov.vn/Documents/Detail/11262
- `robots.txt` của `vpubnd.daklak.gov.vn` (kiểm tra 2026-09-29): không có `Disallow` áp dụng cho
  `/CMS/Content/VanBan/` hay `/Documents/Detail/` — chỉ chặn các từ khoá SEO/cờ bạc/nội dung xấu
  không liên quan. Không chặn truy cập tự động tới các đường dẫn này.
- **Chưa tìm thấy** dòng "ghi rõ nguồn khi phát hành lại" riêng ở footer `vpubnd.daklak.gov.vn` (khác
  với `daklak.gov.vn` cổng chính đã có dòng này, xem đánh giá cũ). Cần xác nhận thêm trước khi coi
  `redistributionPolicy` là `allowed-with-attribution` cho domain này cụ thể.

## File PDF gốc (KHÔNG commit vào repo — theo ADR 0004 mục 5)

Tự tải lại khi cần đối chiếu/tái tạo, không lưu trong Git:

| Phụ lục | URL | MD5 (tải 2026-09-29) |
|---|---|---|
| PL1 — Năng lượng | `https://vpubnd.daklak.gov.vn/CMS/Content/VanBan/2026/6.2026/1985-QĐ-UBND PL1.pdf` | `b4f5a2d5a465c38f876c70f38b9dfdaa` |
| PL2 — Đô thị/nhà ở | `https://vpubnd.daklak.gov.vn/CMS/Content/VanBan/2026/6.2026/1985-QĐ-UBND PL2.pdf` | `549cca3d08860743be13a0d0db098f52` |
| PL3 — (xem cảnh báo) | `https://vpubnd.daklak.gov.vn/CMS/Content/VanBan/2026/6.2026/1985-QĐ-UBND PL3.pdf` | `549cca3d08860743be13a0d0db098f52` (**trùng PL2**) |
| PL4 — Nông nghiệp/CN chế biến/TM dịch vụ | `https://vpubnd.daklak.gov.vn/CMS/Content/VanBan/2026/6.2026/1985-QĐ-UBND PL4.pdf` | `cd3f63d01afcb6e2c2ce74dcdfb1f9f7` |
| PL5 — Y tế/Giáo dục/Môi trường/CNTT | `https://vpubnd.daklak.gov.vn/CMS/Content/VanBan/2026/6.2026/1985-QĐ-UBND PL5.pdf` | `0b986e88b325784603ff024412e2215a` |
| PL6 — Du lịch/sân golf | `https://vpubnd.daklak.gov.vn/CMS/Content/VanBan/2026/6.2026/1985-QĐ-UBND PL6.pdf` | `014d5587c666332751ff4e080cfff8ef` |

(URL cần URL-encode khoảng trắng/`Đ` khi tải bằng `curl`; xem cách gọi trong `extract_1985.py`.)

**CẢNH BÁO DỮ LIỆU NGUỒN:** phụ lục 3 do UBND tỉnh đăng tải trùng byte-for-byte với phụ lục 2 —
nhiều khả năng tỉnh upload nhầm file. Một lĩnh vực thật sự (có thể là "hạ tầng KCN/logistics/giao
thông" theo tin báo chí ban đầu) đang **thiếu** khỏi bộ dữ liệu công khai này. Không tự suy diễn nội
dung phụ lục 3 thật — cần liên hệ Văn phòng UBND tỉnh (banbientap@vpubnd.daklak.gov.vn) xin bản đúng
nếu muốn dữ liệu đầy đủ 6 lĩnh vực.

## File đã trích xuất trong thư mục này

- `extract_1985.py` — script trích xuất (PyMuPDF `find_tables()`), tự tải lại PDF gốc theo bảng URL
  trên rồi chạy lại được bất cứ lúc nào (kể cả khi tỉnh ra Đợt 2).
- `1985-danh-muc-du-an.json` / `.csv` — **201 dự án** trích xuất được (5/6 phụ lục — thiếu PL3 do
  trùng file ở nguồn, xem cảnh báo trên). Mỗi bản ghi có: `phu_luc`, `linh_vuc`, `nhom`, `stt`,
  `ten_du_an`, `dia_diem` (theo xã/phường), `dien_tich_ha`, `tong_von_ty`, `nguon_goc_dat`,
  `hien_trang_sdd`, `quy_mo_dau_tu`, `quyet_dinh_quy_hoach`, `dieu_kien_ha_tang`,
  `hinh_thuc_dau_tu_gpmb`, `ghi_chu`.

### Đã kiểm tra độ chính xác trích xuất

So khớp tổng số dự án trong từng nhóm con (ghi trong chính văn bản, VD "ĐIỆN GIÓ (16 DỰ ÁN...)")
với số dòng trích xuất được:

- Khớp chính xác: PL1 (5/5 nhóm), PL5 (4/4 nhóm), PL6 (2/2 nhóm).
- Lệch 1 dòng, đã xác minh KHÔNG phải lỗi script (STT trích xuất liên tục, không có khoảng trống —
  lỗi đếm nằm ngay trong văn bản gốc của tỉnh): nhóm "NHÀ Ở XÃ HỘI" ở PL2 (văn bản ghi 12, trích
  xuất được 11) và nhóm "THƯƠNG MẠI DỊCH VỤ" ở PL4 (văn bản ghi 17, trích xuất được 16).

## Việc CHƯA làm (cố ý, chờ quyết định của owner)

- Chưa thêm entry vào `data/source-registry.yml` — thiếu `robotsCheckedAt`/`termsCheckedAt` xác nhận
  bởi người, và domain `vpubnd.daklak.gov.vn` chưa có `redistributionPolicy` xác định rõ ràng như
  `daklak.gov.vn`.
- Chưa viết adapter thật trong `scripts/data-refresh/`.
- Chưa động tới `src/entities/investment-opportunity/` (entity này theo ADR 0004 mục 1 là domain
  riêng, KHÔNG trộn vào `Project`/`ProjectPortfolioSource`).
- Chưa xử lý vấn đề phụ lục 3 bị trùng — cần liên hệ tỉnh trước.

## Cần xác nhận (owner sign-off)

Giống quy ước ở `investment-opportunities-daklak-assessment.md`: AI thực hiện tra cứu/trích xuất kỹ
thuật, không tự kết luận đây là đánh giá pháp lý/compliance đầy đủ. `shadowhunter67` cần xác nhận
độc lập (đặc biệt redistribution policy của `vpubnd.daklak.gov.vn`) trước khi coi nguồn này là sẵn
sàng onboard.
