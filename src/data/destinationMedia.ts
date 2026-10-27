import type { MediaItem } from '../entities/media/mediaItem';
import { verifiedTourismDestinations } from '../entities/tourism/verifiedTourismDestinations';
import meta from './destinationPhotoMeta.json';

/** "Ảnh: Tác giả, Wikimedia Commons, File:X.jpg" → "Tác giả" (phần ghi công); rỗng nếu không tách được. */
function authorOf(attribution: string | undefined): string {
  const parts = (attribution ?? '').replace(/^Ảnh:\s*/, '').split(',');
  const first = parts[0]?.trim() ?? '';
  return /Wikimedia Commons|File:/.test(first) ? 'Wikimedia Commons' : first;
}

/**
 * Siêu dữ liệu ảnh điểm đến (một nguồn sự thật cho giao diện). Kích thước lấy từ
 * `destinationPhotoMeta.json` do `scripts/media/build_destination_thumbnails.py` sinh.
 */
export const DESTINATION_MEDIA: ReadonlyMap<string, MediaItem> = new Map(
  verifiedTourismDestinations.flatMap((d) => {
    const dims = (meta as Record<string, (typeof meta)[keyof typeof meta]>)[d.id];
    if (!d.imageUrl || !d.imageLicense || !dims) return [];
    const item: MediaItem = {
      id: d.id,
      title: d.name,
      src: `images/destinations/${d.id}.jpg`,
      thumbnail: `images/destinations/thumb/${d.id}.webp`,
      width: dims.width,
      height: dims.height,
      thumbnailWidth: dims.thumbWidth,
      thumbnailHeight: dims.thumbHeight,
      author: authorOf(d.imageAttribution),
      license: d.imageLicense,
      sourceUrl: d.imageUrl,
      description: d.imageAttribution ?? d.name,
      representativeType: 'destination-in-unit',
    };
    return [[d.id, item] as const];
  }),
);
