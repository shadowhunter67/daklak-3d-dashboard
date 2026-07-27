import { describe, expect, it } from 'vitest';
import {
  parseBoolean,
  parseEnum,
  parseIsoDateOnly,
  parseIsoDateTime,
  parseNonEmptyString,
  parsePercentage,
  parseSemicolonArray,
  parseVndAmount,
  normalizeRawCell,
} from './normalize';

describe('normalizeRawCell', () => {
  it('strips leading BOM, applies NFC, and trims', () => {
    expect(normalizeRawCell('﻿  hello  ')).toBe('hello');
  });
});

describe('parseVndAmount', () => {
  it.each(['0', '1', '42000000000'])('accepts canonical integer "%s"', (input) => {
    const result = parseVndAmount(input);
    expect(result.ok).toBe(true);
  });

  it.each(['1.5', '-1', '1,000,000', '1.000.000', '1 tỷ', 'Infinity', 'NaN', '9007199254740992'])(
    'rejects "%s"',
    (input) => {
      const result = parseVndAmount(input);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.code).toBe('field-invalid-vnd');
    },
  );
});

describe('parsePercentage', () => {
  it('accepts 0-100 inclusive', () => {
    expect(parsePercentage('0').ok).toBe(true);
    expect(parsePercentage('100').ok).toBe(true);
    expect(parsePercentage('55.5').ok).toBe(true);
  });
  it('rejects out-of-range and non-numeric', () => {
    expect(parsePercentage('101').ok).toBe(false);
    expect(parsePercentage('-1').ok).toBe(false);
    expect(parsePercentage('abc').ok).toBe(false);
  });
});

describe('parseIsoDateOnly / parseIsoDateTime', () => {
  it('accepts canonical formats', () => {
    expect(parseIsoDateOnly('2026-07-27').ok).toBe(true);
    expect(parseIsoDateTime('2026-07-27T00:00:00.000Z').ok).toBe(true);
  });
  it.each(['01/02/2026', '02-01-2026', 'today', 'yesterday'])(
    'rejects "%s" as date-only',
    (input) => {
      expect(parseIsoDateOnly(input).ok).toBe(false);
    },
  );
  it('rejects datetime missing timezone', () => {
    expect(parseIsoDateTime('2026-07-27T00:00:00').ok).toBe(false);
  });
});

describe('parseBoolean', () => {
  it('accepts only the true/false allowlist', () => {
    expect(parseBoolean('true')).toEqual({ ok: true, value: true });
    expect(parseBoolean('false')).toEqual({ ok: true, value: false });
    expect(parseBoolean('TRUE')).toEqual({ ok: true, value: true });
  });
  it('rejects yes/no/1/0', () => {
    expect(parseBoolean('yes').ok).toBe(false);
    expect(parseBoolean('1').ok).toBe(false);
  });
});

describe('parseEnum', () => {
  it('rejects values outside the allowlist without fuzzy matching', () => {
    const result = parseEnum('Activ', ['active', 'inactive'] as const);
    expect(result.ok).toBe(false);
  });
});

describe('parseSemicolonArray', () => {
  it('splits only on documented delimiter and trims parts', () => {
    expect(parseSemicolonArray('22015; 22045 ;22051')).toEqual(['22015', '22045', '22051']);
  });
  it('returns empty array for empty cell, not an error', () => {
    expect(parseSemicolonArray('')).toEqual([]);
  });
});

describe('parseNonEmptyString', () => {
  it('rejects whitespace-only strings', () => {
    expect(parseNonEmptyString('').ok).toBe(false);
  });
});
