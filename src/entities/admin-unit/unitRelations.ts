/**
 * Quan hệ điểm → đơn vị hành chính, SUY RA bằng point-in-polygon trên ranh giới xã/phường hiện hành
 * (không phải thuộc tính hành chính do nguồn công bố). Chỉ gán khi điểm nằm trong một ranh giới;
 * điểm ở ngoài (tọa độ tâm có thể rơi sát biên hoặc ngoài ranh giới đơn giản hoá) trả về `null`,
 * không đoán đơn vị gần nhất. Domain thuần: không import tài nguyên GIS hay UI — ranh giới được
 * truyền vào (xem `importBoundary` của các domain khác).
 */
import { geoContains } from 'd3-geo';
import type { WardCollection } from '../../types/map';

export interface UnitAssignment {
  code: string;
  /** Luôn là 'point-in-polygon': quan hệ này là kết quả tính toán, không phải dữ liệu chính thức. */
  method: 'point-in-polygon';
}

export function destinationUnit(
  coordinates: readonly [number, number] | undefined,
  wards: WardCollection,
): UnitAssignment | null {
  if (!coordinates || !Number.isFinite(coordinates[0]) || !Number.isFinite(coordinates[1]))
    return null;
  const point: [number, number] = [coordinates[0], coordinates[1]];
  for (const feature of wards.features) {
    if (geoContains(feature, point)) {
      return { code: feature.properties.code, method: 'point-in-polygon' };
    }
  }
  return null;
}

export function groupDestinationsByUnit<T extends { coordinates: [number, number] }>(
  destinations: readonly T[],
  wards: WardCollection,
): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const destination of destinations) {
    const assignment = destinationUnit(destination.coordinates, wards);
    if (!assignment) continue;
    const list = grouped.get(assignment.code) ?? [];
    list.push(destination);
    grouped.set(assignment.code, list);
  }
  return grouped;
}
