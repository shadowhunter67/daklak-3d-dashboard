/**
 * Theme preference (Sáng / Tối) — pure logic, same best-effort localStorage pattern as
 * `fontScale.ts`. Dark is the default because most existing views were designed dark; the redesigned shell and Executive Overview are token-driven and also support light. The preference lives on `<html data-theme>`; `shell.css` reads it.
 */
export type ThemeMode = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'daklak-dashboard.theme';

export const THEME_MODES: readonly ThemeMode[] = ['light', 'dark'];

export function isThemeMode(value: string | null | undefined): value is ThemeMode {
  return value === 'light' || value === 'dark';
}

export function readPersistedTheme(
  storage: Pick<Storage, 'getItem'> = window.localStorage,
): ThemeMode | null {
  try {
    const raw = storage.getItem(THEME_STORAGE_KEY);
    return isThemeMode(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function persistTheme(
  mode: ThemeMode,
  storage: Pick<Storage, 'setItem'> = window.localStorage,
): void {
  try {
    storage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // best-effort only — the toggle still works for the current session.
  }
}

export function resolveInitialTheme(
  storage: Pick<Storage, 'getItem'> = window.localStorage,
): ThemeMode {
  return readPersistedTheme(storage) ?? 'dark';
}

export function applyTheme(mode: ThemeMode, root: HTMLElement = document.documentElement): void {
  root.dataset.theme = mode;
  root.style.colorScheme = mode;
}
