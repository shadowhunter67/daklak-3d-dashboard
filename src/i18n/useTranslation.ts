import { useContext } from 'react';
import { I18nContext, type I18nContextValue } from './I18nContext';

/** Throws with a clear message rather than silently returning Vietnamese-only defaults — a
 * component rendered outside `I18nProvider` is a real wiring bug, not a state to degrade into. */
export function useTranslation(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useTranslation must be used within an I18nProvider');
  return context;
}
