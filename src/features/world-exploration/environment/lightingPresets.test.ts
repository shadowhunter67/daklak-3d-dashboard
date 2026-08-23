import { describe, expect, it } from 'vitest';
import { isLightingPresetId, LIGHTING_PRESET_IDS, LIGHTING_PRESETS } from './lightingPresets';

describe('lightingPresets', () => {
  it('defines exactly the 3 documented presets, keyed by their own id', () => {
    expect(LIGHTING_PRESET_IDS).toEqual(['dawn', 'day', 'sunset']);
    for (const id of LIGHTING_PRESET_IDS) {
      expect(LIGHTING_PRESETS[id].id).toBe(id);
    }
  });

  it("'day' reproduces Phase T1-T3's original fixed lighting exactly (unchanged default look)", () => {
    const day = LIGHTING_PRESETS.day;
    expect(day.backgroundColor).toBe('#04110f');
    expect(day.hemisphereSky).toBe('#b9f0dd');
    expect(day.hemisphereGround).toBe('#031b19');
    expect(day.hemisphereIntensity).toBe(1.35);
    expect(day.directionalColor).toBe('#fff0c2');
    expect(day.directionalIntensity).toBe(3.4);
    expect(day.directionalPosition).toEqual([-6, 9, 7]);
  });

  it('every preset has a distinct background color (visibly different moods)', () => {
    const colors = LIGHTING_PRESET_IDS.map((id) => LIGHTING_PRESETS[id].backgroundColor);
    expect(new Set(colors).size).toBe(colors.length);
  });

  it('every preset has a finite, positive directional intensity and fog range', () => {
    for (const id of LIGHTING_PRESET_IDS) {
      const preset = LIGHTING_PRESETS[id];
      expect(preset.directionalIntensity).toBeGreaterThan(0);
      expect(preset.fogNear).toBeGreaterThan(0);
      expect(preset.fogFar).toBeGreaterThan(preset.fogNear);
    }
  });

  describe('isLightingPresetId', () => {
    it('accepts every real preset id', () => {
      for (const id of LIGHTING_PRESET_IDS) {
        expect(isLightingPresetId(id)).toBe(true);
      }
    });

    it('rejects an arbitrary string', () => {
      expect(isLightingPresetId('midnight')).toBe(false);
      expect(isLightingPresetId('')).toBe(false);
    });
  });
});
