/**
 * Ảnh đại diện xã/phường suy ra từ ảnh của điểm đến du lịch đã xác minh nằm trong ranh giới đơn vị
 * (point-in-polygon, cùng quan hệ với `unitRelations.ts`). Không thêm file mới: dùng lại ảnh đã có
 * trong `public/images/destinations/` (giấy phép tự do, có ghi công). Ảnh luôn được trình bày là
 * "ảnh điểm đến trong địa bàn", không phải ảnh toàn cảnh của đơn vị. Domain thuần: không import GIS
 * asset hay UI; ranh giới được truyền vào.
 */
import type { MediaSource } from '../researched-project/media';
import type { TourismDestination } from '../tourism/types';
import type { WardCollection } from '../../types/map';
import { destinationUnit } from './unitRelations';

/** Ảnh gắn với một xã/phường. Chỉ `usage: 'production'` (đã kiểm license, có file cục bộ) mới được
 * hiển thị và tính vào độ phủ; `reference-only`/`rejected` chỉ lưu để truy vết. */
export interface UnitMedia extends Omit<MediaSource, 'retrievedAt'> {
  administrativeUnitCode: string;
  /** Ngày tải khi có (ảnh suy ra từ điểm đến không lưu ngày tải riêng). */
  retrievedAt?: string;
  /** Điểm đến du lịch mà ảnh này thuộc về (khi ảnh được suy ra từ điểm đến). */
  viaDestinationId?: string;
}

export function deriveUnitMedia(
  destinations: readonly TourismDestination[],
  wards: WardCollection,
): UnitMedia[] {
  const byUnit = new Map<string, UnitMedia>();
  for (const d of destinations) {
    if (!d.imageUrl || !d.imageLicense) continue;
    const unit = destinationUnit(d.coordinates, wards);
    if (!unit || byUnit.has(unit.code)) continue;
    byUnit.set(unit.code, {
      id: `unit-${unit.code}-${d.id}`,
      administrativeUnitCode: unit.code,
      subject: d.name,
      sourceUrl: d.imageUrl,
      provider: 'Wikimedia Commons',
      license: d.imageLicense,
      localAsset: `images/destinations/${d.id}.jpg`,
      usage: 'production',
      notes: d.imageAttribution,
      viaDestinationId: d.id,
    });
  }
  return [...byUnit.values()];
}
