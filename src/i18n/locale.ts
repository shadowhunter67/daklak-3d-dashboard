/**
 * Pure locale resolution — no React, no DOM assumptions beyond `Storage`/`URLSearchParams`, so it
 * is testable without rendering anything. See docs/adr/0003-internationalization.md for the
 * priority rule (URL > persisted preference > default) and why `navigator.language` is never used.
 */
export type Locale = 'vi' | 'en';

export const DEFAULT_LOCALE: Locale = 'vi';
export const LOCALE_QUERY_PARAM = 'lang';
export const LOCALE_STORAGE_KEY = 'daklak-dashboard.locale';

export function isLocale(value: string | null | undefined): value is Locale {
  return value === 'vi' || value === 'en';
}

export function parseLocaleFromSearch(search: string): Locale | null {
  const raw = new URLSearchParams(search).get(LOCALE_QUERY_PARAM);
  return isLocale(raw) ? raw : null;
}

/** Best-effort: `localStorage` can throw (privacy mode, disabled storage) — never let that crash the app. */
export function readPersistedLocale(
  storage: Pick<Storage, 'getItem'> = window.localStorage,
): Locale | null {
  try {
    return isLocale(storage.getItem(LOCALE_STORAGE_KEY))
      ? (storage.getItem(LOCALE_STORAGE_KEY) as Locale)
      : null;
  } catch {
    return null;
  }
}

export function persistLocale(
  locale: Locale,
  storage: Pick<Storage, 'setItem'> = window.localStorage,
): void {
  try {
    storage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // best-effort only — a user browsing in a mode that blocks storage still gets the URL-driven locale.
  }
}

/** URL wins, then persisted preference, then the hard default — never the browser/navigator locale. */
export function resolveInitialLocale(
  search: string,
  storage: Pick<Storage, 'getItem'> = window.localStorage,
): Locale {
  return parseLocaleFromSearch(search) ?? readPersistedLocale(storage) ?? DEFAULT_LOCALE;
}

/** Rebuilds the current URL with `lang` set, preserving every other query param and the hash verbatim. */
export function urlWithLocale(locale: Locale, search: string, hash: string): string {
  const params = new URLSearchParams(search);
  params.set(LOCALE_QUERY_PARAM, locale);
  return `?${params.toString()}${hash}`;
}
