import { describe, expect, it } from 'vitest';
import { formatSubUnits } from './formatSubUnits';
import { getUnitProfile } from './unitProfiles';

const t = (key: string) => key.split('.')[1];

describe('formatSubUnits', () => {
  it('lists only non-zero kinds in a fixed order', () => {
    const profile = getUnitProfile('24235')!;
    expect(formatSubUnits(profile, t as never)).toBe('1 villages · 7 buon');
  });

  it('is empty when a unit has no sub-units', () => {
    expect(
      formatSubUnits(
        {
          ...getUnitProfile('24235')!,
          villages: 0,
          buon: 0,
          residentialGroups: 0,
          neighbourhoods: 0,
        },
        t as never,
      ),
    ).toBe('');
  });
});
