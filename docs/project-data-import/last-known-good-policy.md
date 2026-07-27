# Last-known-good policy (Phase 4)

## Semantics

`--last-known-good <path>` trỏ tới một thư mục output CŨ (có `import-manifest.json` từ một lần
import trước). Importer CHỈ đọc `normalizedContentChecksum` của manifest đó để so sánh với lần chạy
hiện tại — nếu giống hệt, `import-manifest.json` mới có `noChange: true`.

**Importer KHÔNG BAO GIỜ ghi/sửa file tại `--last-known-good`.** Đây là baseline chỉ-đọc trong Phase
4 — quyết định "baseline nào là last-known-good hiện hành" là một bước vận hành thủ công (ví dụ:
người vận hành tự quyết định copy `--output` mới đè lên vị trí baseline sau khi review report), không
phải việc importer tự động hoá.

## Vì sao không tự động promote

1. Tránh importer tự ý ghi đè một thư mục người vận hành có thể đang dùng cho việc khác (audit trail,
   so sánh thủ công nhiều phiên bản).
2. `noChange: true` khi checksum giống hệt — không có lý do nghiệp vụ để ghi đè một baseline giống
   hệt nội dung, kể cả nếu có tự động promote.
3. Giữ blast radius nhỏ: một lần chạy importer chỉ ảnh hưởng `--output`, không ảnh hưởng bất kỳ trạng
   thái nào khác trên đĩa trừ khi người vận hành tự chạy thêm `stage:internal-portfolio`.

## `generatedAt` không ảnh hưởng no-change

So sánh CHỈ dựa trên `normalizedContentChecksum` — checksum này được tính từ `datasets` (nội dung
nghiệp vụ), KHÔNG bao gồm `metadata.generatedAt` (thời điểm chạy). Hai lần chạy importer trên cùng
input ở hai thời điểm khác nhau (hoặc rerun để sửa lỗi vận hành không đổi dữ liệu) cho cùng
`normalizedContentChecksum` — `noChange: true` cả hai lần, đúng ngữ nghĩa "nội dung không đổi", không
bị `generatedAt` (timestamp chạy) làm sai lệch. Xem `scripts/import-data/checksum.ts`.

## Bảo vệ khi import fail

Khi `blocking: true` (có lỗi chặn), importer KHÔNG ghi `project-portfolio.bundle.json` ở `--output`
và KHÔNG so sánh/chạm vào `--last-known-good` — 5 file report vẫn được ghi (atomic) vào `--output` để
chẩn đoán, nhưng thư mục `--last-known-good` (nếu trỏ tới một vị trí khác) không hề bị ảnh hưởng dù
thành công hay thất bại, vì importer không bao giờ ghi vào đó.

## Atomic write, không cần transaction database

`writeOutputAtomically()` ghi mọi file vào `.generated-data.tmp-<random>` cùng cấp `--output`, rồi
`renameSync` đè lên `--output` khi mọi file đã ghi xong. Nếu process crash giữa chừng (trước rename),
`--output` cũ (nếu có từ lần chạy trước) không hề bị chạm — `rename` trong cùng filesystem là atomic
trên cả POSIX và NTFS. Không cần cơ chế transaction/rollback phức tạp hơn cho quy mô dữ liệu này.
`cleanupOrphanedTempDirs()` dọn best-effort các thư mục tạm mồ côi còn sót (ví dụ sau một lần crash
cứng) — không throw nếu dọn thất bại.
