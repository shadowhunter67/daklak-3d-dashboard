import { describe, expect, it } from 'vitest';
import { PLANNING_THEMES, PLANNING_THEME_IDS, wardColorsForTheme } from './planningThemes';

describe('PLANNING_THEMES', () => {
  it('registers exactly the six discussed illustrative themes', () => {
    expect(PLANNING_THEME_IDS).toEqual([
      'land-use',
      'construction',
      'province-plan',
      'transport',
      'forestry',
      'industry-tourism',
    ]);
  });

  it('every theme has a name, >=2 categories, and a fallback category that exists', () => {
    for (const id of PLANNING_THEME_IDS) {
      const theme = PLANNING_THEMES[id];
      expect(theme.name.length).toBeGreaterThan(0);
      expect(theme.categories.length).toBeGreaterThanOrEqual(2);
      expect(theme.categories.map((c) => c.id)).toContain(theme.fallbackCategoryId);
      for (const category of theme.categories) {
        expect(category.color).toMatch(/^#[0-9a-f]{6}$/i);
        expect(category.label.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('wardColorsForTheme', () => {
  it('assigns every one of the 102 wards a colour drawn from that theme’s palette', () => {
    for (const id of PLANNING_THEME_IDS) {
      const palette = new Set(PLANNING_THEMES[id].categories.map((c) => c.color));
      const pairs = wardColorsForTheme(id);
      expect(pairs).toHaveLength(102);
      const codes = new Set(pairs.map(([code]) => code));
      expect(codes.size).toBe(102); // no duplicate ward codes
      for (const [, color] of pairs) {
        expect(palette.has(color)).toBe(true);
      }
    }
  });

  it('is deterministic — same input, same output', () => {
    expect(wardColorsForTheme('transport')).toEqual(wardColorsForTheme('transport'));
  });

  it('the transport theme actually places some wards on a corridor, not all in the fallback', () => {
    const { categories, fallbackCategoryId } = PLANNING_THEMES.transport;
    const fallbackColor = categories.find((c) => c.id === fallbackCategoryId)!.color;
    const onCorridor = wardColorsForTheme('transport').filter(
      ([, color]) => color !== fallbackColor,
    );
    expect(onCorridor.length).toBeGreaterThan(0);
  });
});
