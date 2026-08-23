import { describe, expect, it } from 'vitest';
import { getWorldTourById, worldTours } from './worldTours';
import { getTourStops } from './tourEngine';
import { verifiedTourismDestinations } from '../../../entities/tourism/verifiedTourismDestinations';

const realIds = new Set(verifiedTourismDestinations.map((d) => d.id));

describe('worldTours', () => {
  it('has at least 2 tours (task requires "ít nhất 2-3 tour mẫu")', () => {
    expect(worldTours.length).toBeGreaterThanOrEqual(2);
  });

  it('every stop id resolves to a real, verified destination — no fabricated waypoints', () => {
    for (const tour of worldTours) {
      expect(tour.stops.length).toBeGreaterThanOrEqual(2);
      for (const stopId of tour.stops) {
        expect(realIds.has(stopId)).toBe(true);
      }
    }
  });

  it('every tour resolves to that many WorldPoi stops via getTourStops (nothing silently dropped)', () => {
    for (const tour of worldTours) {
      expect(getTourStops(tour)).toHaveLength(tour.stops.length);
    }
  });

  it('no tour repeats the same stop back-to-back', () => {
    for (const tour of worldTours) {
      for (let i = 1; i < tour.stops.length; i++) {
        expect(tour.stops[i]).not.toBe(tour.stops[i - 1]);
      }
    }
  });

  it('tour ids are unique', () => {
    const ids = worldTours.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('getWorldTourById', () => {
  it('finds a known tour', () => {
    expect(getWorldTourById('lakes-and-waterfalls')?.stops).toContain('ho-lak');
  });

  it('returns undefined for an unknown id', () => {
    expect(getWorldTourById('not-a-real-tour')).toBeUndefined();
  });
});
