import { describe, expect, it } from 'vitest';
import { findDuplicateHeaders, findEmptyHeaderIndices, parseCsvFile } from './csvParsing';

describe('parseCsvFile', () => {
  it('parses quoted cells containing commas', () => {
    const result = parseCsvFile('t.csv', 'a,b\n"hello, world",2\n');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.rows[0]).toEqual(['hello, world', '2']);
  });

  it('parses escaped quotes', () => {
    const result = parseCsvFile('t.csv', 'a\n"say ""hi"""\n');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.rows[0]).toEqual(['say "hi"']);
  });

  it('parses quoted newlines', () => {
    const result = parseCsvFile('t.csv', 'a,b\n"line1\nline2",2\n');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.rows[0]).toEqual(['line1\nline2', '2']);
  });

  it('strips UTF-8 BOM from the first header cell', () => {
    const result = parseCsvFile('t.csv', '﻿a,b\n1,2\n');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.header[0]).toBe('a');
  });

  it('handles CRLF line endings', () => {
    const result = parseCsvFile('t.csv', 'a,b\r\n1,2\r\n');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.rows).toEqual([['1', '2']]);
  });

  it('preserves empty trailing cells', () => {
    const result = parseCsvFile('t.csv', 'a,b,c\n1,,\n');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.rows[0]).toEqual(['1', '', '']);
  });

  it('returns an empty result for an empty file, not an error', () => {
    const result = parseCsvFile('t.csv', '');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.header).toEqual([]);
      expect(result.rows).toEqual([]);
    }
  });
});

describe('findDuplicateHeaders', () => {
  it('detects duplicate header names', () => {
    expect(findDuplicateHeaders(['id', 'name', 'id'])).toEqual(['id']);
  });
  it('returns empty for unique headers', () => {
    expect(findDuplicateHeaders(['id', 'name'])).toEqual([]);
  });
});

describe('findEmptyHeaderIndices', () => {
  it('detects blank header cells', () => {
    expect(findEmptyHeaderIndices(['id', '', 'name', '  '])).toEqual([1, 3]);
  });
});
