import { describe, expect, it } from 'vitest';
import { PLANNING_ZONES } from './planningZones';

describe('PLANNING_ZONES data', () => {
  const features = PLANNING_ZONES.features;

  it('has a few real, sourced zones — not an attempt at province-wide coverage', () => {
    expect(features.length).toBeGreaterThanOrEqual(3);
    expect(features.length).toBeLessThan(15);
  });

  it('every zone is a closed Polygon with a unique id and a real https source', () => {
    const ids = new Set<string>();
    for (const f of features) {
      const p = f.properties;
      expect(ids.has(p.id)).toBe(false);
      ids.add(p.id);
      expect(p.name.length).toBeGreaterThan(3);
      expect(p.kind.length).toBeGreaterThan(0);
      expect(p.summary.length).toBeGreaterThan(10);
      expect(p.sourceUrl).toMatch(/^https:\/\/\S+$/);
      expect(p.sourceDate).toMatch(/^\d{4}(-\d{2})?$/);
      expect(f.geometry.type).toBe('Polygon');
      const ring = f.geometry.coordinates[0];
      expect(ring.length).toBeGreaterThanOrEqual(4);
      // closed ring
      expect(ring[0]).toEqual(ring[ring.length - 1]);
    }
  });

  it('every zone sits within the post-merger Đắk Lắk bounding box', () => {
    for (const f of features) {
      for (const [lng, lat] of f.geometry.coordinates[0]) {
        expect(lng).toBeGreaterThan(107);
        expect(lng).toBeLessThan(110);
        expect(lat).toBeGreaterThan(11.5);
        expect(lat).toBeLessThan(14);
      }
    }
  });
});
