import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  parseLocaleFromSearch,
  persistLocale,
  resolveInitialLocale,
  urlWithLocale,
  DEFAULT_LOCALE,
  type Locale,
} from './locale';
import { vi } from './messages/vi';
import type { MessageKey } from './messages';
import { I18nContext, type I18nContextValue } from './I18nContext';

type MessageDictionary = Partial<Record<MessageKey, string>>;

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, token: string) =>
    token in vars ? String(vars[token]) : match,
  );
}

/** Module-level cache: once the English dictionary has been imported, every provider instance
 * (there is normally only one, but tests may mount several) reuses it instead of re-fetching. */
let cachedEnDictionary: MessageDictionary | null = null;
let pendingEnImport: Promise<MessageDictionary> | null = null;

function loadEnglishDictionary(): Promise<MessageDictionary> {
  if (cachedEnDictionary) return Promise.resolve(cachedEnDictionary);
  if (!pendingEnImport) {
    pendingEnImport = import('./messages/en').then((module) => {
      cachedEnDictionary = module.en;
      return module.en;
    });
  }
  return pendingEnImport;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() =>
    resolveInitialLocale(window.location.search),
  );
  const [enDictionary, setEnDictionary] = useState<MessageDictionary | null>(cachedEnDictionary);

  useEffect(() => {
    if (locale !== 'en' || enDictionary) return;
    let cancelled = false;
    loadEnglishDictionary().then((dict) => {
      if (!cancelled) setEnDictionary(dict);
    });
    return () => {
      cancelled = true;
    };
  }, [locale, enDictionary]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  // Canonicalize once on mount: whatever locale was actually resolved (URL > persisted > default)
  // must be reflected explicitly in the URL, exactly like useDashboardUrlSync does for view/mode/
  // ward. Without this, the very first history entry has no `lang` param, and popstate back to it
  // cannot know which locale it represented — see the popstate handler below.
  useEffect(() => {
    if (parseLocaleFromSearch(window.location.search) === locale) return;
    const url = urlWithLocale(locale, window.location.search, window.location.hash);
    window.history.replaceState(null, '', url);
    // Runs once on mount only — `locale` here is intentionally the initial resolved value, not a
    // dependency to re-run on every later switch (setLocale already writes its own history entry).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Back/Forward must be able to undo a locale switch (spec E2E requirement) — react to the same
  // popstate the dashboard/hash-route sync hooks already listen to, independently of them. Reads
  // ONLY the URL (defaulting to DEFAULT_LOCALE, never the persisted preference): every history
  // entry this app ever creates has an explicit `lang` param (see the canonicalization effect
  // above and `setLocale` below), so falling back to `localStorage` here would incorrectly re-
  // apply whatever was most recently persisted instead of what that specific history entry means.
  useEffect(() => {
    const onPopState = () => {
      setLocaleState(parseLocaleFromSearch(window.location.search) ?? DEFAULT_LOCALE);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    persistLocale(next);
    const url = urlWithLocale(next, window.location.search, window.location.hash);
    window.history.pushState(null, '', url);
  }, []);

  const t = useCallback(
    (key: MessageKey, vars?: Record<string, string | number>) =>
      interpolate(enDictionary?.[key] ?? vi[key], vars),
    [enDictionary],
  );

  const value = useMemo<I18nContextValue>(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
