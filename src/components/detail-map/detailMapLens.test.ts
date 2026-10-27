import { describe, expect, it } from 'vitest';
import { DEFAULT_DETAIL_MAP_LAYER_STATE } from './detailMapTypes';
import { DETAIL_MAP_LENSES, applyDetailMapLens, detectDetailMapLens } from './detailMapLens';

describe('detail map lenses', () => {
  it('mỗi góc nhìn bật đúng lớp của nó và tắt lớp tham khảo của góc nhìn khác', () => {
    const investment = applyDetailMapLens(DEFAULT_DETAIL_MAP_LAYER_STATE, 'investment');
    expect(investment.keyProjectsVisible).toBe(true);
    expect(investment.tourismVisible).toBe(false);
    expect(investment.planningZonesVisible).toBe(false);

    const tourism = applyDetailMapLens(investment, 'tourism');
    expect(tourism.tourismVisible).toBe(true);
    expect(tourism.keyProjectsVisible).toBe(false);

    const planning = applyDetailMapLens(tourism, 'planning');
    expect(planning.planningZonesVisible).toBe(true);
    expect(planning.planningOverlay).toBe('land-use');
    expect(planning.tourismVisible).toBe(false);

    const executive = applyDetailMapLens(planning, 'executive');
    expect(executive.planningZonesVisible).toBe(false);
    expect(executive.planningOverlay).toBe('none');
    expect(executive.keyProjectsVisible).toBe(false);
  });

  it('không đụng tới nền bản đồ, đường, công trình', () => {
    const base = {
      ...DEFAULT_DETAIL_MAP_LAYER_STATE,
      baseMap: 'satellite' as const,
      roadsVisible: false,
    };
    const next = applyDetailMapLens(base, 'tourism');
    expect(next.baseMap).toBe('satellite');
    expect(next.roadsVisible).toBe(false);
  });

  it('nhận diện lại góc nhìn đang bật; bật lẻ thêm lớp thì không còn là góc nhìn nào', () => {
    for (const lens of DETAIL_MAP_LENSES) {
      expect(detectDetailMapLens(applyDetailMapLens(DEFAULT_DETAIL_MAP_LAYER_STATE, lens))).toBe(
        lens,
      );
    }
    const custom = {
      ...applyDetailMapLens(DEFAULT_DETAIL_MAP_LAYER_STATE, 'tourism'),
      keyProjectsVisible: true,
    };
    expect(detectDetailMapLens(custom)).toBeNull();
  });

  it('thứ bậc thông tin: nhãn phụ khác nhau theo góc nhìn nhưng tên 102 xã/phường luôn bật', () => {
    const labelsOf = (lens: Parameters<typeof applyDetailMapLens>[1]) => {
      const layers = applyDetailMapLens(DEFAULT_DETAIL_MAP_LAYER_STATE, lens);
      return { road: layers.roadLabelsVisible, place: layers.placeLabelsVisible };
    };
    expect(labelsOf('executive')).toEqual({ road: true, place: true });
    expect(labelsOf('tourism')).toEqual({ road: true, place: true });
    expect(labelsOf('investment')).toEqual({ road: false, place: false });
    expect(labelsOf('planning')).toEqual({ road: false, place: false });
    for (const lens of DETAIL_MAP_LENSES) {
      expect(applyDetailMapLens(DEFAULT_DETAIL_MAP_LAYER_STATE, lens).wardLabelsVisible).toBe(true);
    }
  });

  it('góc nhìn Du lịch ẩn lớp dự án/quy hoạch; Quy hoạch ẩn điểm du lịch', () => {
    const tourism = applyDetailMapLens(DEFAULT_DETAIL_MAP_LAYER_STATE, 'tourism');
    expect([tourism.keyProjectsVisible, tourism.planningZonesVisible]).toEqual([false, false]);
    const planning = applyDetailMapLens(DEFAULT_DETAIL_MAP_LAYER_STATE, 'planning');
    expect(planning.tourismVisible).toBe(false);
  });
});
