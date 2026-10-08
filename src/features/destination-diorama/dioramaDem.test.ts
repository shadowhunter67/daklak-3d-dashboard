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

  it('reads the peak back consistently and stays inside the crop', () => {
    for (const site of Object.keys(DEM_CROPS)) {
      const peak = demPeak(site);
      expect(Math.abs(demMeters(site, peak.x, peak.z) - peak.meters), site).toBeLessThan(1);
      expect(Math.abs(peak.x), site).toBeLessThan(33);
    }
  });

  it('clamps to the edge value in every direction', () => {
    for (const site of Object.keys(DEM_CROPS)) {
      expect(demMeters(site, 1000, -3)).toBe(demMeters(site, 2000, -3));
      expect(demMeters(site, -1000, -3)).toBe(demMeters(site, -2000, -3));
      expect(demMeters(site, 0, 1000)).toBe(demMeters(site, 0, 2000));
      expect(demMeters(site, 0, -1000)).toBe(demMeters(site, 0, -2000));
    }
  });

  it('maps north to -z: Núi Đá Bia is open sea to the south-east corner and land to the north-west', () => {
    // Mảnh DEM đặt bắc ở hàng 0: góc (-x, -z) là tây-bắc, (+x, +z) là đông-nam (ven biển, thấp).
    expect(demMeters('nui-da-bia', 28, 28)).toBeLessThan(demMeters('nui-da-bia', 0, -3));
  });
});
