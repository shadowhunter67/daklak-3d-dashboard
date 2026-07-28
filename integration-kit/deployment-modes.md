# Deployment modes

Đầy đủ: [docs/project-data-import/04-deployment-profiles-design.md](../docs/project-data-import/04-deployment-profiles-design.md).

| Mode              | Nguồn dữ liệu                                                                         | Ai truy cập được nếu host file này                           |
| ----------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `demo`            | Dữ liệu minh hoạ hư cấu (`illustrativeProjectPortfolio.ts`)                           | Bất kỳ ai có URL                                             |
| `internal-static` | Bundle đã import (qua `stage:internal-portfolio`)                                     | **Bất kỳ ai có URL tới file host** — KHÔNG có authentication |
| `public-static`   | Hiện tại DÙNG CHUNG bundle với `internal-static` — CHƯA có bước lọc public-projection | Bất kỳ ai có URL                                             |

## Điều quan trọng nhất phải hiểu trước khi host `internal-static`

- **`internal-static` không có nghĩa là "an toàn"** — nó chỉ có nghĩa "không phải dữ liệu minh hoạ".
  Không có authentication nào trong static hosting này. Bất kỳ ai truy cập được URL/file host đều đọc
  được TOÀN BỘ nội dung bundle, kể cả field được đánh dấu `classification: 'internal'`.
- **Importer output KHÔNG tự động là "public-approved output"**. `stage:internal-portfolio` chỉ đưa
  dữ liệu vào build `internal-static` — KHÔNG có nghĩa dữ liệu đó đã được duyệt để công khai. Không
  dùng output của `stage:internal-portfolio` cho `public-static` cho tới khi có bước lọc
  public-projection (Phase 6, chưa triển khai).
- **Không cần database** cho cả 3 mode — đây là static hosting đọc file JSON tĩnh, không có server
  nào phục vụ dữ liệu động.

## Trục khác: public/secure (docs/deployment-profiles.md)

Ba mode ở trên (demo/internal-static/public-static) là trục "dữ liệu nào được đóng gói" — ĐỘC LẬP với
trục "public"/"secure" (auth) đã có sẵn trong `docs/deployment-profiles.md`. Đừng nhầm hai trục này —
`internal-static` không tự động có nghĩa "secure profile" theo tài liệu kia.
