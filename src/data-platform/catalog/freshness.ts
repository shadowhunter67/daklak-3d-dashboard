import type { DatasetDescriptor } from '../schemas/dataset';

export type FreshnessStatus = 'current' | 'aging' | 'stale' | 'unknown';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Minimal ISO-8601 duration parser covering only the components this catalog actually uses
 * (years/months/weeks/days — no time-of-day component). Not a general-purpose ISO-8601 library;
 * an unsupported/malformed string returns null and callers treat that as 'unknown' rather than
 * guessing a threshold.
 */
function parseExpectedIntervalMs(interval: string): number | null {
  const match = /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?$/.exec(interval);
  if (!match) return null;
  const [, years, months, weeks, days] = match;
  if (!years && !months && !weeks && !days) return null;
  const approxYearDays = 365.25;
  const approxMonthDays = 30.44;
  const totalDays =
    Number(years ?? 0) * approxYearDays +
    Number(months ?? 0) * approxMonthDays +
    Number(weeks ?? 0) * 7 +
    Number(days ?? 0);
  return totalDays * DAY_MS;
}

function referenceDate(dataset: DatasetDescriptor): Date | null {
  const raw = dataset.generatedAt ?? dataset.period?.end ?? dataset.source.retrievalDate;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Freshness is judged only against a dataset's own declared expectation
 * (`refreshPolicy.expectedInterval`) — there is deliberately no single global threshold (spec
 * §8: a boundary snapshot and a monthly report age at very different rates). Illustrative/demo
 * data has no real-world update cadence, so it is always 'unknown', never 'stale'.
 */
export function computeFreshness(
  dataset: DatasetDescriptor,
  now: Date = new Date(),
): FreshnessStatus {
  if (dataset.authority === 'illustrative') return 'unknown';
  if (!dataset.refreshPolicy?.expectedInterval) return 'unknown';
  const expectedMs = parseExpectedIntervalMs(dataset.refreshPolicy.expectedInterval);
  if (expectedMs === null) return 'unknown';
  const reference = referenceDate(dataset);
  if (!reference) return 'unknown';
  const ageMs = now.getTime() - reference.getTime();
  if (ageMs < 0) return 'current';
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
