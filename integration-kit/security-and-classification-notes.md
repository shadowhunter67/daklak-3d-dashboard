# Security and classification notes

Đầy đủ: [docs/project-data-import/importer-security-notes.md](../docs/project-data-import/importer-security-notes.md).

## Redaction không phải bảo đảm

Importer chạy một bộ pattern redaction giới hạn (private key, GitHub token, AWS key, JWT, Bearer
token) trên message trong report — đây KHÔNG phải bảo đảm "dữ liệu import không có gì nhạy cảm". Đội
cung cấp dữ liệu vẫn phải tự rà soát trước khi đưa file vào import, đặc biệt các trường tự do
(description/note/title).

## Classification

`metadata.classification` của canonical bundle (`public`/`internal`/`confidential`/`restricted`) mô
tả mức phân loại Ở CẤP BUNDLE — importer mặc định gán `internal` cho output CSV mode. Nếu dữ liệu
thật cần mức khác, đây là quyết định của người vận hành, không phải importer tự suy luận.

## Không có gì tự động publish

`import:data` chỉ ghi vào thư mục `--output` cục bộ. `stage:internal-portfolio` chỉ ghi một file
trong `src/assets/`, KHÔNG tự `git add`/`git commit`/`git push`, KHÔNG tự chạy bất kỳ lệnh git nào.
Người vận hành luôn phải tự review + commit thủ công nếu muốn giữ thay đổi.

## Không có dữ liệu nội bộ thật trong repo/integration-kit

Mọi ví dụ trong `example-input/` là dữ liệu hư cấu 100% (`(fictional)` trong mọi tên) — không đại
diện cho bất kỳ dự án, cơ quan, hay số liệu thật nào của tỉnh Đắk Lắk.
