# Deployment modes

Đầy đủ: [docs/project-data-import/04-deployment-profiles-design.md](../docs/project-data-import/04-deployment-profiles-design.md).

| Mode              | Nguồn dữ liệu                                                                                           | Ai truy cập được nếu host file này                           |
| ----------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `demo`            | Dữ liệu minh hoạ hư cấu (`illustrativeProjectPortfolio.ts`)                                             | Bất kỳ ai có URL                                             |
| `internal-static` | Bundle đã import (qua `stage:internal-portfolio`)                                                       | **Bất kỳ ai có URL tới file host** — KHÔNG có authentication |
| `public-static`   | Bundle ĐÃ qua public projection engine (Phase 6 — allowlist field, `config/public-project-fields.json`) | Bất kỳ ai có URL                                             |

## Điều quan trọng nhất phải hiểu trước khi host `internal-static`

- **`internal-static` không có nghĩa là "an toàn"** — nó chỉ có nghĩa "không phải dữ liệu minh hoạ".
  Không có authentication nào trong static hosting này. Bất kỳ ai truy cập được URL/file host đều đọc
  được TOÀN BỘ nội dung bundle, kể cả field được đánh dấu `classification: 'internal'`.
- **Importer output KHÔNG tự động là "public-approved output"**. `stage:internal-portfolio` chỉ đưa
  dữ liệu vào build `internal-static` — KHÔNG có nghĩa dữ liệu đó đã được duyệt để công khai. Để đưa
  vào `public-static`, phải chạy qua public projection engine
  (`npm run project:public-data` + `npm run stage:public-portfolio`, xem
  [public-projection-policy.md](../docs/project-data-import/public-projection-policy.md) và
  [public-release-runbook.md](../docs/project-data-import/public-release-runbook.md)) — và ngay cả
  khi projection pass, một người có thẩm quyền vẫn phải review nội dung; projection không tự cấp
  quyền công bố.
- **Không cần database** cho cả 3 mode — đây là static hosting đọc file JSON tĩnh, không có server
  nào phục vụ dữ liệu động.

## Trục khác: public/secure (docs/deployment-profiles.md)

Ba mode ở trên (demo/internal-static/public-static) là trục "dữ liệu nào được đóng gói" — ĐỘC LẬP với
trục "public"/"secure" (auth) đã có sẵn trong `docs/deployment-profiles.md`. Đừng nhầm hai trục này —
`internal-static` không tự động có nghĩa "secure profile" theo tài liệu kia.
