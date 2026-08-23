import { describe, expect, it } from 'vitest';
import {
  formatAltitudeMeters,
  formatDistanceMeters,
  formatLatLon,
  yawToCompassDegrees,
} from './worldHudFormat';

describe('yawToCompassDegrees', () => {
  it('yaw 0 faces north (0 degrees)', () => {
    expect(yawToCompassDegrees(0)).toBe(0);
  });

  it('yaw +90deg faces east (90 degrees)', () => {
    expect(yawToCompassDegrees(Math.PI / 2)).toBeCloseTo(90, 6);
  });

  it('yaw +180deg faces south (180 degrees)', () => {
    expect(yawToCompassDegrees(Math.PI)).toBeCloseTo(180, 6);
  });

  it('yaw -90deg (or +270) faces west (270 degrees)', () => {
    expect(yawToCompassDegrees(-Math.PI / 2)).toBeCloseTo(270, 6);
  });

  it('always returns a value in [0, 360)', () => {
    for (const yaw of [-100, -0.001, 0, 0.001, 6.5, 1000]) {
      const degrees = yawToCompassDegrees(yaw);
      expect(degrees).toBeGreaterThanOrEqual(0);
      expect(degrees).toBeLessThan(360);
    }
  });
});

describe('formatAltitudeMeters', () => {
  it('rounds to the nearest meter', () => {
    expect(formatAltitudeMeters(123.6)).toBe('124');
    expect(formatAltitudeMeters(0.2)).toBe('0');
  });

  it('renders an em dash for null/non-finite (sampler not ready / outside bbox)', () => {
    expect(formatAltitudeMeters(null)).toBe('—');
    expect(formatAltitudeMeters(NaN)).toBe('—');
  });
});

describe('formatDistanceMeters', () => {
  it('rounds to the nearest meter', () => {
    expect(formatDistanceMeters(61.6)).toBe('62');
    expect(formatDistanceMeters(0)).toBe('0');
  });
});

describe('formatLatLon', () => {
  it('formats a northern/eastern point (Đắk Lắk is N/E)', () => {
    expect(formatLatLon(108.18194, 12.42167)).toBe('12.4217°N, 108.1819°E');
  });

  it('formats negative lat/lon with S/W suffixes', () => {
    expect(formatLatLon(-1.2345, -6.789)).toBe('6.7890°S, 1.2345°W');
  });
});
