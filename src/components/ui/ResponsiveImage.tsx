import { mediaUrl, type MediaItem } from '../../entities/media/mediaItem';

/**
 * Ảnh đáp ứng cho `MediaItem`: WebP thu nhỏ cho khung nhỏ, JPEG đầy đủ làm dự phòng, luôn có width/height
 * để giữ chỗ (không nhảy bố cục), tải lười và giải mã không chặn. Thành phần giao diện dùng cái này
 * thay vì tự ghép đường dẫn ảnh.
 */
export function ResponsiveImage({
  item,
  alt,
  sizes = '(max-width: 720px) 100vw, 330px',
  className,
  variant = 'thumbnail',
}: {
  item: MediaItem;
  alt: string;
  sizes?: string;
  className?: string;
  /** `thumbnail`: WebP 320px (thẻ, khung nhỏ). `full`: ảnh đầy đủ (hero rộng). */
  variant?: 'thumbnail' | 'full';
}) {
  if (variant === 'full') {
    return (
      <img
        className={className}
        src={mediaUrl(item.src)}
        alt={alt}
        width={item.width}
        height={item.height}
        loading="lazy"
        decoding="async"
      />
    );
  }
  return (
    <picture>
      <source
        type="image/webp"
        srcSet={`${mediaUrl(item.thumbnail)} ${item.thumbnailWidth}w`}
        sizes={sizes}
      />
      <img
        className={className}
        src={mediaUrl(item.src)}
        alt={alt}
        width={item.thumbnailWidth}
        height={item.thumbnailHeight}
        loading="lazy"
        decoding="async"
      />
    </picture>
  );
}
