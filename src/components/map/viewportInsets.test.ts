import { describe, expect, it } from 'vitest';
import { calculateCameraFrame } from './viewportInsets';

describe('calculateCameraFrame', () => {
  it('fits content inside the unobscured viewport', () => {
    expect(calculateCameraFrame(390, 738, { top: 0, right: 0, bottom: 126, left: 0 })).toEqual({
      zoomScale: 612 / 738,
      offsetX: 0,
      offsetY: -63,
    });
  });

  it('supports asymmetric side insets', () => {
    expect(calculateCameraFrame(800, 400, { top: 0, right: 200, bottom: 0, left: 0 })).toEqual({
      zoomScale: 0.75,
      offsetX: -100,
      offsetY: 0,
    });
  });
});
