# ADR 0003 — Internationalization (Vietnamese default, English supported)

## Bối cảnh

Toàn bộ UI hiện tại chỉ có tiếng Việt, hard-code trong JSX. Cần hỗ trợ tiếng Anh cho người dùng
quốc tế/nhà tài trợ/đánh giá kỹ thuật mà không phá vỡ URL chia sẻ được, không tăng bundle nặng, và
không reload trang khi chuyển ngôn ngữ.

## Quyết định

- **Locale**: chỉ hai giá trị `'vi' | 'en'`. Mặc định `'vi'`.
- **URL**: `?lang=vi` hoặc `?lang=en`, tách biệt hoàn toàn khỏi `?view=`/`?mode=`/`?ward=` (base
  dashboard state) và khỏi `#/projects...` (hash route) — ba cơ chế URL này composable với nhau vì
  chúng sở hữu ba "vùng" khác nhau của URL (query param riêng, query param khác, hash).
- **Độ ưu tiên xác định locale ban đầu**: `?lang=` trên URL thắng tuyệt đối → nếu không có, dùng
  preference đã lưu (`localStorage`) → nếu không có, mặc định `'vi'`. **Không** bao giờ dùng
  `navigator.language`/browser locale để chọn default — một người dùng Đắk Lắk mở trình duyệt tiếng
  Anh không nên bất ngờ thấy giao diện tiếng Anh.
- **Persistence**: `localStorage['daklak-dashboard.locale']`, không chứa dữ liệu nhạy cảm.
- **Không dịch tự động** văn bản pháp lý (tên Nghị quyết/Quyết định, tên cơ quan chính thức) hoặc
  tên riêng (tên xã/phường, tên dự án minh hoạ) — những chuỗi này giữ nguyên tiếng Việt trong cả hai
  locale trừ khi có bản dịch chính thức, tránh dịch máy tạo ra tên sai lệch về mặt pháp lý/địa danh.
- **Fallback**: nếu một `MessageKey` chưa có bản dịch tiếng Anh, hiển thị tiếng Việt thay vì key
  thô hoặc chuỗi rỗng — không bao giờ để UI hiển thị "undefined" hoặc key kỹ thuật.

## Kiến trúc

```
src/i18n/
  locale.ts            // Locale type, resolve/parse/persist logic (thuần, test được không cần DOM)
  messages.ts           // MessageKey type (derive từ keys của messages/vi.ts)
  messages/vi.ts        // Dictionary đầy đủ, eager-load (nhỏ, là string literal, không đáng lazy)
  messages/en.ts         // Dictionary Partial<Record<MessageKey,string>>, lazy-load qua import() động
  I18nProvider.tsx       // Context: locale, t(), setLocale(); sở hữu document.documentElement.lang,
                          // đồng bộ URL/localStorage, lazy-load en.ts khi cần
  useTranslation.ts      // Hook mỏng đọc context
  formatters.ts          // Intl.NumberFormat/DateTimeFormat theo locale hiện tại — factory, không
                          // tạo formatter mới mỗi render
  tests/
```

Không dùng `react-i18next`/`i18next` hay tương đương — dictionary hiện tại đủ nhỏ (một object string
literal per locale) để không cần runtime phức tạp hơn một Context + object lookup + interpolation
`{token}` đơn giản. Sẽ cân nhắc lại nếu domain content dịch được (Section "Nội dung song ngữ theo
domain" dưới) phát triển tới quy mô cần pluralization rule engine thật.

`MessageKey` là union type suy ra từ `keyof typeof vi` — gọi `t('some.key')` sai chính tả là lỗi
biên dịch TypeScript, không phải lỗi runtime im lặng.

## URL composition

Ba cơ chế URL độc lập, không viết đè lẫn nhau:

| Cơ chế                                           | Sở hữu bởi            | Ví dụ                     |
| ------------------------------------------------ | --------------------- | ------------------------- |
| `?view=`/`?mode=`/`?ward=` (+ detail-map params) | `useDashboardUrlSync` | `?view=map&mode=overview` |
| `?lang=`                                         | `I18nProvider`        | `?lang=en`                |
| `#/projects...`                                  | `useHashRoute`        | `#/projects/prj-001`      |

`I18nProvider.setLocale` xây URL mới từ `window.location.search` hiện tại (giữ mọi param khác) +
ghi đè `lang` + nối `window.location.hash` nguyên trạng, rồi `pushState` (Back/Forward phải hoàn
tác được việc đổi ngôn ngữ — yêu cầu rõ trong spec). Ngược lại, `useDashboardUrlSync` khi build lại
toàn bộ query string từ `MapState` (view/mode/ward thay đổi) phải giữ lại giá trị `lang` hiện có
trên URL thay vì làm mất nó — đây là thay đổi bắt buộc trong PR này để hai cơ chế không xoá lẫn
nhau.

## Component

- Language switcher đặt trong `DashboardHeader`, hiển thị mọi trang (không phụ thuộc `viewMode`).
- Nhãn "VI / EN" — không dùng cờ quốc gia (Việt Nam không phải một "quốc gia nói tiếng Việt" duy
  nhất về mặt biểu tượng, và cờ không phải ngôn ngữ).
- `aria-label` rõ ràng theo ngôn ngữ hiện tại, `aria-pressed`/trạng thái hiện tại rõ, khả dụng bằng
  bàn phím, không mất focus sau khi chuyển.
- `document.documentElement.lang` cập nhật đồng bộ với locale.

## Phạm vi dịch

Dịch đầy đủ toàn bộ UI sản phẩm (cập nhật ở `feat/i18n-complete-vi-en`, xem thêm mục "Hoàn tất dịch
toàn bộ UI" bên dưới): app shell, `DashboardHeader`, toàn bộ Executive Overview, Project Portfolio,
Project Detail, 3D map controls, danh sách 2D accessible, bản đồ chi tiết MapLibre (layer panel,
base map selector, local search, đo khoảng cách), onboarding, Data Sources panel,
DataProvenancePanel/DataStatusSummary — cùng mọi domain enum dùng chung (status/sector/attention-
reason/work-package-status/milestone-status/issue-status/issue-severity/authority/classification/
evidence-level/verification-status/geometry-status/data-freshness).

Chỉ trừ: tên riêng (địa danh, tên/mã dự án minh hoạ), và nội dung nguồn chỉ có tiếng Việt chưa có
bản tiếng Anh (ví dụ `title`/`description` của một dataset lấy từ văn bản công bố tiếng Việt) — xem
`resolveLocalizedText` bên dưới.

## Hoàn tất dịch toàn bộ UI (feat/i18n-complete-vi-en)

- `scripts/check_i18n_hardcoded_strings.mjs` (chạy trong `npm test` qua
  `check_i18n_hardcoded_strings.test.mjs`): audit tĩnh bằng TypeScript compiler API (đi qua JSX
  text node + một số attribute hiển thị được chọn lọc — `aria-label`/`title`/`alt`/`placeholder`),
  không phải regex quét thô toàn bộ source (tránh false-positive lớn). Có allowlist nhỏ, mỗi mục
  đều ghi lý do (proper noun/brand, domain label table).
- `src/i18n/dictionaryParity.test.ts`: đối chiếu `vi.ts` (nguồn key duy nhất) và `en.ts` (partial) —
  fail khi thiếu key, key thừa, placeholder `{...}` lệch giữa hai bản dịch, hoặc giá trị rỗng.
- `src/i18n/resolveLocalizedText.ts`: helper cho nội dung tự do có thể chỉ tồn tại tiếng Việt (khác
  `MessageKey`, vốn luôn là UI copy do chính app sở hữu và dịch được toàn bộ). Không bao giờ dịch
  máy lúc runtime; thiếu bản tiếng Anh → hiển thị nguyên văn tiếng Việt, kèm chú thích nhỏ "Vietnamese
  source text" khi hữu ích cho người đọc tiếng Anh (áp dụng cho tiêu đề/mô tả dataset trong
  `DataProvenancePanel`).
- Domain enum không còn baked label tiếng Việt trong view model: `ProjectPortfolioRow`/
  `ProjectDetailModel` chỉ giữ giá trị enum thô (`sector`, `status`, `reasonCategory`...), component
  tự resolve nhãn qua `t(`sector.${value}`)` v.v. tại thời điểm render — theo đúng pattern
  `PriorityProjectList.tsx` đã có từ Executive Overview.
- Class component (React error boundary — không có hook) dùng `src/i18n/staticTranslate.ts`, đọc
  `document.documentElement.lang` (đã được `I18nProvider` đồng bộ) thay vì nhận `locale` qua props.

## Formatters

`src/i18n/formatters.ts` cung cấp factory theo locale cho number/percent/date/date-time/VND/compact
money — thay cho `toLocaleString('vi-VN')`/`Intl.NumberFormat('vi-VN', ...)` rải rác trong
component. Toàn bộ formatter còn hard-code `vi-VN` (kể cả `formatKpiValue` không nhận locale trong
`executiveOverviewSelectors.ts`, và `formatNumber`/`formatUnitType` trong `utils/geo.ts`) đã được
loại bỏ; mọi call site giờ dùng factory theo locale này.

## Hệ quả

- Không thêm framework i18n nặng.
- Không tăng bundle đáng kể: dictionary tiếng Việt (eager) là một object nhỏ; dictionary tiếng Anh
  lazy-load qua `import()` chỉ khi locale thật sự là `'en'`.
- Domain string (tên dự án/gói thầu minh hoạ, nhãn Nghị quyết/Quyết định) không tự động dịch —
  `src/i18n/resolveLocalizedText.ts` cung cấp `LocalizedText` (`{ vi: string; en?: string }`) cho
  DTO nào cần tiêu đề/mô tả song ngữ ở tầng domain, không bắt buộc đổi ngay mọi field (hiện áp dụng
  cho `entry.dataset.title`/`description` trong `DataProvenancePanel`/`ProjectDetailView`).
