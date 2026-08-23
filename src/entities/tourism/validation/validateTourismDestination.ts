/**
 * Structural, single-record validation cho `TourismDestination` — mirror tinh thần của
 * `src/entities/project/validation/validateProject.ts` nhưng đơn giản hơn nhiều (4 record tĩnh,
 * không có ràng buộc liên-record). Hàm thuần, dễ unit test với input giả xấu.
 */
import { TOURISM_DESTINATION_CATEGORIES, TOURISM_IMAGE_LICENSES } from '../types';
import type { TourismDestination } from '../types';
import { DATA_CONFIDENCE_LEVELS, VERIFICATION_STATUSES } from '../../project/types';

/**
 * Bbox thật của terrain hiện có (src/assets/maps/daklak/daklak-terrain-metadata.json,
 * `[minLon, minLat, maxLon, maxLat]`) — dùng làm biên hợp lý cho toạ độ điểm đến Đắk Lắk, cùng
 * nguồn dữ liệu terrain mà marker sẽ được vẽ lên, không phải một hằng số bịa riêng cho validation.
 */
export const DAKLAK_TERRAIN_BBOX = {
  minLon: 107.484181,
  minLat: 12.160547,
  maxLon: 109.458875,
  maxLat: 13.695296,
} as const;

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

export function validateTourismDestination(destination: TourismDestination): string[] {
  const errors: string[] = [];

  if (!destination.id.trim()) errors.push('id không được rỗng');
  if (!destination.name.trim()) errors.push('name không được rỗng');
  if (!destination.description.trim()) errors.push('description không được rỗng');

  if (!TOURISM_DESTINATION_CATEGORIES.includes(destination.category)) {
    errors.push(`category không hợp lệ: ${destination.category}`);
  }

  const [lon, lat] = destination.coordinates;
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
    errors.push('coordinates phải là số hữu hạn [lon, lat]');
  } else if (
    lon < DAKLAK_TERRAIN_BBOX.minLon ||
    lon > DAKLAK_TERRAIN_BBOX.maxLon ||
    lat < DAKLAK_TERRAIN_BBOX.minLat ||
    lat > DAKLAK_TERRAIN_BBOX.maxLat
  ) {
    errors.push(
      `coordinates [${lon}, ${lat}] nằm ngoài bbox Đắk Lắk đã biết (terrainMetadata.bbox)`,
    );
  }

  if (!destination.sourceUrl.trim() || !isHttpsUrl(destination.sourceUrl)) {
    errors.push('sourceUrl phải là một https URL không rỗng');
  }

  // imageUrl là optional, nhưng khi có mặt thì attribution + license PHẢI đi cùng — không cho phép
  // ảnh không ghi nguồn/giấy phép (chính là quy tắc "no fabricated data" áp cho ảnh minh hoạ).
  if (destination.imageUrl !== undefined) {
    if (!isHttpsUrl(destination.imageUrl)) errors.push('imageUrl phải là một https URL');
    if (!destination.imageAttribution?.trim())
      errors.push('imageAttribution bắt buộc khi có imageUrl');
    if (!destination.imageLicense || !TOURISM_IMAGE_LICENSES.includes(destination.imageLicense)) {
      errors.push('imageLicense bắt buộc và phải hợp lệ khi có imageUrl');
    }
  } else {
    if (destination.imageAttribution !== undefined || destination.imageLicense !== undefined) {
      errors.push('imageAttribution/imageLicense chỉ hợp lệ khi có imageUrl');
    }
  }

  if (!DATA_CONFIDENCE_LEVELS.includes(destination.confidence)) {
    errors.push(`confidence không hợp lệ: ${destination.confidence}`);
  }
  if (!VERIFICATION_STATUSES.includes(destination.verificationStatus)) {
    errors.push(`verificationStatus không hợp lệ: ${destination.verificationStatus}`);
  }
  if (!destination.dataOwner.trim()) errors.push('dataOwner không được rỗng');

  return errors;
}
