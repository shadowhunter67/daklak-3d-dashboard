# Xung đột và sai lệch dữ liệu đã phát hiện

Không xung đột nào được tự "sửa cho khớp". Giá trị trong bộ dữ liệu là giá trị trích từ từng dòng của nguồn.

## A. Tổng vốn từng nhóm: trích xuất so với con số trên tiêu đề nhóm (QĐ 1985/QĐ-UBND, đơn vị: tỷ đồng)

| Nhóm                       | Tổng các dòng  | Tiêu đề ghi | Chênh   | Nhận định                                                                             |
| -------------------------- | -------------- | ----------- | ------- | ------------------------------------------------------------------------------------- |
| Thủy điện (8 DA)           | 8.343,4        | 8.343       | +0,4    | Làm tròn ở tiêu đề — không phải lỗi                                                   |
| Khu đô thị (24 DA)         | 190.381        | 190.388     | −7      | Chưa giải thích được: có thể sai số tiêu đề hoặc lỗi trích ô số                       |
| Nhà ở xã hội (tiêu đề 12)  | 22.944 (11 DA) | 25.264      | −2.320  | Văn bản ghi 12 dự án nhưng bảng chỉ có 11 dòng liên tục → có thể thiếu 1 dòng ở nguồn |
| Nông nghiệp (20 DA)        | 95.505,62      | 94.855      | +650,62 | Chưa giải thích được; cần đối chiếu thủ công với PDF                                  |
| Công nghiệp - chế biến (6) | 167.300        | 167.200     | +100    | Chưa giải thích được                                                                  |

Việc cần làm (cần người): mở PDF gốc đối chiếu 4 nhóm "chưa giải thích được". Cho tới đó các nhóm này được gắn cảnh báo, không gắn "verified".

## B. Phụ lục 3 trùng phụ lục 2 ở nguồn

MD5 hai file giống hệt nhau (`549cca3d08860743be13a0d0db098f52`): cổng UBND đăng nhầm. Một lĩnh vực không có trong bộ dữ liệu. Không suy diễn nội dung.

## C. Cao tốc Khánh Hòa – Buôn Ma Thuột: số liệu báo chí mâu thuẫn (CHƯA đưa vào bộ dữ liệu)

| Hạng mục            | Nguồn A                             | Nguồn B                      |
| ------------------- | ----------------------------------- | ---------------------------- |
| Tổng mức toàn tuyến | 21.935 tỷ (vneconomy, 03/04/2023)   | "gần 22.000 tỷ" (baodauthau) |
| Dự án thành phần 2  | > 10.436 tỷ (vneconomy, 03/04/2023) | ~9.818 tỷ (baovanhoa)        |
| Dự án thành phần 3  | ~6.165 tỷ (vneconomy, thanhnien)    | ~6.485 tỷ (baovanhoa)        |
| Dự án thành phần 1  | > 5.300 tỷ (vneconomy)              | ~5.632 tỷ (baovanhoa)        |

Có thể là các giai đoạn phê duyệt khác nhau (dự kiến vs điều chỉnh) — nhưng chưa có văn bản gốc nên không chọn. Cần số quyết định phê duyệt của Bộ GTVT/UBND tỉnh từ nguồn chính thống trước khi đưa vào.

## D. Tên dự án trùng trong cùng văn bản (ID khác nhau, giữ cả hai)

"Dự án nông nghiệp" (PL4 #4, #11, #19), "Bệnh viện đa khoa chất lượng cao" (PL5 #1, #3, #4), "Tổ hợp trung tâm dữ liệu AI…" (PL5 #16, #17), "Khu đô thị (hỗn hợp) kết hợp dịch vụ du lịch" (PL6 #4/#6 và #8/#18). Địa điểm/quy mô khác nhau nên là dự án khác nhau, không gộp.

## E. Tên địa danh trong nguồn không trùng tên đơn vị hành chính hiện hành

Ví dụ "Cư Prơng" (nguồn) so với "Cư Pơng" (đơn vị hiện hành); "Ea Bar"; "Cư Kbang (cũ) nay là Ea Rốk". Không tự sửa: 45 dự án mang ghi chú trong trường `notes`.
