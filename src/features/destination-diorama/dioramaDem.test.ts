import { describe, expect, it } from 'vitest';
import { DEM_CROPS } from './demCrops';
import { demMeters, demPeak, makeDemHeight, METERS_PER_HEIGHT_UNIT } from './dioramaDem';

describe('diorama DEM', () => {
  it('has a crop for each landmark and decodes plausible elevations', () => {
    expect(Object.keys(DEM_CROPS).sort()).toEqual(['cao-nguyen-van-hoa', 'nui-da-bia']);
    for (const site of Object.keys(DEM_CROPS)) {
      const peak = demPeak(site);
      expect(peak.meters, site).toBeGreaterThan(100);
      expect(peak.meters, site).toBeLessThan(1700);
    }
  });

  it('keeps Núi Đá Bia higher than the coast and Vân Hòa a raised plateau', () => {
    expect(demMeters('nui-da-bia', 0, -3)).toBeGreaterThan(demMeters('nui-da-bia', 20, 15) + 100);
    expect(demMeters('cao-nguyen-van-hoa', 0, -3)).toBeGreaterThan(300);
  });

  it('interpolates smoothly and clamps outside the crop', () => {
    expect(
      Math.abs(demMeters('nui-da-bia', 0, -3) - demMeters('nui-da-bia', 0.05, -3)),
    ).toBeLessThan(40);
    expect(demMeters('nui-da-bia', 500, 500)).toBeGreaterThanOrEqual(0);
  });

  it('converts metres to scene height with a small texture-breaking noise', () => {
    const h = makeDemHeight('nui-da-bia');
    expect(
      Math.abs(h(0, -3) - demMeters('nui-da-bia', 0, -3) / METERS_PER_HEIGHT_UNIT),
    ).toBeLessThan(0.2);
  });
});
