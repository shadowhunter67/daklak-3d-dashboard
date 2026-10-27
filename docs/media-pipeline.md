# Media pipeline

Mọi ảnh hiển thị đi qua `MediaItem` (`src/entities/media/mediaItem.ts`): có nguồn, giấy phép, ghi công, kích thước cố định và đường dẫn cục bộ (CSP chỉ cho `img-src 'self'`). Thành phần giao diện không tự ghép đường dẫn ảnh.

## Quy trình thêm ảnh

1. Chỉ dùng ảnh đúng địa phương, có giấy phép dùng lại và ghi công rõ (xem `reports/research/administrative-unit-media-decisions.md`). Không lấy ảnh không rõ nguồn.
2. Chép ảnh đã nén (≤ 640px, ≤ 130 KB, JPEG) vào `public/images/destinations/<id>.jpg` và khai báo nguồn/giấy phép/ghi công trong `src/entities/tourism/verifiedTourismDestinations.ts`.
3. Chạy `python scripts/media/build_destination_thumbnails.py` để sinh:
   - `public/images/destinations/thumb/<id>.webp` (rộng 320px, ≤ 25 KB);
   - `src/data/destinationPhotoMeta.json` (width/height của ảnh gốc và thumbnail).
4. `src/data/destinationMedia.ts` dựng `MediaItem` từ dữ liệu trên; `mediaItem.test.ts` kiểm giấy phép, ghi công, tệp tồn tại, WebP hợp lệ, tỉ lệ ảnh.

## Hiển thị

`ResponsiveImage` (`src/components/ui/ResponsiveImage.tsx`):

- `thumbnail` (mặc định, thẻ và khung nhỏ): `<picture>` nguồn WebP có `srcset` w-descriptor, ảnh dự phòng JPEG;
- `full` (khung rộng như hero hồ sơ xã): ảnh đầy đủ;
- luôn có `width`/`height` (giữ chỗ, tránh nhảy bố cục), `loading="lazy"`, `decoding="async"`.

## Chuyển sang object storage / CDN

Đường dẫn đi qua `mediaUrl()` (tiền tố base của Vite). Khi chuyển sang CDN chỉ cần đổi tiền tố đó và nới `img-src` trong chính sách CSP; không phải sửa từng thành phần.

## Ngân sách

Thumbnail WebP làm `totalBuildBytes` tăng khoảng 0,3 MB (đã ghi lý do trong `scripts/check_build_budget.mjs`). Thêm ảnh mới phải đo lại bằng `npm run check:budget`.
