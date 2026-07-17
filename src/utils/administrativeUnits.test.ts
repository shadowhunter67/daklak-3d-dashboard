import { describe, expect, it } from 'vitest';
import wards from '../assets/maps/daklak/daklak-wards-render.json';
import type { WardCollection } from '../types/map';
import { sortAdministrativeUnits } from './administrativeUnits';

const units = (wards as WardCollection).features.map(({ properties }) => properties);

describe('sortAdministrativeUnits', () => {
  it('uses Vietnamese alphabetical order without mutating the input', () => {
    const input = [
      { name: 'Xuân', type: 'xa', code: '3' },
      { name: 'Đắk', type: 'xa', code: '2' },
      { name: 'Ân', type: 'xa', code: '1' },
    ];
    const original = [...input];
    expect(sortAdministrativeUnits(input).map(({ name }) => name)).toEqual(['Ân', 'Đắk', 'Xuân']);
    expect(input).toEqual(original);
  });

  it('breaks equal-name ties by type and then code', () => {
    const input = [
      { name: 'An', type: 'xa', code: '20' },
      { name: 'An', type: 'phuong', code: '30' },
      { name: 'An', type: 'xa', code: '10' },
    ];
    expect(sortAdministrativeUnits(input).map(({ code }) => code)).toEqual(['30', '10', '20']);
  });

  it('preserves all 102 administrative codes', () => {
    const sorted = sortAdministrativeUnits(units);
    expect(sorted).toHaveLength(102);
    expect(sorted.map(({ code }) => code).sort()).toEqual(units.map(({ code }) => code).sort());
  });
});
