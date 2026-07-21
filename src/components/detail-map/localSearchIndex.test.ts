import { describe, expect, it } from 'vitest';
import { buildLocalSearchIndex, searchLocalIndex } from './localSearchIndex';

const labels = {
  '24133': { name: 'Buôn Ma Thuột', longitude: 108.05, latitude: 12.6667 },
  '24305': { name: 'Buôn Hồ', longitude: 108.25, latitude: 12.9167 },
};

describe('buildLocalSearchIndex', () => {
  it('builds one entry per label with accent-insensitive normalized names', () => {
    const index = buildLocalSearchIndex(labels);
    expect(index).toHaveLength(2);
    expect(index.find((entry) => entry.code === '24133')?.normalizedName).toBe('buon ma thuot');
  });
});

describe('searchLocalIndex', () => {
  const index = buildLocalSearchIndex(labels);

  it('returns nothing for an empty query', () => {
    expect(searchLocalIndex(index, '')).toEqual([]);
    expect(searchLocalIndex(index, '   ')).toEqual([]);
  });

  it('matches without diacritics', () => {
    const results = searchLocalIndex(index, 'buon ma thuot');
    expect(results.map((entry) => entry.code)).toEqual(['24133']);
  });

  it('matches a partial, case-insensitive query', () => {
    const results = searchLocalIndex(index, 'HO');
    expect(results.map((entry) => entry.code)).toEqual(['24305']);
  });

  it('respects the result limit', () => {
    const results = searchLocalIndex(index, 'buon', 1);
    expect(results).toHaveLength(1);
  });
});
