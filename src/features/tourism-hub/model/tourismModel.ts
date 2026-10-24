import { destinationUnit } from '../../../entities/admin-unit/unitRelations';
import type {
  TourismDestination,
  TourismDestinationCategory,
} from '../../../entities/tourism/types';
import type { WardCollection } from '../../../types/map';

export interface TourismItem {
  destination: TourismDestination;
  /** Đơn vị hành chính SUY RA bằng point-in-polygon; `null` khi điểm nằm ngoài mọi ranh giới. */
  unitCode: string | null;
}

export interface TourismFilters {
  query?: string;
  category?: TourismDestinationCategory | '';
}

const fold = (value: string) =>
  value.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().trim();

export function buildTourismItems(
  destinations: readonly TourismDestination[],
  wards: WardCollection,
): TourismItem[] {
  return destinations.map((destination) => ({
    destination,
    unitCode: destinationUnit(destination.coordinates, wards)?.code ?? null,
  }));
}

export function filterTourismItems(
  items: readonly TourismItem[],
  { query, category }: TourismFilters,
): TourismItem[] {
  const needle = query ? fold(query) : '';
  return items.filter(
    ({ destination }) =>
      (!category || destination.category === category) &&
      (!needle || fold(destination.name).includes(needle)),
  );
}

/** Chỉ đếm những gì có dữ liệu thật; không có lượt khách vì repo chưa có nguồn công bố. */
export function summarizeTourism(items: readonly TourismItem[]) {
  return {
    total: items.length,
    withPhoto: items.filter((i) => i.destination.imageUrl).length,
    categories: new Set(items.map((i) => i.destination.category)).size,
    units: new Set(items.map((i) => i.unitCode).filter((c): c is string => c !== null)).size,
  };
}
