import { describe, expect, it } from 'vitest';
import { seeded } from './dioramaGeometry';
import {
  BRIDGE_Z,
  DROPS,
  LIPS,
  WATER_LEVELS,
  channelHalf,
  clusteredSampler,
  giaLongHeight,
  giaLongRocks,
  lipLayout,
  lipZ,
} from './giaLongTerrain';

describe('Thác Gia Long terrain', () => {
  it('steps down the river through every lip, ending in a deeper pool', () => {
    let previous = giaLongHeight(0, -12);
    for (let i = 0; i < LIPS.length; i++) {
      const after = giaLongHeight(0, lipZ(i, 0) + 0.8);
      expect(after).toBeLessThan(previous);
      previous = after;
    }
    expect(WATER_LEVELS).toHaveLength(LIPS.length + 1);
    expect(DROPS.reduce((sum, d) => sum + d, 0)).toBeGreaterThan(2);
    expect(giaLongHeight(0, 3)).toBeLessThan(WATER_LEVELS[WATER_LEVELS.length - 1]);
  });

  it('keeps the lip edges irregular rather than straight', () => {
    const edges = Array.from({ length: 20 }, (_, i) => lipZ(1, -5 + i * 0.5));
    expect(Math.max(...edges) - Math.min(...edges)).toBeGreaterThan(0.2);
  });

  it('raises both banks well above the river so the bridge lands on high ground', () => {
    const half = channelHalf(BRIDGE_Z) + 2.4;
    expect(giaLongHeight(-half, BRIDGE_Z)).toBeGreaterThan(giaLongHeight(0, BRIDGE_Z) + 1);
    expect(giaLongHeight(half, BRIDGE_Z)).toBeGreaterThan(giaLongHeight(0, BRIDGE_Z) + 1);
  });

  it('splits each lip into several non-overlapping falling strips separated by rock', () => {
    const { strips, lumps } = lipLayout(71);
    for (let tier = 0; tier < LIPS.length; tier++) {
      const row = strips.filter((s) => s.tier === tier).sort((a, b) => a.x - b.x);
      expect(row.length).toBeGreaterThanOrEqual(2);
      for (let i = 1; i < row.length; i++) {
        expect(row[i].x - row[i].width / 2).toBeGreaterThanOrEqual(
          row[i - 1].x + row[i - 1].width / 2 - 1e-9,
        );
      }
    }
    expect(lumps.length).toBeGreaterThan(strips.length / 2);
  });

  it('builds a rock hierarchy with sizes in three tiers, sunk into the ground', () => {
    const { lumps } = lipLayout(71);
    const rocks = giaLongRocks(73, lumps);
    const mean = (list: typeof rocks.big) =>
      list.reduce((sum, p) => sum + p.scale[0], 0) / list.length;
    expect(mean(rocks.big)).toBeGreaterThan(mean(rocks.medium));
    expect(mean(rocks.medium)).toBeGreaterThan(mean(rocks.small));
    for (const p of rocks.big) {
      expect(p.position[1]).toBeLessThan(giaLongHeight(p.position[0], p.position[2]));
    }
  });

  it('clusters trees and never plants them inside the river channel', () => {
    const sample = clusteredSampler(76, 6, 4, [-20, -2]);
    const random = seeded(1);
    let planted = 0;
    for (let i = 0; i < 400; i++) {
      const spot = sample(random);
      if (!spot) continue;
      planted++;
      expect(Math.abs(spot[0])).toBeGreaterThan(channelHalf(spot[1]));
    }
    expect(planted).toBeGreaterThan(100);
  });
});
