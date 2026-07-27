import { createContext } from 'react';
import type { Locale } from './locale';
import type { MessageKey } from './messages';

export interface I18nContextValue {
  locale: Locale;
  setLocale: (next: Locale) => void;
  /** `vars` does simple `{token}` interpolation — no plural rules, no ICU MessageFormat; the
   * dictionary is small and hand-written, so this has been enough so far (see ADR 0003). */
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
}

/** Split from `I18nProvider.tsx` so that file only exports the component (react-refresh/only-export-components). */
export const I18nContext = createContext<I18nContextValue | null>(null);
