import metrics from '#province-assets/daklak-metrics.json';
import { getUnitProfile } from './unitProfiles';
import type { Metric } from '../types/map';

/** Seeded coverage/growth paired with the verified 2025 population profile. */
export const unitMetrics: Record<string, Metric> = Object.fromEntries(
  Object.entries(metrics as Record<string, Metric>).map(([code, metric]) => {
    const profile = getUnitProfile(code);
    if (!profile) throw new Error(`Missing unit profile for ${code}`);
    return [code, { ...metric, population: profile.population2025 }];
  }),
);
