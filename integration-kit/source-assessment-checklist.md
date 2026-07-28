# Source assessment checklist

Trả lời trước khi chuẩn bị file CSV/JSON để import:

- [ ] **Đơn vị sở hữu**: cơ quan/đơn vị nào chịu trách nhiệm nội dung dataset này?
- [ ] **Người chịu trách nhiệm**: ai xác nhận số liệu đúng nếu có câu hỏi sau này?
- [ ] **Kỳ cập nhật**: dữ liệu này cập nhật theo nhịp nào (hàng tuần/tháng/theo sự kiện)?
- [ ] **Định dạng**: CSV (canonical column) hay canonical JSON bundle sẵn có?
- [ ] **Encoding**: file có phải UTF-8 thật không? (Excel "Save As CSV UTF-8", không phải CSV mặc định
      có thể là ANSI/Windows-1258 — importer từ chối encoding không phải UTF-8, xem
      `input-encoding-invalid`.)
- [ ] **Primary key**: mỗi entity có `id` ổn định, không trùng, không tự sinh từ số dòng?
- [ ] **Source record id**: `sourceRecordId` (progress-snapshots) có phân biệt được các lần ghi khác
      nhau của cùng một quan sát không?
- [ ] **Đơn vị tiền tệ**: mọi số tiền là VND nguyên (không hào/xu), không có dấu phân cách hàng nghìn?
- [ ] **Ngữ nghĩa ngày/giờ**: field nào là "ngày" (YYYY-MM-DD), field nào là "thời điểm" (ISO
      datetime có timezone)? Không trộn lẫn.
- [ ] **Phiên bản mã hành chính**: mã xã/phường dùng theo phiên bản nào? (Mặc định importer dùng
      `daklak-labels.json` hiện có — nếu dataset dùng mã cũ trước sáp nhập 2025, cần mapping riêng,
      NGOÀI phạm vi importer hiện tại.)
- [ ] **Geometry**: có geometry không? Nếu có, phải dùng JSON mode (CSV không mang geometry ở Phase
      4/5) — xem [csv-contract.md](../docs/project-data-import/csv-contract.md).
- [ ] **Classification**: dữ liệu này công khai được, hay nội bộ/hạn chế? (Ảnh hưởng
      `metadata.classification` của bundle — xem
      [security-and-classification-notes.md](security-and-classification-notes.md).)
- [ ] **Dữ liệu cá nhân**: có PII (tên cá nhân, số điện thoại, CCCD...) trong bất kỳ trường tự do nào
      (description/note/title) không? Nếu có, cần rà soát trước khi import.
- [ ] **Quyền tái phân phối/công bố**: đơn vị cung cấp có xác nhận dữ liệu này được phép dùng trong
      dashboard nội bộ không? (KHÔNG phải câu hỏi cho `public-static` — chưa có cơ chế duyệt public.)
- [ ] **Vấn đề chất lượng đã biết**: có field nào biết trước là thiếu/không chắc chắn? Ghi rõ trong
      `confidence`/`verificationStatus` thay vì để importer tự đoán (importer không tự suy luận).
- [ ] **Trạng thái phê duyệt**: dữ liệu này đã được ai duyệt để đưa vào dashboard nội bộ chưa, hay còn
      là bản nháp?
