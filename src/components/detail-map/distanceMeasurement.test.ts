import { describe, expect, it } from 'vitest';
import {
  addMeasurementPoint,
  formatMeasurementDistance,
  haversineDistanceMeters,
  totalMeasurementDistanceMeters,
  undoLastMeasurementPoint,
} from './distanceMeasurement';

describe('haversineDistanceMeters', () => {
  it('returns 0 for the same point', () => {
    expect(
      haversineDistanceMeters(
        { latitude: 12.9, longitude: 108.2 },
        { latitude: 12.9, longitude: 108.2 },
      ),
    ).toBe(0);
  });

  it('matches a known reference distance within a small tolerance', () => {
    // Buôn Ma Thuột centroid to Buôn Hồ centroid is roughly 40km in a straight line.
    const buonMaThuot = { latitude: 12.6667, longitude: 108.05 };
    const buonHo = { latitude: 12.9167, longitude: 108.25 };
    const distance = haversineDistanceMeters(buonMaThuot, buonHo);
    expect(distance).toBeGreaterThan(30000);
    expect(distance).toBeLessThan(50000);
  });
});

describe('totalMeasurementDistanceMeters', () => {
  it('is zero for 0 or 1 points', () => {
    expect(totalMeasurementDistanceMeters([])).toBe(0);
    expect(totalMeasurementDistanceMeters([{ latitude: 12.9, longitude: 108.2 }])).toBe(0);
  });

  it('sums consecutive segment distances', () => {
    const a = { latitude: 12.9, longitude: 108.2 };
    const b = { latitude: 12.91, longitude: 108.2 };
    const c = { latitude: 12.92, longitude: 108.2 };
    const total = totalMeasurementDistanceMeters([a, b, c]);
    expect(total).toBeCloseTo(haversineDistanceMeters(a, b) + haversineDistanceMeters(b, c), 5);
  });
});

describe('addMeasurementPoint / undoLastMeasurementPoint', () => {
  it('appends without mutating the original array', () => {
    const points = [{ latitude: 1, longitude: 1 }];
    const next = addMeasurementPoint(points, { latitude: 2, longitude: 2 });
    expect(next).toHaveLength(2);
    expect(points).toHaveLength(1);
  });

  it('removes only the last point', () => {
    const points = [
      { latitude: 1, longitude: 1 },
      { latitude: 2, longitude: 2 },
    ];
    expect(undoLastMeasurementPoint(points)).toEqual([{ latitude: 1, longitude: 1 }]);
  });

  it('undo on an empty array stays empty instead of throwing', () => {
    expect(undoLastMeasurementPoint([])).toEqual([]);
  });
});

describe('formatMeasurementDistance', () => {
  it('formats sub-kilometer distances in meters', () => {
    expect(formatMeasurementDistance(250)).toBe('250 m');
  });

  it('formats kilometer-plus distances in km', () => {
    expect(formatMeasurementDistance(1500)).toBe('1,5 km');
  });
});
