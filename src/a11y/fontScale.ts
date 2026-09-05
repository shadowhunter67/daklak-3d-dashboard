/**
 * Pure font-scale preference logic — no React, no DOM assumptions beyond `Storage`, so it's
 * testable without rendering anything. Mirrors `src/i18n/locale.ts`'s persistence pattern
 * (best-effort localStorage, never throws) on purpose — same product, same convention.
 *
 * Backs the header's "A- / A / A+" control (section D of the accessibility-first design pass):
 * three discrete steps rather than a continuous slider, so keyboard/screen-reader users get a
 * simple, predictable three-state toggle instead of having to fine-tune a range input.
 */
export type FontScaleStep = 'small' | 'default' | 'large';

export const FONT_SCALE_STORAGE_KEY = 'daklak-dashboard.fontScale';

export const FONT_SCALE_VALUES: Record<FontScaleStep, number> = {
  small: 0.9,
  default: 1,
  large: 1.25,
};

export const FONT_SCALE_STEPS: readonly FontScaleStep[] = ['small', 'default', 'large'];

export function isFontScaleStep(value: string | null | undefined): value is FontScaleStep {
  return value === 'small' || value === 'default' || value === 'large';
}

/** Best-effort: `localStorage` can throw (privacy mode, disabled storage) — never let that crash the app. */
export function readPersistedFontScale(
  storage: Pick<Storage, 'getItem'> = window.localStorage,
): FontScaleStep | null {
  try {
    const raw = storage.getItem(FONT_SCALE_STORAGE_KEY);
    return isFontScaleStep(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function persistFontScale(
  step: FontScaleStep,
  storage: Pick<Storage, 'setItem'> = window.localStorage,
): void {
  try {
    storage.setItem(FONT_SCALE_STORAGE_KEY, step);
  } catch {
    // best-effort only — a user browsing in a mode that blocks storage just doesn't keep the
    // preference across visits; the control still works for the current session.
  }
}

export function resolveInitialFontScale(
  storage: Pick<Storage, 'getItem'> = window.localStorage,
): FontScaleStep {
  return readPersistedFontScale(storage) ?? 'default';
}

/** Applies the step as the `--user-font-scale` CSS custom property `global.css`'s typography
 * tokens read (`--font-size-label`, `.kpi-card__value`, etc.) — see that file's `:root` comment
 * for exactly which selectors respect this and which don't (the compact header toolbar chrome
 * deliberately doesn't, to avoid re-introducing header/panel overlap at fixed breakpoint heights). */
export function applyFontScale(step: FontScaleStep, root: HTMLElement = document.documentElement) {
  root.style.setProperty('--user-font-scale', String(FONT_SCALE_VALUES[step]));
}
