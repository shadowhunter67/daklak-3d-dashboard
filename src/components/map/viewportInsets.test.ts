import { describe, expect, it } from 'vitest';
import {
  areInsetsEqual,
  calculateInsetDelta,
  calculateRelativeZoom,
  clampZoom,
  getCorrectionToSafeRect,
  getSafeViewportRect,
} from './viewportInsets';

describe('safe viewport helpers', () => {
  it('supports no inset and all asymmetric inset combinations', () => {
    expect(getSafeViewportRect(390, 844, { top: 0, right: 0, bottom: 0, left: 0 })).toEqual({
      left: 0,
      top: 0,
      right: 390,
      bottom: 844,
      width: 390,
      height: 844,
    });
    expect(getSafeViewportRect(390, 844, { top: 20, right: 10, bottom: 126, left: 30 })).toEqual({
      left: 30,
      top: 20,
      right: 380,
      bottom: 718,
      width: 350,
      height: 698,
    });
  });

  it('never returns a negative safe rectangle', () => {
    const rect = getSafeViewportRect(100, 100, { top: 120, right: 120, bottom: 120, left: 120 });
    expect(rect.width).toBe(0);
    expect(rect.height).toBe(0);
  });

  it('returns minimum correction only for points outside the safe rect', () => {
    const rect = getSafeViewportRect(390, 844, { top: 0, right: 0, bottom: 126, left: 0 });
    expect(getCorrectionToSafeRect({ x: 195, y: 400 }, rect)).toEqual({ x: 0, y: 0 });
    expect(getCorrectionToSafeRect({ x: 195, y: 800 }, rect)).toEqual({ x: 0, y: -106 });
    expect(getCorrectionToSafeRect({ x: 0, y: 400 }, rect)).toEqual({ x: 24, y: 0 });
  });

  it('calculates relative zoom, inset center delta, tolerance, and clamping', () => {
    const full = getSafeViewportRect(400, 800, { top: 0, right: 0, bottom: 0, left: 0 });
    const reduced = getSafeViewportRect(400, 800, { top: 20, right: 20, bottom: 180, left: 20 });
    expect(calculateRelativeZoom(full, reduced)).toBe(0.75);
    expect(calculateInsetDelta(full, reduced)).toEqual({ x: 0, y: -80 });
    expect(
      areInsetsEqual(
        { top: 0, right: 0, bottom: 100, left: 0 },
        { top: 0.5, right: 0, bottom: 100.9, left: 0 },
      ),
    ).toBe(true);
    expect(clampZoom(20, 60, 340)).toBe(60);
    expect(clampZoom(400, 60, 340)).toBe(340);
  });
});
