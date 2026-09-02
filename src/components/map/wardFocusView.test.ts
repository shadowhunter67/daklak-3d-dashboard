import { describe, expect, it } from 'vitest';
import {
  FULL_VIEW,
  MAP_VIEW_HEIGHT,
  MAP_VIEW_WIDTH,
  easeInOutCubic,
  focusViewBox,
  interpolateViewBox,
  viewBoxesApproximatelyEqual,
} from './wardFocusView';

describe('easeInOutCubic', () => {
  it('is 0 at t=0, 1 at t=1, and 0.5 at t=0.5', () => {
    expect(easeInOutCubic(0)).toBeCloseTo(0, 10);
    expect(easeInOutCubic(1)).toBeCloseTo(1, 10);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 10);
  });

  it('clamps outside [0,1]', () => {
    expect(easeInOutCubic(-1)).toBeCloseTo(0, 10);
    expect(easeInOutCubic(2)).toBeCloseTo(1, 10);
  });
});

describe('focusViewBox', () => {
  it('preserves the 900:720 aspect ratio for a tall, narrow ward', () => {
    const rect = focusViewBox([
      [400, 100],
      [420, 600],
    ]);
    expect(rect.width / rect.height).toBeCloseTo(MAP_VIEW_WIDTH / MAP_VIEW_HEIGHT, 6);
  });

  it('preserves the aspect ratio for a wide, short ward', () => {
    const rect = focusViewBox([
      [50, 300],
      [850, 340],
    ]);
    expect(rect.width / rect.height).toBeCloseTo(MAP_VIEW_WIDTH / MAP_VIEW_HEIGHT, 6);
  });

  it('never produces a rect outside the map extent, even for a ward at the very edge', () => {
    const rect = focusViewBox([
      [0, 0],
      [10, 10],
    ]);
    expect(rect.x).toBeGreaterThanOrEqual(0);
    expect(rect.y).toBeGreaterThanOrEqual(0);
    expect(rect.x + rect.width).toBeLessThanOrEqual(MAP_VIEW_WIDTH + 1e-6);
    expect(rect.y + rect.height).toBeLessThanOrEqual(MAP_VIEW_HEIGHT + 1e-6);
  });

  it('clamps zoom to MAX_ZOOM (4) for a tiny ward, not zooming in indefinitely', () => {
    const rect = focusViewBox([
      [440, 350],
      [441, 351],
    ]);
    expect(rect.width).toBeCloseTo(MAP_VIEW_WIDTH / 4, 6);
  });

  it('never zooms out past zoom 1 for a province-sized bbox', () => {
    const rect = focusViewBox([
      [0, 0],
      [900, 720],
    ]);
    expect(rect.width).toBeCloseTo(MAP_VIEW_WIDTH, 6);
    expect(rect.height).toBeCloseTo(MAP_VIEW_HEIGHT, 6);
  });
});

describe('interpolateViewBox', () => {
  const from = FULL_VIEW;
  const to = focusViewBox([
    [400, 300],
    [500, 400],
  ]);

  it('equals "from" at t=0 and "to" at t=1', () => {
    expect(viewBoxesApproximatelyEqual(interpolateViewBox(from, to, 0), from)).toBe(true);
    expect(viewBoxesApproximatelyEqual(interpolateViewBox(from, to, 1), to)).toBe(true);
  });

  it('width decreases monotonically as t goes from 0 to 1 when zooming in', () => {
    const widths = [0, 0.25, 0.5, 0.75, 1].map((t) => interpolateViewBox(from, to, t).width);
    for (let i = 1; i < widths.length; i++) {
      expect(widths[i]).toBeLessThanOrEqual(widths[i - 1] + 1e-9);
    }
  });

  it('keeps the 900:720 aspect ratio at every step', () => {
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      const rect = interpolateViewBox(from, to, t);
      expect(rect.width / rect.height).toBeCloseTo(MAP_VIEW_WIDTH / MAP_VIEW_HEIGHT, 6);
    }
  });
});

describe('viewBoxesApproximatelyEqual', () => {
  it('is true for identical rects and false for a meaningfully different one', () => {
    expect(viewBoxesApproximatelyEqual(FULL_VIEW, { ...FULL_VIEW })).toBe(true);
    expect(viewBoxesApproximatelyEqual(FULL_VIEW, { ...FULL_VIEW, width: 500 })).toBe(false);
  });
});
