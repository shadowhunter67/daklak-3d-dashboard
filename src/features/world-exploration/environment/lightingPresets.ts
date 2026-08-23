/**
 * Phase T4 (reports/tourism-digital-twin/) — a small set of selectable lighting presets for the
 * illustrative world scene (dawn / day / sunset), affecting only the directional "sun" light's
 * color/intensity/position and the scene's background + fog color. This is explicitly styling for
 * an "ILLUSTRATIVE — KỊCH BẢN MINH HỌA" scene (see `WorldExplorationView.tsx`'s existing badge,
 * left unchanged) — not a claim about real solar position/time-of-day simulation for Đắk Lắk, and
 * not fabricated vegetation/weather data. Modest scope, per the task's own instruction for this
 * sub-item: three hand-picked, plausible lighting moods, not a physically-based sky model.
 *
 * `'day'` reproduces Phase T1/T2/T3's original fixed lighting exactly (background `#04110f`,
 * hemisphere `['#b9f0dd', '#031b19', 1.35]`, directional `position=[-6, 9, 7]`,
 * `intensity=3.4`, `color='#fff0c2'`) so choosing it is a true no-op versus every prior phase's
 * shipped look — existing visual expectations for the default preset are unchanged.
 */
export type LightingPresetId = 'dawn' | 'day' | 'sunset';

export interface LightingPreset {
  id: LightingPresetId;
  backgroundColor: string;
  fogColor: string;
  fogNear: number;
  fogFar: number;
  hemisphereSky: string;
  hemisphereGround: string;
  hemisphereIntensity: number;
  directionalColor: string;
  directionalIntensity: number;
  directionalPosition: [number, number, number];
}

export const LIGHTING_PRESETS: Record<LightingPresetId, LightingPreset> = {
  day: {
    id: 'day',
    backgroundColor: '#04110f',
    fogColor: '#04110f',
    fogNear: 18,
    fogFar: 70,
    hemisphereSky: '#b9f0dd',
    hemisphereGround: '#031b19',
    hemisphereIntensity: 1.35,
    directionalColor: '#fff0c2',
    directionalIntensity: 3.4,
    directionalPosition: [-6, 9, 7],
  },
  dawn: {
    id: 'dawn',
    backgroundColor: '#1b1230',
    fogColor: '#2a1d3d',
    fogNear: 14,
    fogFar: 60,
    hemisphereSky: '#f6c9d8',
    hemisphereGround: '#241536',
    hemisphereIntensity: 1.05,
    directionalColor: '#ffd7a8',
    directionalIntensity: 2.4,
    directionalPosition: [-14, 3, 6],
  },
  sunset: {
    id: 'sunset',
    backgroundColor: '#2a0f10',
    fogColor: '#3a1712',
    fogNear: 14,
    fogFar: 65,
    hemisphereSky: '#ffb98a',
    hemisphereGround: '#1a0908',
    hemisphereIntensity: 1.1,
    directionalColor: '#ff9c5c',
    directionalIntensity: 2.9,
    directionalPosition: [14, 4, -6],
  },
};

export const LIGHTING_PRESET_IDS: LightingPresetId[] = ['dawn', 'day', 'sunset'];

export function isLightingPresetId(value: string): value is LightingPresetId {
  return (LIGHTING_PRESET_IDS as string[]).includes(value);
}
