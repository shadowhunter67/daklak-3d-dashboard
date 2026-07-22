import { describe, expect, it } from 'vitest';
import type { DatasetDescriptor } from '../schemas/dataset';
import { computeFreshness, summarizeDataStatus } from './freshness';

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

  it('is unknown without a declared expected interval', () => {
    const dataset = makeDataset({ generatedAt: '2000-01-01' });
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
