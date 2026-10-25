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
  'keyProjectsVisible' | 'tourismVisible' | 'planningZonesVisible' | 'planningOverlay'
>;

const LENS_FLAGS: Record<DetailMapLens, LensFlags> = {
  executive: {
    keyProjectsVisible: false,
    tourismVisible: false,
    planningZonesVisible: false,
    planningOverlay: 'none',
  },
  investment: {
    keyProjectsVisible: true,
    tourismVisible: false,
    planningZonesVisible: false,
    planningOverlay: 'none',
  },
  tourism: {
    keyProjectsVisible: false,
    tourismVisible: true,
    planningZonesVisible: false,
    planningOverlay: 'none',
  },
  planning: {
    keyProjectsVisible: false,
    tourismVisible: false,
    planningZonesVisible: true,
    planningOverlay: 'land-use',
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
