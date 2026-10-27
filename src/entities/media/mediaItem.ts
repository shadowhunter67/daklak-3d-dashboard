/**
 * Mô hình ảnh dùng chung (media pipeline). Mọi ảnh hiển thị phải đi qua `MediaItem`: có nguồn, giấy phép,
 * ghi công, kích thước cố định (tránh nhảy bố cục) và đường dẫn cục bộ (CSP chỉ cho `img-src 'self'`).
 * Thành phần giao diện không tự ghép đường dẫn ảnh; chỉ nhận `MediaItem`.
 */
export type RepresentativeType =
  /** Ảnh một điểm đến du lịch nằm trong địa bàn — không phải ảnh toàn cảnh của đơn vị. */
  | 'destination-in-unit'
  /** Ảnh toàn cảnh đại diện cho cả đơn vị (chưa có ảnh nào đạt điều kiện). */
  | 'unit-overview';

export interface MediaItem {
  id: string;
  /** Mã xã/phường mà ảnh minh họa; vắng khi ảnh gắn với điểm đến chưa gán đơn vị. */
  unitId?: string;
  title: string;
  /** Đường dẫn tương đối dưới `public/` của ảnh đầy đủ (<= 640px). */
  src: string;
  /** Đường dẫn tương đối dưới `public/` của ảnh thu nhỏ WebP. */
  thumbnail: string;
  width: number;
  height: number;
  thumbnailWidth: number;
  thumbnailHeight: number;
  author: string;
  license: string;
  sourceUrl: string;
  description: string;
  representativeType: RepresentativeType;
}

/** Lỗi kiểm tra một `MediaItem`; mảng rỗng nghĩa là hợp lệ. */
export function validateMediaItem(item: MediaItem): string[] {
  const issues: string[] = [];
  if (!item.id.trim()) issues.push('thiếu id');
  if (!/^https:\/\//.test(item.sourceUrl)) issues.push('sourceUrl phải là https');
  if (!item.license.trim()) issues.push('thiếu giấy phép');
  if (!item.author.trim()) issues.push('thiếu ghi công tác giả');
  if (/^https?:/.test(item.src) || /^https?:/.test(item.thumbnail))
    issues.push('ảnh phải là tệp cục bộ (CSP img-src self)');
  if (!(item.width > 0 && item.height > 0)) issues.push('thiếu kích thước ảnh');
  if (!(item.thumbnailWidth > 0 && item.thumbnailHeight > 0))
    issues.push('thiếu kích thước thumbnail');
  if (!item.thumbnail.endsWith('.webp')) issues.push('thumbnail phải là WebP');
  return issues;
}

/** URL ảnh tương đối `public/` → URL có tiền tố base của Vite (đổi sang CDN chỉ cần sửa tại đây). */
export function mediaUrl(path: string, base: string = import.meta.env.BASE_URL): string {
  return `${base}${path.replace(/^\//, '')}`;
}
