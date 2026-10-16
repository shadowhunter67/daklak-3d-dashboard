import { describe, expect, it } from 'vitest';
import { metersPerPixel, pickScaleBar } from './mapScale';

describe('mapScale', () => {
  it('halves meters-per-pixel for each zoom level', () => {
    expect(metersPerPixel(12.7, 9) / metersPerPixel(12.7, 10)).toBeCloseTo(2, 5);
  });

  it('shrinks with latitude (Mercator)', () => {
    expect(metersPerPixel(60, 8)).toBeLessThan(metersPerPixel(0, 8));
  });

  it('picks a nice distance that fits in the max width', () => {
    const bar = pickScaleBar(12.7, 8);
    expect(bar.widthPx).toBeLessThanOrEqual(110);
    expect(bar.label).toMatch(/^\d+ (km|m)$/);
  });

  it('uses metres when zoomed far in', () => {
    expect(pickScaleBar(12.7, 17).label).toMatch(/ m$/);
  });
});
