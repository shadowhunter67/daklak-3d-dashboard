import seededMetricsJson from '#province-assets/daklak-metrics.json';
import profiles from '#province-assets/daklak-unit-profile.json';
import { describe, expect, it } from 'vitest';
import { unitMetrics } from './unitMetrics';

describe('unitMetrics', () => {
  it('contains all 102 profiles with real 2025 population and seeded auxiliary metrics', () => {
    const seededMetrics = seededMetricsJson as Record<string, { coverage: number; growth: number }>;
    expect(Object.keys(unitMetrics)).toHaveLength(102);
    for (const [code, profile] of Object.entries(profiles)) {
      expect(unitMetrics[code].population).toBe(profile.population2025);
      expect(unitMetrics[code].coverage).toBe(seededMetrics[code].coverage);
      expect(unitMetrics[code].growth).toBe(seededMetrics[code].growth);
    }
  });
});
