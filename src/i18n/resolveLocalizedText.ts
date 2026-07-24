import type { Locale } from './locale';

/** Free-text content that may only exist in Vietnamese (e.g. a dataset title/description sourced
 * from a Vietnamese-only publisher document) — as opposed to a `MessageKey`, which is always UI
 * copy this app itself owns and can fully translate. `en` is optional and never machine-generated
 * at runtime; if it's missing, the Vietnamese original is shown regardless of locale. */
export interface LocalizedText {
  vi: string;
  en?: string;
}

export interface ResolvedLocalizedText {
  text: string;
  /** True when the requested locale's text fell back to the Vietnamese original — lets a caller
   * show an optional "Vietnamese source text" indicator where that has real UX value (spec: not
   * unconditionally, only where a reader would otherwise be confused why English didn't apply). */
  isFallback: boolean;
}

/** @param value Either a plain string (implicitly Vietnamese-only, e.g. legacy content that hasn't
 * been given an `en` variant yet) or a `LocalizedText`. Never call a translation service here —
 * this only ever chooses between text that already exists. */
export function resolveLocalizedText(
  value: LocalizedText | string,
  locale: Locale,
): ResolvedLocalizedText {
  const localized: LocalizedText = typeof value === 'string' ? { vi: value } : value;
  if (locale === 'en' && localized.en) return { text: localized.en, isFallback: false };
  return { text: localized.vi, isFallback: locale === 'en' };
}
