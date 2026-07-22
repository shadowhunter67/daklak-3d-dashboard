import { describe, expect, it } from 'vitest';
import type { DatasetDescriptor } from '../schemas/dataset';
import { computeFreshness, parseExpectedIntervalMs, summarizeDataStatus } from './freshness';

function makeDataset(overrides: Partial<DatasetDescriptor> = {}): DatasetDescriptor {
  return {
    id: 'ds',
    title: 'Dataset',
    description: '',
    domain: 'other',
    classification: 'public',
    authority: 'official',
    publicationStatus: 'published',
    administrativeLevel: 'province',
    temporalResolution: 'annual',
    spatialRepresentation: 'none',
    source: { organization: 'x' },
    version: '1.0.0',
    quality: { status: 'verified', knownLimitations: [] },
    access: { delivery: 'bundled-static', requiresAuthentication: false },
    ...overrides,
  };
}

describe('computeFreshness', () => {
  const now = new Date('2026-07-22T00:00:00Z');

  it('is unknown for illustrative data regardless of age', () => {
    const dataset = makeDataset({
      authority: 'illustrative',
      generatedAt: '2000-01-01',
      refreshPolicy: { mode: 'manual', expectedInterval: 'P1Y' },
    });
    expect(computeFreshness(dataset, now)).toBe('unknown');
  });

  it('is unknown for static/event data with no declared interval, however old (no default is assumed)', () => {
    const dataset = makeDataset({ temporalResolution: 'static', generatedAt: '2000-01-01' });
    expect(computeFreshness(dataset, now)).toBe('unknown');
    const eventDataset = makeDataset({ temporalResolution: 'event', generatedAt: '2000-01-01' });
    expect(computeFreshness(eventDataset, now)).toBe('unknown');
  });

  it('can be current or unknown for static/manual data depending on whether a checked-cadence is declared', () => {
    // A static dataset with an explicit expectedInterval (e.g. an administrative boundary that
    // is genuinely re-checked every few years) is judged like any other — it just isn't assumed
    // to have a default cadence the way 'annual'/'monthly' do.
    const withDeclaredCadence = makeDataset({
      temporalResolution: 'static',
      generatedAt: '2026-01-01',
      refreshPolicy: { mode: 'manual', expectedInterval: 'P5Y' },
    });
    expect(computeFreshness(withDeclaredCadence, now)).toBe('current');
    const withoutDeclaredCadence = makeDataset({ temporalResolution: 'static' });
    expect(computeFreshness(withoutDeclaredCadence, now)).toBe('unknown');
  });

  it('falls back to a temporalResolution-derived default interval when none is declared, and annual differs from monthly', () => {
    const annual = makeDataset({
      id: 'annual-default',
      temporalResolution: 'annual',
      generatedAt: '2026-04-01', // ~3.7 months old — well within the P1Y default
    });
    const monthly = makeDataset({
      id: 'monthly-default',
      temporalResolution: 'monthly',
      generatedAt: '2026-04-01', // same age, but the monthly default's 2x-stale threshold (~61 days) is long past
    });
    expect(computeFreshness(annual, now)).toBe('current');
    expect(computeFreshness(monthly, now)).toBe('stale');
  });

  it('goes stale within hours for realtime data using its sub-day default interval', () => {
    const staleRealtime = makeDataset({
      temporalResolution: 'realtime',
      generatedAt: '2026-07-21T20:00:00Z', // 4h before `now` — realtime default is PT1H, 2x = 2h
    });
    const freshRealtime = makeDataset({
      temporalResolution: 'realtime',
      generatedAt: '2026-07-21T23:50:00Z', // 10 minutes before `now`
    });
    expect(computeFreshness(staleRealtime, now)).toBe('stale');
    expect(computeFreshness(freshRealtime, now)).toBe('current');
  });

  it('is unknown when no reference date exists at all', () => {
    const dataset = makeDataset({ temporalResolution: 'annual' });
    expect(computeFreshness(dataset, now)).toBe('unknown');
  });

  it('treats a future reference date as unknown for display, not "current" (see catalogValidation for the hard error)', () => {
    const dataset = makeDataset({
      generatedAt: '2026-12-31',
      refreshPolicy: { mode: 'manual', expectedInterval: 'P1Y' },
    });
    expect(computeFreshness(dataset, now)).toBe('unknown');
  });

  it('is current within the expected interval', () => {
    const dataset = makeDataset({
      generatedAt: '2026-06-01',
      refreshPolicy: { mode: 'manual', expectedInterval: 'P1Y' },
    });
    expect(computeFreshness(dataset, now)).toBe('current');
  });

  it('is aging between 1x and 2x the expected interval', () => {
    const dataset = makeDataset({
      generatedAt: '2025-04-01',
      refreshPolicy: { mode: 'manual', expectedInterval: 'P1Y' },
    });
    expect(computeFreshness(dataset, now)).toBe('aging');
  });

  it('is stale beyond 2x the expected interval', () => {
    const dataset = makeDataset({
      generatedAt: '2020-01-01',
      refreshPolicy: { mode: 'manual', expectedInterval: 'P1Y' },
    });
    expect(computeFreshness(dataset, now)).toBe('stale');
  });

  it('judges different datasets against their own interval, not a shared threshold', () => {
    const annual = makeDataset({
      id: 'annual',
      generatedAt: '2026-01-01',
      refreshPolicy: { mode: 'manual', expectedInterval: 'P1Y' },
    });
    const fiveYear = makeDataset({
      id: 'boundary',
      generatedAt: '2022-01-01',
      refreshPolicy: { mode: 'manual', expectedInterval: 'P5Y' },
    });
    expect(computeFreshness(annual, now)).toBe('current');
    expect(computeFreshness(fiveYear, now)).toBe('current');
  });
});

describe('parseExpectedIntervalMs', () => {
  it('parses date-only and time-only ISO-8601 durations', () => {
    expect(parseExpectedIntervalMs('P1Y')).toBe(365.25 * 24 * 60 * 60 * 1000);
    expect(parseExpectedIntervalMs('PT1H')).toBe(60 * 60 * 1000);
    expect(parseExpectedIntervalMs('PT30M')).toBe(30 * 60 * 1000);
  });

  it('returns null for an empty or malformed duration', () => {
    expect(parseExpectedIntervalMs('P')).toBeNull();
    expect(parseExpectedIntervalMs('not-a-duration')).toBeNull();
  });
});

describe('summarizeDataStatus', () => {
  const now = new Date('2026-07-22T00:00:00Z');

  it('counts illustrative datasets separately from freshness buckets', () => {
    const datasets = [
      makeDataset({ id: 'a', authority: 'illustrative' }),
      makeDataset({
        id: 'b',
        generatedAt: '2026-06-01',
        refreshPolicy: { mode: 'manual', expectedInterval: 'P1Y' },
      }),
    ];
    const summary = summarizeDataStatus(datasets, now);
    expect(summary.total).toBe(2);
    expect(summary.illustrative).toBe(1);
    expect(summary.current).toBe(1);
  });

  it('counts withdrawn datasets as unavailable', () => {
    const summary = summarizeDataStatus([makeDataset({ publicationStatus: 'withdrawn' })], now);
    expect(summary.unavailable).toBe(1);
  });
});
