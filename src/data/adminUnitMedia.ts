import wards from '#province-assets/daklak-wards-render.json';
import { deriveUnitMedia, type UnitMedia } from '../entities/admin-unit/unitMedia';
import { verifiedTourismDestinations } from '../entities/tourism/verifiedTourismDestinations';
import type { WardCollection } from '../types/map';

/**
 * Ảnh đại diện từng xã/phường. Hiện chỉ gồm ảnh của điểm đến du lịch đã xác minh nằm trong ranh giới
 * đơn vị (suy ra bằng tọa độ, dùng lại file cục bộ giấy phép tự do — xem `unitMedia.ts`). Các ảnh ứng
 * viên khác trên Commons CHƯA đủ điều kiện (chủ thể chưa thuộc chắc địa bàn, hoặc là ảnh chung chung)
 * và chỉ được ghi ở `reports/research/administrative-unit-media-review.md`. Đơn vị không có ảnh dùng
 * hình dạng ranh giới từ bản đồ GIS và nói rõ điều đó.
 */
export const ADMIN_UNIT_MEDIA: readonly UnitMedia[] = deriveUnitMedia(
  verifiedTourismDestinations,
  wards as WardCollection,
);
