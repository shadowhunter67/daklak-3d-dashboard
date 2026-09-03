import { describe, expect, it } from 'vitest';
import {
  easeOutCubic,
  revealFrameAt,
  revealHiddenFrame,
  revealSettledFrame,
} from './revealAnimation';

const TARGETS = { fillOpacity: 0.35, lineOpacity: 1, lineWidth: 2 };

describe('easeOutCubic', () => {
  it('is 0 at t=0 and 1 at t=1, and clamps outside [0,1]', () => {
    expect(easeOutCubic(0)).toBeCloseTo(0, 10);
    expect(easeOutCubic(1)).toBeCloseTo(1, 10);
    expect(easeOutCubic(-1)).toBeCloseTo(0, 10);
    expect(easeOutCubic(2)).toBeCloseTo(1, 10);
  });
});

describe('revealFrameAt', () => {
  it('starts at zero opacity and a wide, soft ring', () => {
    const frame = revealFrameAt(0, TARGETS);
    expect(frame.lineOpacity).toBeCloseTo(0, 10);
    expect(frame.lineWidth).toBeGreaterThan(TARGETS.lineWidth);
    expect(frame.lineBlur).toBeGreaterThan(0);
  });

  it('settles exactly at the target opacity/width with no blur at progress=1', () => {
    const frame = revealFrameAt(1, TARGETS);
    expect(frame.lineOpacity).toBeCloseTo(TARGETS.lineOpacity, 10);
    expect(frame.lineWidth).toBeCloseTo(TARGETS.lineWidth, 10);
    expect(frame.lineBlur).toBeCloseTo(0, 10);
    expect(frame).toEqual(revealSettledFrame(TARGETS));
  });

  it('lineOpacity increases monotonically and lineWidth/lineBlur decrease monotonically', () => {
    const steps = [0, 0.25, 0.5, 0.75, 1];
    const opacities = steps.map((p) => revealFrameAt(p, TARGETS).lineOpacity);
    const widths = steps.map((p) => revealFrameAt(p, TARGETS).lineWidth);
    const blurs = steps.map((p) => revealFrameAt(p, TARGETS).lineBlur);
    for (let i = 1; i < steps.length; i++) {
      expect(opacities[i]).toBeGreaterThanOrEqual(opacities[i - 1] - 1e-9);
      expect(widths[i]).toBeLessThanOrEqual(widths[i - 1] + 1e-9);
      expect(blurs[i]).toBeLessThanOrEqual(blurs[i - 1] + 1e-9);
    }
  });

  it('out-of-range progress clamps rather than extrapolating', () => {
    expect(revealFrameAt(-5, TARGETS)).toEqual(revealFrameAt(0, TARGETS));
    expect(revealFrameAt(5, TARGETS)).toEqual(revealFrameAt(1, TARGETS));
  });

  it('scales to different targets (e.g. the planning-zone fill opacity of 0.35)', () => {
    const frame = revealSettledFrame({ fillOpacity: 0.35, lineOpacity: 1, lineWidth: 2 });
    expect(frame.fillOpacity).toBeCloseTo(0.35, 10);
  });
});

describe('revealHiddenFrame', () => {
  it('is fully transparent regardless of target width', () => {
    const frame = revealHiddenFrame(TARGETS);
    expect(frame.fillOpacity).toBe(0);
    expect(frame.lineOpacity).toBe(0);
    expect(frame.lineWidth).toBe(TARGETS.lineWidth);
  });
});
