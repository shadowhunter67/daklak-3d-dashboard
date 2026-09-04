import { describe, expect, it } from 'vitest';
import {
  formatRadiusDistance,
  queryKeyProjectsWithinRadius,
  queryPlanningZonesWithinRadius,
  queryRadius,
  queryWardLabelsWithinRadius,
  RADIUS_PRESETS_METERS,
} from './radiusQuery';

// "Khu đô thị Hồ thủy lợi Ea Tam" — a real key-project point at [108.024, 12.658]
// (keyProjects.ts) — used as a known anchor rather than a synthetic coordinate.
const EA_TAM_CENTER = { latitude: 12.658, longitude: 108.024 };
const FAR_AWAY = { latitude: 0, longitude: 0 }; // nowhere near Đắk Lắk

describe('queryKeyProjectsWithinRadius', () => {
  it('finds a project at its own coordinate with a tiny radius', () => {
    const matches = queryKeyProjectsWithinRadius(EA_TAM_CENTER, 10);
    expect(matches.some((match) => match.id === 'kdt-ho-ea-tam')).toBe(true);
  });

  it('returns nothing far from every project', () => {
    expect(queryKeyProjectsWithinRadius(FAR_AWAY, 5000)).toEqual([]);
  });

  it('never returns a match farther than the requested radius', () => {
    const radius = 3000;
    const matches = queryKeyProjectsWithinRadius(EA_TAM_CENTER, radius);
    for (const match of matches) {
      expect(match.distanceMeters).toBeLessThanOrEqual(radius);
    }
  });
});

describe('queryPlanningZonesWithinRadius', () => {
  it('returns nothing far from every zone', () => {
    expect(queryPlanningZonesWithinRadius(FAR_AWAY, 5000)).toEqual([]);
  });

  it('is monotonic: a bigger radius never returns fewer matches', () => {
    const small = queryPlanningZonesWithinRadius(EA_TAM_CENTER, 10000).length;
    const big = queryPlanningZonesWithinRadius(EA_TAM_CENTER, 50000).length;
    expect(big).toBeGreaterThanOrEqual(small);
  });
});

describe('queryWardLabelsWithinRadius', () => {
  it('returns nothing far from every ward centre', () => {
    expect(queryWardLabelsWithinRadius(FAR_AWAY, 5000)).toEqual([]);
  });

  it('finds at least the nearest ward within a generous radius', () => {
    expect(queryWardLabelsWithinRadius(EA_TAM_CENTER, 20000).length).toBeGreaterThan(0);
  });
});

describe('queryRadius', () => {
  it('merges all three sources sorted by distance ascending', () => {
    const matches = queryRadius(EA_TAM_CENTER, 30000);
    for (let index = 1; index < matches.length; index += 1) {
      expect(matches[index].distanceMeters).toBeGreaterThanOrEqual(
        matches[index - 1].distanceMeters,
      );
    }
  });

  it('returns an empty list far from any dataset', () => {
    expect(queryRadius(FAR_AWAY, 1000)).toEqual([]);
  });
});

describe('RADIUS_PRESETS_METERS', () => {
  it('is sorted ascending and non-empty', () => {
    expect(RADIUS_PRESETS_METERS.length).toBeGreaterThan(0);
    for (let index = 1; index < RADIUS_PRESETS_METERS.length; index += 1) {
      expect(RADIUS_PRESETS_METERS[index]).toBeGreaterThan(RADIUS_PRESETS_METERS[index - 1]);
    }
  });
});

describe('formatRadiusDistance', () => {
  it('formats sub-kilometer distances in meters', () => {
    expect(formatRadiusDistance(250)).toBe('250 m');
  });

  it('formats kilometer-plus distances in km', () => {
    expect(formatRadiusDistance(1500)).toBe('1,5 km');
  });
});
