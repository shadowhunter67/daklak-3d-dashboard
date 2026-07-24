# ADR 0002 — Hash routing cho Project Portfolio / Project Detail

- Status: accepted
- Date: 2026-07-23
- Liên quan: [docs/adr/0001-project-centric-domain.md](0001-project-centric-domain.md), Phase 2B1
  (Project Portfolio + Project Detail)

## Bối cảnh

Phase 2B1 thêm hai điểm vào mới có URL riêng, chia sẻ được, hỗ trợ Back/Forward và refresh:
**Project Portfolio** (`/projects`) và **Project Detail** (`/projects/:projectId`). Trước Phase
2B1, toàn bộ điều hướng của app đi qua `src/utils/dashboardUrl.ts` — một adapter dựa hoàn toàn vào
query string (`?view=&mode=&ward=`), không có router library, không có nhiều hơn 4 "trang" (`3d`,
`table`/`2d`, `map`, `overview`).

Ràng buộc thật của hosting: GitHub Pages là static hosting thuần, không có server-side rewrite,
site build ra base path `/daklak-3d-dashboard/` (không phải root domain). `?view=3d`, `?view=table`
(`2d` trên URL), `?view=map` **phải tiếp tục hoạt động y hệt** — đây là ràng buộc cứng, không phải
gợi ý.

## Ba phương án

1. **Hash routing** (`/#/projects`, `/#/projects/:projectId`) — điều hướng phía client thuần, phần
   sau `#` không bao giờ được gửi lên server. Direct load, refresh, Back/Forward đều chỉ là "load
   lại đúng một file `index.html` ở base path, sau đó JS đọc `location.hash`" — không cần rewrite
   rule nào, không có rủi ro 404 khi refresh.
2. **Tiếp tục query-param routing** (`?view=projects`, `?view=project&project=ID`) — nhất quán với
   pattern hiện có, không thêm dependency nào, nhưng route mới sẽ phải sống chung namespace với
   `view`/`mode`/`ward` đã có ý nghĩa cố định; thêm giá trị `view=project` buộc phải dạy lại
   `parseDashboardUrl`/`serializeDashboardUrl` cách phân biệt "4 view cũ" với "2 route dự án mới",
   và một dự án có cả `view`, `mode`, `ward`, `project`, cộng thêm filter Portfolio
   (`status`/`sector`/`area`/`query`/`sort`) sẽ làm URL cũ và URL mới trộn lẫn ý nghĩa trên cùng một
   query string — rủi ro nhầm lẫn ngữ nghĩa cao hơn hash routing dù không thêm dependency.
3. **BrowserRouter + GitHub Pages `404.html` fallback trick** — chỉ hợp lệ nếu implement và verify
   thật: cấu hình `404.html` redirect về `index.html` kèm base path đúng, verify bằng refresh thật
   trên URL sâu (`/daklak-3d-dashboard/projects/prj-001`) trên site đã deploy. Có ưu điểm URL đẹp
   (không có `#`), nhưng thêm một router library mới (ngân sách bundle gzip là ràng buộc cứng của
   Phase 2B1 — xem D6) và một lớp fallback dễ vỡ nếu base path thay đổi hoặc GitHub Pages thay đổi
   hành vi phục vụ `404.html`.

## Quyết định

**Chọn (1) hash routing.**

Lý do quyết định, theo đúng các tiêu chí bắt buộc trong spec:

- **Direct load / refresh / Back-Forward**: hash routing không có cách nào để "vỡ" khi refresh —
  server luôn chỉ thấy `/daklak-3d-dashboard/`, không bao giờ thấy `/daklak-3d-dashboard/projects`.
  Đây là rủi ro thấp nhất trong 3 phương án, đúng tiêu chí "lowest GitHub-Pages risk" nêu trong
  spec.
- **Base path đúng**: `location.hash` độc lập hoàn toàn với base path — không cần biết base path là
  gì để route hoạt động đúng, khác với BrowserRouter (phải cấu hình `basename`) và khác cả
  `404.html` trick (phải viết base path vào script redirect).
- **Không đụng `?view=`**: hash (`#/...`) và query string (`?view=...`) là hai phần độc lập của
  URL — `?view=3d#/projects` là hợp lệ về mặt cú pháp nhưng route dự án (khi có mặt) luôn được ưu
  tiên render trước 4 view cũ, nên không có xung đột ngữ nghĩa nào cần giải quyết; `useDashboardUrlSync`
  hiện có tiếp tục chạy y hệt, không sửa `dashboardUrl.ts` (xem "Không đổi" bên dưới).
- **Ngân sách bundle**: không thêm dependency nào — cùng nguyên tắc "không thêm abstraction chưa có
  bằng chứng cần thiết" đã dùng ở ADR 0001. `react-router-dom` cho đúng 2 route mới là
  over-engineering khi một `hashchange` listener 40 dòng làm được y hệt việc cần làm.
- **Local dev / production preview**: `vite` dev server và `vite preview` phục vụ SPA giống hệt
  GitHub Pages ở khía cạnh này (một file `index.html`, không rewrite) — hash routing hoạt động giống
  hệt ở cả 3 môi trường (dev, preview, GitHub Pages), không cần cấu hình khác nhau giữa các môi
  trường như (3) sẽ cần.
- **Shareable URL**: `https://shadowhunter67.github.io/daklak-3d-dashboard/#/projects/prj-005`
  là một URL đầy đủ, dán được, hoạt động khi mở trực tiếp — đáp ứng yêu cầu deep-link của D3/D4.

### Vì sao không chọn (2) hay (3)

- Loại (2) vì hai lý do: (a) route dự án cần một _không gian điều hướng độc lập_ (Portfolio có 5 giá
  trị filter đồng bộ URL — `status`, `sector`, `area`, `query`, `sort` — cộng 1 route Detail; nhồi
  hết vào cùng query namespace với `view`/`mode`/`ward` hiện có sẽ buộc phải version lại toàn bộ
  `DashboardUrlState`, rủi ro phá `?view=3d`/`table`/`map` hiện tại cao hơn nhiều so với thêm một
  route hash song song không đụng gì tới `dashboardUrl.ts`); (b) Project Detail phải là "a real
  destination with its own URL" theo D7 — biểu diễn nó như một giá trị `view` phụ (`view=project`)
  làm nó trông như ngang hàng với `3d`/`table`/`map`/`overview`, trong khi về ngữ nghĩa nó là một
  _drill-down_ của Portfolio, không phải một "view" độc lập của toàn dashboard.
- Loại (3) vì nó chỉ đạt yêu cầu spec nếu được implement **và verify thật** trên GitHub Pages
  (refresh trên URL sâu không được 404) — chi phí thêm dependency + rủi ro vỡ khi refresh không
  được bù lại bằng lợi ích thực sự nào ở quy mô 2 route mới của Phase 2B1 (thẩm mỹ "URL không có
  `#`" không nằm trong bất kỳ tiêu chí bắt buộc nào của spec).

## Thiết kế route

```
#/projects
#/projects?status=delayed&sector=transport&area=61301&q=cao+tốc&sort=disbursement-desc
#/projects/:projectId
```

- `src/routing/hashRoute.ts` — pure parse/serialize, không phụ thuộc React, đối xứng với
  `dashboardUrl.ts` (cùng pattern parse/serialize/test) nhưng **là một module độc lập, không mở
  rộng `DashboardUrlState`** — đúng quyết định trên.
- `src/routing/useHashRoute.ts` — hook mỏng: đọc `location.hash` hiện tại, subscribe
  `window.addEventListener('hashchange', …)`, expose `navigate(path, { replace? })` gọi
  `history.pushState`/`replaceState` rồi tự bắn `hashchange` (để cùng một code path xử lý cả
  điều hướng bằng nút UI lẫn Back/Forward của trình duyệt).
- Filter Portfolio (`status`/`sector`/`area`/`query`/`sort`) nằm trong **query string của phần
  hash** (`#/projects?status=...`), không phải trong path — giữ URL Portfolio dễ đọc, đối xứng với
  cách `dashboardUrl.ts` đã dùng query string cho state tương tự.
- `App.tsx` render route dự án (Portfolio/Detail) **ưu tiên trên** 4 view cũ khi `location.hash`
  khớp `#/projects...` — quyết định render là "hash có mặt → override", không sửa logic
  `viewMode` hiện có.

## Không đổi (giữ nguyên byte-for-byte)

- `src/utils/dashboardUrl.ts` — không sửa file này trong Phase 2B1.
- `?view=3d`, `?view=2d` (nội bộ `'table'`), `?view=map`, `?mode=`, `?ward=` — hành vi y hệt trước
  Phase 2B1, verify bằng E2E (không chỉ đọc code) theo đúng yêu cầu spec.

## Hệ quả

- URL Portfolio/Detail có `#` — chấp nhận được, không nằm trong bất kỳ ràng buộc bắt buộc nào của
  spec (spec chỉ yêu cầu URL "shareable" và hoạt động đúng ở mọi kịch bản liệt kê, không yêu cầu
  không có `#`).
- Nếu một router library thật (ví dụ khi số route vượt quá ngưỡng một `hashchange` listener còn
  quản lý được, hoặc khi Phase 3 cần nested layout/loader phức tạp hơn) trở nên cần thiết, đây là
  ADR sẽ bị supersede — không dự đoán trước nhu cầu đó ở Phase 2B1.
