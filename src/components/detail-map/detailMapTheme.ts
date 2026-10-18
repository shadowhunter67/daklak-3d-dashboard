/**
 * Paint values the detail map changes with the app theme. The MapLibre style is built once (dark);
 * switching theme only re-sets these paint properties on layers that already exist — no style
 * reload, no lost camera/selection. Light matches the approved design: soft neutral ground, green
 * wards with white borders and dark, white-haloed names.
 */
export type DetailMapTheme = 'light' | 'dark';

export interface DetailMapThemePaint {
  background: string;
  wardFill: string;
  wardFillOpacity: number;
  wardLine: string;
  wardLineWidth: number;
  wardLineOpacity: number;
  labelColor: string;
  labelHalo: string;
  labelHaloWidth: number;
  leaderColor: string;
}

export const DETAIL_MAP_THEME_PAINT: Record<DetailMapTheme, DetailMapThemePaint> = {
  dark: {
    background: '#0d211f',
    wardFill: '#173f38',
    wardFillOpacity: 0.55,
    wardLine: '#a5c9bb',
    wardLineWidth: 0.7,
    wardLineOpacity: 0.8,
    labelColor: '#f3f0d8',
    labelHalo: '#071918',
    labelHaloWidth: 1.4,
    leaderColor: '#f3f0d8',
  },
  light: {
    background: '#e9f0ec',
    wardFill: '#2f8f55',
    wardFillOpacity: 0.88,
    wardLine: '#ffffff',
    wardLineWidth: 0.9,
    wardLineOpacity: 0.95,
    labelColor: '#0b241b',
    labelHalo: '#ffffff',
    labelHaloWidth: 2.2,
    leaderColor: '#0b241b',
  },
};
