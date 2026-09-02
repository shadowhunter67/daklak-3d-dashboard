import { describe, expect, it } from 'vitest';
import {
  WARD_HIGHLIGHT_HIDDEN,
  WARD_HIGHLIGHT_SETTLED,
  easeOutCubic,
  wardHighlightFrameAt,
} from './wardHighlightAnimation';

describe('easeOutCubic', () => {
  it('is 0 at t=0 and 1 at t=1', () => {
    expect(easeOutCubic(0)).toBeCloseTo(0, 10);
    expect(easeOutCubic(1)).toBeCloseTo(1, 10);
  });

  it('clamps outside [0,1]', () => {
    expect(easeOutCubic(-1)).toBeCloseTo(0, 10);
    expect(easeOutCubic(2)).toBeCloseTo(1, 10);
  });
});

describe('wardHighlightFrameAt', () => {
  it('at progress=0, the ring starts wide and fully soft, with no opacity yet', () => {
    const frame = wardHighlightFrameAt(0);
    expect(frame.lineOpacity).toBeCloseTo(0, 10);
    expect(frame.lineWidth).toBeCloseTo(8, 10);
    expect(frame.lineBlur).toBeCloseTo(6, 10);
  });

  it('at progress=1, matches WARD_HIGHLIGHT_SETTLED exactly', () => {
    expect(wardHighlightFrameAt(1)).toEqual(WARD_HIGHLIGHT_SETTLED);
  });

  it('WARD_HIGHLIGHT_SETTLED is a fully-opaque, thin, sharp outline', () => {
    expect(WARD_HIGHLIGHT_SETTLED.lineOpacity).toBeCloseTo(1, 10);
    expect(WARD_HIGHLIGHT_SETTLED.lineWidth).toBeCloseTo(2.4, 10);
    expect(WARD_HIGHLIGHT_SETTLED.lineBlur).toBeCloseTo(0, 10);
  });

  it('lineOpacity increases monotonically over progress', () => {
    const values = [0, 0.25, 0.5, 0.75, 1].map((p) => wardHighlightFrameAt(p).lineOpacity);
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThanOrEqual(values[i - 1] - 1e-9);
    }
  });

  it('lineWidth decreases monotonically over progress (ring collapsing onto the boundary)', () => {
    const values = [0, 0.25, 0.5, 0.75, 1].map((p) => wardHighlightFrameAt(p).lineWidth);
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeLessThanOrEqual(values[i - 1] + 1e-9);
    }
  });

  it('lineBlur decreases monotonically over progress', () => {
    const values = [0, 0.25, 0.5, 0.75, 1].map((p) => wardHighlightFrameAt(p).lineBlur);
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeLessThanOrEqual(values[i - 1] + 1e-9);
    }
  });

  it('out-of-range progress clamps rather than extrapolating', () => {
    expect(wardHighlightFrameAt(-5)).toEqual(wardHighlightFrameAt(0));
    expect(wardHighlightFrameAt(5)).toEqual(wardHighlightFrameAt(1));
  });
});

describe('WARD_HIGHLIGHT_HIDDEN', () => {
  it('is fully transparent', () => {
    expect(WARD_HIGHLIGHT_HIDDEN.fillOpacity).toBe(0);
    expect(WARD_HIGHLIGHT_HIDDEN.lineOpacity).toBe(0);
  });
});
