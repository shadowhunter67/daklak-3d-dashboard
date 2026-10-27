import type { DetailMapLayerState } from './detailMapTypes';

/**
 * "Góc nhìn" của bản đồ chi tiết: cấu hình sẵn các lớp THAM KHẢO (dự án trọng điểm, ranh quy hoạch,
 * lớp quy hoạch minh họa, điểm đến du lịch) để người xem đổi mục đích đọc bản đồ bằng một lần bấm.
 * Không đổi nền bản đồ, đường, công trình hay ranh giới hành chính — những thứ đó vẫn do người dùng
 * chọn riêng trong bảng lớp.
 */
export type DetailMapLens = 'executive' | 'investment' | 'tourism' | 'planning';

export const DETAIL_MAP_LENSES: readonly DetailMapLens[] = [
  'executive',
  'investment',
  'tourism',
  'planning',
];

type LensFlags = Pick<
  DetailMapLayerState,
  | 'keyProjectsVisible'
  | 'tourismVisible'
  | 'planningZonesVisible'
  | 'planningOverlay'
  | 'roadLabelsVisible'
  | 'placeLabelsVisible'
>;

/**
 * Thứ bậc thông tin của từng góc nhìn: ngoài lớp tham khảo riêng của nó, góc nhìn còn quyết định tên đường
 * và địa danh OSM (nhãn phụ) có hiện hay không để lớp chính của nó đọc được. Tên 102 xã/phường
 * (`wardLabelsVisible`) KHÔNG nằm trong danh sách này: luôn bật ở mọi góc nhìn.
 */
const LENS_FLAGS: Record<DetailMapLens, LensFlags> = {
  // Điều hành: giữ giao thông và địa danh để định vị; không lớp tham khảo nào.
  executive: {
    keyProjectsVisible: false,
    tourismVisible: false,
    planningZonesVisible: false,
    planningOverlay: 'none',
    roadLabelsVisible: true,
    placeLabelsVisible: true,
  },
  // Đầu tư: dự án trọng điểm nổi bật, bỏ nhãn phụ để không che điểm dự án.
  investment: {
    keyProjectsVisible: true,
    tourismVisible: false,
    planningZonesVisible: false,
    planningOverlay: 'none',
    roadLabelsVisible: false,
    placeLabelsVisible: false,
  },
  // Du lịch: điểm đến + địa danh để định hướng.
  tourism: {
    keyProjectsVisible: false,
    tourismVisible: true,
    planningZonesVisible: false,
    planningOverlay: 'none',
    roadLabelsVisible: true,
    placeLabelsVisible: true,
  },
  // Quy hoạch: ranh quy hoạch + lớp minh họa; bỏ nhãn phụ và điểm du lịch.
  planning: {
    keyProjectsVisible: false,
    tourismVisible: false,
    planningZonesVisible: true,
    planningOverlay: 'land-use',
    roadLabelsVisible: false,
    placeLabelsVisible: false,
  },
};

export function applyDetailMapLens(
  layers: DetailMapLayerState,
  lens: DetailMapLens,
): DetailMapLayerState {
  return { ...layers, ...LENS_FLAGS[lens] };
}

/** Góc nhìn khớp chính xác với trạng thái lớp hiện tại, hoặc `null` nếu người dùng đã tự tùy chỉnh. */
export function detectDetailMapLens(layers: DetailMapLayerState): DetailMapLens | null {
  return (
    DETAIL_MAP_LENSES.find((lens) => {
      const flags = LENS_FLAGS[lens];
      return (Object.keys(flags) as Array<keyof LensFlags>).every(
        (key) => layers[key] === flags[key],
      );
    }) ?? null
  );
}
