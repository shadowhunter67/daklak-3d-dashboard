import { describe, expect, it } from 'vitest';
import { cameraNearFarMeters, scaleBandForAltitude } from './cameraScaleBands';

describe('scaleBandForAltitude', () => {
  it('picks the right band from a neutral start for representative altitudes', () => {
    expect(scaleBandForAltitude(2, 'province')).toBe('human');
    expect(scaleBandForAltitude(200, 'province')).toBe('local');
    expect(scaleBandForAltitude(3_000, 'province')).toBe('district');
    expect(scaleBandForAltitude(50_000, 'human')).toBe('province');
  });

  it('does not change band when altitude stays within the current band', () => {
    expect(scaleBandForAltitude(10, 'human')).toBe('human');
    expect(scaleBandForAltitude(39, 'human')).toBe('human');
  });

  it('hysteresis: does not promote just past the threshold, only clearly past it', () => {
    // human ceiling = 40m; 41m is just past it but within the 20% hysteresis band (<48m).
    expect(scaleBandForAltitude(41, 'human')).toBe('human');
    expect(scaleBandForAltitude(49, 'human')).toBe('local');
  });

  it('hysteresis: does not demote just under the threshold, only clearly under it', () => {
    // local floor = 40m (human's ceiling); 39m is just under it but within the 20% hysteresis band (>32m).
    expect(scaleBandForAltitude(39, 'local')).toBe('local');
    expect(scaleBandForAltitude(31, 'local')).toBe('human');
  });

  it('never flickers when oscillating exactly at a raw threshold with no hysteresis margin', () => {
    let band: 'human' | 'local' | 'district' | 'province' = 'human';
    for (let i = 0; i < 20; i++) {
      band = scaleBandForAltitude(i % 2 === 0 ? 40 : 41, band);
    }
    expect(band).toBe('human');
  });

  it('is stable at the exact same altitude repeatedly (idempotent)', () => {
    let band: 'human' | 'local' | 'district' | 'province' = 'human';
    for (let i = 0; i < 10; i++) band = scaleBandForAltitude(35, band);
    expect(band).toBe('human');
  });
});

describe('cameraNearFarMeters', () => {
  it('near/far both grow with altitude', () => {
    const low = cameraNearFarMeters(2);
    const high = cameraNearFarMeters(50_000);
    expect(high.nearMeters).toBeGreaterThan(low.nearMeters);
    expect(high.farMeters).toBeGreaterThan(low.farMeters);
  });

  it('far is always well beyond near (healthy depth-buffer ratio), at low and high altitude alike', () => {
    for (const altitude of [0, 2, 40, 600, 8_000, 200_000]) {
      const { nearMeters, farMeters } = cameraNearFarMeters(altitude);
      expect(farMeters).toBeGreaterThan(nearMeters * 5);
    }
  });

  it('near never collapses to zero/negative even at zero or negative altitude input', () => {
    expect(cameraNearFarMeters(0).nearMeters).toBeGreaterThan(0);
    expect(cameraNearFarMeters(-5).nearMeters).toBeGreaterThan(0);
  });

  it('far stays within a sane ceiling even at extreme altitude (never grows unbounded)', () => {
    const { farMeters } = cameraNearFarMeters(10_000_000);
    expect(farMeters).toBeLessThanOrEqual(500_000);
  });

  it('far comfortably covers the whole ~215km province width at a typical province-overview altitude', () => {
    const { farMeters } = cameraNearFarMeters(100_000);
    expect(farMeters).toBeGreaterThan(215_000);
  });
});
