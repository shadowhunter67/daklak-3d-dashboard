import { vi } from './messages/vi';
import type { MessageKey } from './messages';

/**
 * `useTranslation()` requires a hook, which React error boundaries (class components —
 * `componentDidCatch`/`getDerivedStateFromError` have no hook equivalent) cannot use. This reads
 * the same `<html lang>` attribute `I18nProvider` already keeps in sync with the active locale
 * (see I18nProvider.tsx) instead of plumbing locale through props into a boundary that must also
 * work if something *above* it in the tree threw. English dictionary is loaded lazily the same way
 * `I18nProvider` does; until it resolves, this falls back to Vietnamese exactly once — an error
 * boundary rendering is already a rare, one-shot event, not a case worth blocking on a dynamic
 * import for.
 */
let cachedEn: Partial<Record<MessageKey, string>> | null = null;
import('./messages/en')
  .then((module) => {
    cachedEn = module.en;
  })
  .catch(() => {
    /* stays on Vietnamese fallback */
  });

export function tStatic(key: MessageKey): string {
  const locale = document.documentElement.lang;
  if (locale === 'en' && cachedEn?.[key]) return cachedEn[key];
  return vi[key];
}
