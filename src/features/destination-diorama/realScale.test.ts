import { describe, expect, it } from 'vitest';
import { verifiedTourismDestinations } from '../../entities/tourism/verifiedTourismDestinations';
import { REAL_FOOTPRINTS, REAL_LINES } from './realFootprints';
import { REAL_SCALE } from './dioramaRealScale';

const extent = (poly: Array<[number, number]>) => {
  const xs = poly.map((p) => p[0]);
  const ys = poly.map((p) => p[1]);
  return [Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)] as const;
};

describe('real footprints and real-size notes', () => {
  it('keeps the OSM polygons at their documented real dimensions', () => {
    const [mw, md] = extent(REAL_FOOTPRINTS['bao-tang-dak-lak']);
    expect(mw).toBeGreaterThan(115);
    expect(mw).toBeLessThan(123);
    expect(md).toBeGreaterThan(56);
    expect(md).toBeLessThan(64);
    const [cw, cd] = extent(REAL_FOOTPRINTS['lang-ca-phe-trung-nguyen']);
    expect(Math.max(cw, cd)).toBeGreaterThan(70);
    expect(Math.max(cw, cd)).toBeLessThan(85);
    const [bw, bd] = extent(REAL_LINES['cau-ong-cop']);
    expect(Math.max(bw, bd)).toBeGreaterThan(400);
    expect(Math.max(bw, bd)).toBeLessThan(440);
  });

  it('only describes real size for real destinations, with a source and both languages', () => {
    const ids = new Set(verifiedTourismDestinations.map((d) => d.id));
    for (const [id, note] of Object.entries(REAL_SCALE)) {
      expect(ids.has(id), id).toBe(true);
      expect(note.vi.length, id).toBeGreaterThan(20);
      expect(note.en.length, id).toBeGreaterThan(20);
      expect(note.sourceUrl, id).toMatch(/^https:\/\//);
    }
  });

  it('only extrudes real closed polygons: at least 3 distinct points and a non-zero area', () => {
    for (const [id, poly] of Object.entries(REAL_FOOTPRINTS)) {
      expect(poly.length, id).toBeGreaterThanOrEqual(3);
      expect(new Set(poly.map((p) => p.join(','))).size, id).toBe(poly.length);
      let area = 0;
      poly.forEach(([x, y], i) => {
        const [nx, ny] = poly[(i + 1) % poly.length];
        area += x * ny - nx * y;
      });
      expect(Math.abs(area / 2), id).toBeGreaterThan(500);
    }
    expect(REAL_FOOTPRINTS['cau-ong-cop']).toBeUndefined();
    expect(REAL_LINES['cau-ong-cop'].length).toBeGreaterThanOrEqual(2);
  });
});
