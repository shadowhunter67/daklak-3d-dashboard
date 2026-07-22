import type { DatasetDescriptor, TemporalResolution } from '../schemas/dataset';

export type FreshnessStatus = 'current' | 'aging' | 'stale' | 'unknown';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

/**
 * Minimal ISO-8601 duration parser covering the components this catalog actually uses
 * (years/months/weeks/days, plus an optional time-of-day part for realtime/daily cadences —
 * `PT1H`, `PT30M`, etc.). Not a general-purpose ISO-8601 library; an unsupported/malformed string
 * returns null and callers treat that as 'unknown' rather than guessing a threshold.
 */
export function parseExpectedIntervalMs(interval: string): number | null {
  const match =
    /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(
      interval,
    );
  if (!match) return null;
  const [, years, months, weeks, days, hours, minutes, seconds] = match;
  if (![years, months, weeks, days, hours, minutes, seconds].some(Boolean)) return null;
  const approxYearDays = 365.25;
  const approxMonthDays = 30.44;
  const totalDays =
    Number(years ?? 0) * approxYearDays +
    Number(months ?? 0) * approxMonthDays +
    Number(weeks ?? 0) * 7 +
    Number(days ?? 0);
  return (
    totalDays * DAY_MS +
    Number(hours ?? 0) * HOUR_MS +
    Number(minutes ?? 0) * MINUTE_MS +
    Number(seconds ?? 0) * 1000
  );
}

/**
 * When a dataset doesn't declare its own `refreshPolicy.expectedInterval`, fall back to a
 * reasonable default derived from `temporalResolution` — spec §11 asks freshness to consider
 * `temporalResolution` as an input, not just the explicit interval. `static`/`event` have no
 * natural cadence to assume (an event-driven dataset might not change for years, or might change
 * tomorrow — guessing either way would be worse than 'unknown'), so they intentionally have no
 * default here.
 */
const DEFAULT_EXPECTED_INTERVAL_BY_RESOLUTION: Partial<Record<TemporalResolution, string>> = {
  realtime: 'PT1H',
  daily: 'P1D',
  monthly: 'P1M',
  quarterly: 'P3M',
  annual: 'P1Y',
};

function referenceDate(dataset: DatasetDescriptor): Date | null {
  const raw = dataset.generatedAt ?? dataset.period?.end ?? dataset.source.retrievalDate;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Freshness is judged against a dataset's own declared expectation
 * (`refreshPolicy.expectedInterval`), falling back to a `temporalResolution`-derived default when
 * none is declared — there is deliberately no single global threshold (spec §8/§11: a boundary
 * snapshot and a monthly report age at very different rates). Illustrative/demo data has no
 * real-world update cadence, so it is always 'unknown', never 'stale'. A reference date in the
 * future relative to `now` is also 'unknown' for freshness-display purposes — it's a data-quality
 * problem, not evidence of currency, and is flagged separately as a hard validation issue by
 * `catalogValidation.ts` rather than silently rendered as "current" here.
 */
export function computeFreshness(
  dataset: DatasetDescriptor,
  now: Date = new Date(),
): FreshnessStatus {
  if (dataset.authority === 'illustrative') return 'unknown';
  const declaredInterval = dataset.refreshPolicy?.expectedInterval;
  const effectiveInterval =
    declaredInterval ?? DEFAULT_EXPECTED_INTERVAL_BY_RESOLUTION[dataset.temporalResolution];
  if (!effectiveInterval) return 'unknown';
  const expectedMs = parseExpectedIntervalMs(effectiveInterval);
  if (expectedMs === null) return 'unknown';
  const reference = referenceDate(dataset);
  if (!reference) return 'unknown';
  const ageMs = now.getTime() - reference.getTime();
  if (ageMs < 0) return 'unknown';
  if (ageMs <= expectedMs) return 'current';
  if (ageMs <= expectedMs * 2) return 'aging';
  return 'stale';
}

export interface DataStatusCounts {
  current: number;
  aging: number;
  stale: number;
  unknown: number;
  illustrative: number;
  unavailable: number;
  total: number;
}

export function summarizeDataStatus(
  datasets: readonly DatasetDescriptor[],
  now: Date = new Date(),
): DataStatusCounts {
  const counts: DataStatusCounts = {
    current: 0,
    aging: 0,
    stale: 0,
    unknown: 0,
    illustrative: 0,
    unavailable: 0,
    total: datasets.length,
  };
  for (const dataset of datasets) {
    if (dataset.authority === 'illustrative') counts.illustrative += 1;
    if (dataset.publicationStatus === 'withdrawn') {
      counts.unavailable += 1;
      continue;
    }
    const status = computeFreshness(dataset, now);
    counts[status] += 1;
  }
  return counts;
}
