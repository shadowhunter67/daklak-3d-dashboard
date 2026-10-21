import { describe, expect, it } from 'vitest';
import { DEFAULT_DETAIL_MAP_CAMERA, isDefaultDetailMapCamera } from './detailMapTypes';

describe('isDefaultDetailMapCamera', () => {
  it('đúng với camera mặc định và sai số làm tròn của URL/bản đồ (kể cả bearing/pitch)', () => {
    expect(isDefaultDetailMapCamera(DEFAULT_DETAIL_MAP_CAMERA)).toBe(true);
    expect(
      isDefaultDetailMapCamera({
        ...DEFAULT_DETAIL_MAP_CAMERA,
        longitude: DEFAULT_DETAIL_MAP_CAMERA.longitude + 0.00001,
        bearing: 0.00001,
        pitch: -0.00001,
      }),
    ).toBe(true);
  });
  it('sai khi người dùng đã xoay/nghiêng hoặc di chuyển rõ rệt', () => {
    expect(isDefaultDetailMapCamera({ ...DEFAULT_DETAIL_MAP_CAMERA, bearing: 15 })).toBe(false);
    expect(isDefaultDetailMapCamera({ ...DEFAULT_DETAIL_MAP_CAMERA, pitch: 30 })).toBe(false);
    expect(isDefaultDetailMapCamera({ ...DEFAULT_DETAIL_MAP_CAMERA, zoom: 9 })).toBe(false);
  });
});
