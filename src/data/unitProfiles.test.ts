import { describe, expect, it } from 'vitest';
import wards from '#province-assets/daklak-wards-render.json';
import provenance from '#province-assets/unit-profile-provenance.json';
import {
  getUnitProfile,
  provinceProfileTotals,
  subUnitCount,
  unitProfileSource,
} from './unitProfiles';

type Ward = { properties: { code: string; name: string; type: string; areaKm2: number } };
const features = wards.features as Ward[];

describe('unit profiles (real population + sub-units)', () => {
  it('covers exactly the same 102 unit codes as the geometry', () => {
    for (const { properties } of features) {
      const profile = getUnitProfile(properties.code);
      expect(profile, properties.name).toBeDefined();
      expect(profile?.name).toBe(properties.name);
      expect(profile?.type).toBe(properties.type);
    }
    expect(features).toHaveLength(102);
  });

  it('agrees with the independent geometry-source area for every unit (two-source rule)', () => {
    for (const { properties } of features) {
      expect(getUnitProfile(properties.code)?.areaKm2).toBeCloseTo(properties.areaKm2, 1);
    }
  });

  it('reproduces the source totals (area, sub-unit kinds) and stays within 0.1% on population', () => {
    const units = features.map(({ properties }) => getUnitProfile(properties.code)!);
    const sum = (pick: (u: (typeof units)[number]) => number) =>
      units.reduce((total, unit) => total + pick(unit), 0);
    expect(sum((u) => u.areaKm2)).toBeCloseTo(provinceProfileTotals.areaKm2, 0);
    expect(sum(subUnitCount)).toBe(provinceProfileTotals.subUnits);
    expect(sum((u) => u.villages)).toBe(1783);
    expect(sum((u) => u.buon)).toBe(598);
    expect(sum((u) => u.residentialGroups)).toBe(268);
    expect(sum((u) => u.neighbourhoods)).toBe(146);
    const population = sum((u) => u.population2025);
    expect(Math.abs(population - provinceProfileTotals.population2025)).toBeLessThan(
      provinceProfileTotals.population2025 * 0.001,
    );
    expect(provinceProfileTotals.communes + provinceProfileTotals.wards).toBe(102);
  });

  it('keeps known spot values from the source page', () => {
    expect(getUnitProfile('24235')).toMatchObject({
      name: 'Buôn Đôn',
      population2025: 6582,
      villages: 1,
      buon: 7,
    });
    expect(getUnitProfile('24133')).toMatchObject({
      population2025: 169596,
      residentialGroups: 84,
    });
  });

  it('ships pinned, auditable provenance', () => {
    expect(provenance.status).toBe('real');
    expect(unitProfileSource.revisionId).toMatch(/^\d+$/);
    expect(unitProfileSource.url).toContain('oldid=');
    expect(provenance.source.sha256OfWikitext).toMatch(/^[0-9a-f]{64}$/);
  });
});
