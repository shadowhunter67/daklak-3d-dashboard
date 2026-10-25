import { describe, expect, it } from 'vitest';
import wards from '#province-assets/daklak-wards-render.json';
import type { TourismDestination } from '../../../entities/tourism/types';
import { verifiedTourismDestinations } from '../../../entities/tourism/verifiedTourismDestinations';
import type { WardCollection } from '../../../types/map';
import { buildTourismItems, filterTourismItems, summarizeTourism } from './tourismModel';

const collection = wards as WardCollection;
const base: Omit<TourismDestination, 'id' | 'name' | 'category' | 'coordinates'> = {
  description: '',
  sourceUrl: 'https://example.org',
  confidence: 'verified',
  verificationStatus: 'reviewed',
  dataOwner: 'test',
};
const lake: TourismDestination = {
  ...base,
  id: 'ho-lak',
  name: 'Hồ Lắk',
  category: 'lake',
  coordinates: [108.18194, 12.42167],
  imageUrl: 'https://commons.wikimedia.org/wiki/File:x.jpg',
};
const outside: TourismDestination = {
  ...base,
  id: 'far',
  name: 'Thác Xa',
  category: 'waterfall',
  coordinates: [0, 0],
};

describe('tourism model', () => {
  it('assigns a unit by point-in-polygon and leaves outside points unassigned', () => {
    const items = buildTourismItems([lake, outside], collection);
    expect(items[0].unitCode).toBe('24580');
    expect(items[1].unitCode).toBeNull();
  });

  it('filters by category and by diacritic-insensitive name', () => {
    const items = buildTourismItems([lake, outside], collection);
    expect(filterTourismItems(items, { category: 'lake' }).map((i) => i.destination.id)).toEqual([
      'ho-lak',
    ]);
    expect(filterTourismItems(items, { query: 'thac xa' }).map((i) => i.destination.id)).toEqual([
      'far',
    ]);
    expect(filterTourismItems(items, { query: 'ho lak' })).toHaveLength(1);
    expect(filterTourismItems(items, {})).toHaveLength(2);
  });

  it('summarises counts without inventing visitor numbers', () => {
    const summary = summarizeTourism(buildTourismItems([lake, outside], collection));
    expect(summary).toEqual({ total: 2, withPhoto: 1, categories: 2, units: 1 });
    expect(Object.keys(summary)).not.toContain('visitors');
  });

  it('covers every verified destination on real data', () => {
    const items = buildTourismItems(verifiedTourismDestinations, collection);
    expect(items).toHaveLength(verifiedTourismDestinations.length);
    expect(summarizeTourism(items).total).toBe(verifiedTourismDestinations.length);
  });
});
