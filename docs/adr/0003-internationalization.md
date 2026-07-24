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

## Phạm vi dịch trong PR này

Dịch đầy đủ: app shell (skip link, live region, not-found), `DashboardHeader` (nav/mode
tabs/controls), toàn bộ Executive Overview (KPI, dự án cần chú ý, cảnh báo, sức khỏe dữ liệu, hộp
thoại tóm tắt), status/sector/attention-reason label dùng chung.

**Chưa dịch trong PR này** (fallback về tiếng Việt đúng như thiết kế, không lỗi): Project
Portfolio, Project Detail, bản đồ 3D/2D và bản đồ chi tiết (MapLibre) — các trải nghiệm bản đồ có
rất nhiều chuỗi rải rác qua nhiều file (camera controls, layer panel, tìm kiếm, đo khoảng cách,
danh sách accessible). Dịch các phần này là phase tiếp theo được khuyến nghị rõ trong README/PR,
không gộp vào phạm vi "làm xong hết" của PR này để tránh dịch vội/thiếu nhất quán.

## Formatters

`src/i18n/formatters.ts` cung cấp factory theo locale cho number/percent/date/date-time/VND/compact
money — thay cho `toLocaleString('vi-VN')`/`Intl.NumberFormat('vi-VN', ...)` rải rác trong
component. Các formatter hiện có trong `executiveOverviewSelectors.ts` (vốn hard-code `vi-VN`) được
port sang factory này khi component đó được dịch.

## Hệ quả

- Không thêm framework i18n nặng.
- Không tăng bundle đáng kể: dictionary tiếng Việt (eager) là một object nhỏ; dictionary tiếng Anh
  lazy-load qua `import()` chỉ khi locale thật sự là `'en'`.
- Domain string (tên dự án/gói thầu minh hoạ, nhãn Nghị quyết/Quyết định) không tự động dịch — xem
  `LocalizedText` (README/`docs/domain-model.md` cập nhật) cho DTO shape hỗ trợ tiêu đề/mô tả song
  ngữ ở tầng domain khi cần, không bắt buộc đổi ngay mọi field.
