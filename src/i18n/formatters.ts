import type { Locale } from './locale';

/**
 * Centralized `Intl` formatters keyed by locale — replaces scattered `toLocaleString('vi-VN')` /
 * `new Intl.NumberFormat('vi-VN', ...)` calls in components. Formatters are cached per locale
 * (module-level `Map`) so switching locale doesn't allocate a fresh `Intl.*` instance on every
 * render; there are only ever two locales, so this cache never grows unbounded.
 */
const INTL_LOCALE: Record<Locale, string> = { vi: 'vi-VN', en: 'en-US' };

function cached<T>(store: Map<Locale, T>, locale: Locale, create: () => T): T {
  const existing = store.get(locale);
  if (existing) return existing;
  const created = create();
  store.set(locale, created);
  return created;
}

const numberFormatters = new Map<Locale, Intl.NumberFormat>();
export function formatNumber(value: number, locale: Locale): string {
  return cached(numberFormatters, locale, () => new Intl.NumberFormat(INTL_LOCALE[locale])).format(
    value,
  );
}

const percentFormatters = new Map<Locale, Intl.NumberFormat>();
/** `value` is already on a 0-100 scale (e.g. a disbursement rate of 46.7, not 0.467) — matches how
 * this domain's KPI values are stored, so callers never need to divide before formatting. */
export function formatPercent(value: number, locale: Locale): string {
  return `${cached(percentFormatters, locale, () => new Intl.NumberFormat(INTL_LOCALE[locale], { maximumFractionDigits: 1 })).format(value)}%`;
}

const dateFormatters = new Map<Locale, Intl.DateTimeFormat>();
export function formatDate(value: Date | string, locale: Locale): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return cached(
    dateFormatters,
    locale,
    () => new Intl.DateTimeFormat(INTL_LOCALE[locale], { dateStyle: 'medium' }),
  ).format(date);
}

const dateTimeFormatters = new Map<Locale, Intl.DateTimeFormat>();
export function formatDateTime(value: Date | string, locale: Locale): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return cached(
    dateTimeFormatters,
    locale,
    () => new Intl.DateTimeFormat(INTL_LOCALE[locale], { dateStyle: 'medium', timeStyle: 'short' }),
  ).format(date);
}

const vndFormatters = new Map<Locale, Intl.NumberFormat>();
/** Always renders the VND sign regardless of locale — the currency itself does not change with
 * display language, only how the number around it is grouped/decimalized. */
export function formatVnd(value: number, locale: Locale): string {
  return `${cached(vndFormatters, locale, () => new Intl.NumberFormat(INTL_LOCALE[locale], { maximumFractionDigits: 0 })).format(value)} ₫`;
}

const compactFormatters = new Map<Locale, Intl.NumberFormat>();
export function formatCompactVnd(value: number, locale: Locale): string {
  return `${cached(compactFormatters, locale, () => new Intl.NumberFormat(INTL_LOCALE[locale], { notation: 'compact', maximumFractionDigits: 1 })).format(value)} ₫`;
}
