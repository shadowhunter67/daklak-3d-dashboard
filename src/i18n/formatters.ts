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

const billionFormatters = new Map<Locale, Intl.NumberFormat>();
/**
 * "2.453 tỷ ₫" / "2.5B ₫" — a plain, universally understood unit for a large VND amount that
 * would otherwise wrap awkwardly across lines in a narrow KPI card (spec: don't render
 * "2.453.000.000.000 ₫" in a small card). Deliberately NOT `formatCompactVnd` above: `Intl`'s
 * `notation: 'compact'` renders Vietnamese trillions as the abbreviation "NT" ("nghìn tỷ"), which
 * most readers — especially the older/non-technical audience this project targets — won't
 * recognize on sight, unlike the everyday word "tỷ". Always pair this with the exact full amount
 * (`formatVnd`) in a tooltip/accessible label; this is a display simplification, not a precision
 * loss for anyone who needs the exact figure.
 */
export function formatVndInBillions(value: number, locale: Locale): string {
  const billions = value / 1_000_000_000;
  const formatted = cached(
    billionFormatters,
    locale,
    () => new Intl.NumberFormat(INTL_LOCALE[locale], { maximumFractionDigits: 1 }),
  ).format(billions);
  return locale === 'vi' ? `${formatted} tỷ ₫` : `${formatted}B ₫`;
}
