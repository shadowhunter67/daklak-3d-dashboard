import { describe, expect, it } from 'vitest';
import { parseArgs } from './cli';

describe('parseArgs', () => {
  it('parses required + optional flags', () => {
    const args = parseArgs([
      '--input',
      './in',
      '--output',
      './out',
      '--as-of',
      '2026-07-27T00:00:00.000Z',
      '--strict',
      '--dry-run',
      '--format',
      'csv',
    ]);
    expect(args.input).toBe('./in');
    expect(args.output).toBe('./out');
    expect(args.asOf).toBe('2026-07-27T00:00:00.000Z');
    expect(args.strict).toBe(true);
    expect(args.dryRun).toBe(true);
    expect(args.format).toBe('csv');
  });

  it('throws on an unknown flag', () => {
    expect(() => parseArgs(['--bogus', 'x'])).toThrow(/không xác định/);
  });

  it('throws on an invalid --format value', () => {
    expect(() => parseArgs(['--format', 'xlsx'])).toThrow(/auto\|json\|csv/);
  });

  it('defaults format to auto and flags to false', () => {
    const args = parseArgs([]);
    expect(args.format).toBe('auto');
    expect(args.strict).toBe(false);
    expect(args.dryRun).toBe(false);
  });
});
