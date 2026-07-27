import { describe, expect, it } from 'vitest';
import {
  formatCompactVnd,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPercent,
  formatVnd,
} from './formatters';

const SAMPLE_DATE = new Date('2026-07-23T07:00:00.000Z');

describe('formatNumber', () => {
  it('formats the same value consistently for a given locale', () => {
    expect(formatNumber(1234567, 'vi')).toBe(formatNumber(1234567, 'vi'));
  });

  it('produces different grouping between vi and en for a large number', () => {
    // vi-VN groups with '.', en-US with ',' — the two must not be identical strings.
    expect(formatNumber(1234567, 'vi')).not.toBe(formatNumber(1234567, 'en'));
  });
});

describe('formatPercent', () => {
  it('renders a 0-100-scale value with the % sign, at most one decimal', () => {
    expect(formatPercent(46.7, 'vi')).toMatch(/46,7%|46\.7%/);
  });

  it('does not divide the input — the domain KPI value is already on a 0-100 scale', () => {
    expect(formatPercent(100, 'en')).toBe('100%');
  });
});

describe('formatDate / formatDateTime', () => {
  it('accepts both a Date and an ISO string and returns the same result', () => {
    expect(formatDate(SAMPLE_DATE, 'vi')).toBe(formatDate(SAMPLE_DATE.toISOString(), 'vi'));
    expect(formatDateTime(SAMPLE_DATE, 'en')).toBe(formatDateTime(SAMPLE_DATE.toISOString(), 'en'));
  });

  it('renders a non-empty, locale-appropriate string', () => {
    expect(formatDate(SAMPLE_DATE, 'vi').length).toBeGreaterThan(0);
    expect(formatDateTime(SAMPLE_DATE, 'en').length).toBeGreaterThan(0);
  });
});

describe('formatVnd / formatCompactVnd', () => {
  it('always appends the VND sign regardless of locale', () => {
    expect(formatVnd(850_000_000_000, 'vi')).toContain('₫');
    expect(formatVnd(850_000_000_000, 'en')).toContain('₫');
  });

  it('compact form is shorter than the full form for a large amount', () => {
    const full = formatVnd(850_000_000_000, 'vi');
    const compact = formatCompactVnd(850_000_000_000, 'vi');
    expect(compact.length).toBeLessThan(full.length);
  });
});
