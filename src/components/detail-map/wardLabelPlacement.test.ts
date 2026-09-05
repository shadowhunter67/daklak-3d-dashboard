import { describe, expect, it } from 'vitest';
import {
  estimateLabelBoxPx,
  LEADER_LINE_MIN_DISPLACEMENT_PX,
  resolveLabelCollisions,
  type LabelPlacementInput,
} from './wardLabelPlacement';
import wardLabels from '../../assets/maps/daklak/daklak-labels.json';

describe('resolveLabelCollisions', () => {
  it('never drops a label: returns exactly one result per input, in input order', () => {
    const labels: LabelPlacementInput[] = [
      { id: 'a', x: 0, y: 0, width: 40, height: 14, priority: 1 },
      { id: 'b', x: 5, y: 5, width: 40, height: 14, priority: 2 },
      { id: 'c', x: 500, y: 500, width: 40, height: 14, priority: 1 },
    ];
    const results = resolveLabelCollisions(labels);
    expect(results.map((r) => r.id)).toEqual(['a', 'b', 'c']);
  });

  it('leaves well-separated labels at their anchor (no unnecessary displacement)', () => {
    const labels: LabelPlacementInput[] = [
      { id: 'a', x: 0, y: 0, width: 40, height: 14, priority: 1 },
      { id: 'b', x: 1000, y: 1000, width: 40, height: 14, priority: 1 },
    ];
    const results = resolveLabelCollisions(labels);
    for (const r of results) {
      expect(r.dx).toBe(0);
      expect(r.dy).toBe(0);
      expect(r.displaced).toBe(false);
    }
  });

  it('displaces one of two overlapping same-priority labels apart', () => {
    const labels: LabelPlacementInput[] = [
      { id: 'a', x: 100, y: 100, width: 60, height: 16, priority: 2 },
      { id: 'b', x: 105, y: 102, width: 60, height: 16, priority: 2 },
    ];
    const results = resolveLabelCollisions(labels);
    const displacedCount = results.filter((r) => r.displaced).length;
    expect(displacedCount).toBeGreaterThanOrEqual(1);

    // The two final boxes must not overlap (or, if placement genuinely can't avoid it — not the
    // case for this simple 2-label scenario — the algorithm would have minimized overlap; assert
    // no overlap here since a collision-free placement is geometrically achievable).
    const [a, b] = results;
    const boxOf = (id: string, r: (typeof results)[number]) => {
      const input = labels.find((l) => l.id === id)!;
      return {
        left: input.x + r.dx - input.width / 2,
        right: input.x + r.dx + input.width / 2,
        top: input.y + r.dy - input.height / 2,
        bottom: input.y + r.dy + input.height / 2,
      };
    };
    const boxA = boxOf('a', a);
    const boxB = boxOf('b', b);
    const overlapsX = boxA.left < boxB.right && boxB.left < boxA.right;
    const overlapsY = boxA.top < boxB.bottom && boxB.top < boxA.bottom;
    expect(overlapsX && overlapsY).toBe(false);
  });

  it('prefers keeping the higher-priority (lower number) label at its anchor', () => {
    const labels: LabelPlacementInput[] = [
      { id: 'low-priority', x: 100, y: 100, width: 60, height: 16, priority: 2 },
      { id: 'high-priority', x: 102, y: 101, width: 60, height: 16, priority: 1 },
    ];
    const results = resolveLabelCollisions(labels);
    const highPriorityResult = results.find((r) => r.id === 'high-priority')!;
    expect(highPriorityResult.dx).toBe(0);
    expect(highPriorityResult.dy).toBe(0);
  });

  it('is deterministic across repeated calls with the same input', () => {
    const labels: LabelPlacementInput[] = Array.from({ length: 30 }, (_, i) => ({
      id: `label-${i}`,
      x: (i % 6) * 20,
      y: Math.floor(i / 6) * 12,
      width: 50,
      height: 14,
      priority: (i % 2) + 1,
    }));
    const run1 = resolveLabelCollisions(labels);
    const run2 = resolveLabelCollisions(labels);
    expect(run2).toEqual(run1);
  });

  it('does not mutate the input array', () => {
    const labels: LabelPlacementInput[] = [
      { id: 'a', x: 0, y: 0, width: 40, height: 14, priority: 1 },
    ];
    const snapshot = JSON.parse(JSON.stringify(labels));
    resolveLabelCollisions(labels);
    expect(labels).toEqual(snapshot);
  });

  it('always places a label even in a dense cluster where every candidate collides', () => {
    // 9 labels crammed into a tiny area — geometrically impossible for all pairs to avoid overlap
    // within the candidate radii used. Every id must still get a real, finite result.
    const labels: LabelPlacementInput[] = Array.from({ length: 9 }, (_, i) => ({
      id: `dense-${i}`,
      x: (i % 3) * 4,
      y: Math.floor(i / 3) * 4,
      width: 80,
      height: 20,
      priority: 1,
    }));
    const results = resolveLabelCollisions(labels);
    expect(results).toHaveLength(9);
    for (const r of results) {
      expect(Number.isFinite(r.dx)).toBe(true);
      expect(Number.isFinite(r.dy)).toBe(true);
    }
  });

  it('marks displaced=true exactly when dx or dy is non-zero', () => {
    const labels: LabelPlacementInput[] = [
      { id: 'a', x: 100, y: 100, width: 60, height: 16, priority: 1 },
      { id: 'b', x: 101, y: 100, width: 60, height: 16, priority: 2 },
    ];
    for (const r of resolveLabelCollisions(labels)) {
      expect(r.displaced).toBe(r.dx !== 0 || r.dy !== 0);
    }
  });

  it('resolves collisions for all 102 real ward labels placed at a dense synthetic zoom without dropping any', () => {
    interface WardLabelEntry {
      name: string;
      longitude: number;
      latitude: number;
      priority: number;
    }
    const entries = Object.entries(wardLabels as Record<string, WardLabelEntry>);
    expect(entries).toHaveLength(102);

    // Simulate a low-zoom province overview where many anchors land close together on screen: map
    // every real lon/lat onto a plausible desktop viewport (a stand-in for `map.project()` at a
    // zoom level tight enough to make collisions likely) so the engine is exercised at full scale,
    // not just on hand-picked pairs — real relative density (dense where wards are dense) is kept.
    const minLon = Math.min(...entries.map(([, e]) => e.longitude));
    const maxLon = Math.max(...entries.map(([, e]) => e.longitude));
    const minLat = Math.min(...entries.map(([, e]) => e.latitude));
    const maxLat = Math.max(...entries.map(([, e]) => e.latitude));
    const SCREEN_WIDTH_PX = 900;
    const SCREEN_HEIGHT_PX = 700;

    const labels: LabelPlacementInput[] = entries.map(([code, entry]) => {
      const fontSizePx = entry.priority === 1 ? 13 : 11;
      const box = estimateLabelBoxPx(entry.name, fontSizePx);
      return {
        id: code,
        x: ((entry.longitude - minLon) / (maxLon - minLon)) * SCREEN_WIDTH_PX,
        y: ((maxLat - entry.latitude) / (maxLat - minLat)) * SCREEN_HEIGHT_PX,
        width: box.width,
        height: box.height,
        priority: entry.priority,
      };
    });

    const results = resolveLabelCollisions(labels);
    expect(results).toHaveLength(102);
    expect(new Set(results.map((r) => r.id)).size).toBe(102);
    for (const r of results) {
      expect(Number.isFinite(r.dx)).toBe(true);
      expect(Number.isFinite(r.dy)).toBe(true);
    }
  });
});

describe('estimateLabelBoxPx', () => {
  it('gives a longer name a wider (or equally wrapped) box than a short one at the same font size', () => {
    const short = estimateLabelBoxPx('Ea Na', 12);
    const long = estimateLabelBoxPx('Buôn Ma Thuột', 12);
    expect(long.width).toBeGreaterThan(short.width);
  });

  it('wraps a very long name onto multiple lines instead of returning an unbounded width', () => {
    const box = estimateLabelBoxPx('Khu đô thị mới phường Phú Yên rất là dài', 12);
    expect(box.lineCount).toBeGreaterThan(1);
    expect(box.height).toBeGreaterThan(12 * 1.3);
  });

  it('never returns a non-positive dimension', () => {
    const box = estimateLabelBoxPx('A', 12);
    expect(box.width).toBeGreaterThan(0);
    expect(box.height).toBeGreaterThan(0);
  });
});

describe('LEADER_LINE_MIN_DISPLACEMENT_PX', () => {
  it('is a positive threshold', () => {
    expect(LEADER_LINE_MIN_DISPLACEMENT_PX).toBeGreaterThan(0);
  });
});
