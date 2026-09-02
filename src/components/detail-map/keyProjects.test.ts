import { describe, expect, it } from 'vitest';
import {
  KEY_PROJECTS,
  KEY_PROJECT_CATEGORY_LABEL,
  KEY_PROJECT_STATUS_COLOR,
  KEY_PROJECT_STATUS_LABEL,
} from './keyProjects';

describe('KEY_PROJECTS data', () => {
  const features = KEY_PROJECTS.features;

  it('is a non-trivial FeatureCollection', () => {
    expect(KEY_PROJECTS.type).toBe('FeatureCollection');
    expect(features.length).toBeGreaterThanOrEqual(20);
  });

  it('every feature has a unique id and complete, sourced properties', () => {
    const ids = new Set<string>();
    for (const f of features) {
      const p = f.properties;
      expect(p.id).toBeTruthy();
      expect(ids.has(p.id)).toBe(false);
      ids.add(p.id);
      expect(p.name.length).toBeGreaterThan(3);
      expect(p.summary.length).toBeGreaterThan(3);
      expect(KEY_PROJECT_CATEGORY_LABEL[p.category]).toBeTruthy();
      expect(KEY_PROJECT_STATUS_LABEL[p.status]).toBeTruthy();
      // every project must cite a real https source
      expect(p.sourceUrl).toMatch(/^https:\/\/\S+$/);
      expect(p.sourceLabel.length).toBeGreaterThan(1);
      expect(p.sourceDate).toMatch(/^\d{4}(-\d{2})?$/);
    }
  });

  it('every geometry sits within the post-merger Đắk Lắk bounding box', () => {
    const inBox = ([lng, lat]: number[]) => lng > 107 && lng < 110 && lat > 11.5 && lat < 14;
    for (const f of features) {
      if (f.geometry.type === 'Point') {
        expect(inBox(f.geometry.coordinates)).toBe(true);
      } else if (f.geometry.type === 'LineString') {
        expect(f.geometry.coordinates.length).toBeGreaterThanOrEqual(2);
        for (const c of f.geometry.coordinates) expect(inBox(c)).toBe(true);
      } else {
        throw new Error(`unexpected geometry ${f.geometry.type}`);
      }
    }
  });

  it('has a colour for every status key', () => {
    for (const status of Object.keys(KEY_PROJECT_STATUS_LABEL)) {
      expect(KEY_PROJECT_STATUS_COLOR[status as keyof typeof KEY_PROJECT_STATUS_COLOR]).toMatch(
        /^#[0-9a-f]{6}$/i,
      );
    }
  });

  it('covers the national corridors as LineStrings and point projects as Points', () => {
    const lines = features.filter((f) => f.geometry.type === 'LineString');
    const points = features.filter((f) => f.geometry.type === 'Point');
    expect(lines.length).toBeGreaterThanOrEqual(3);
    expect(points.length).toBeGreaterThanOrEqual(10);
  });

  it('the CT.24 and high-speed-rail corridors are OSM-derived multi-segment polylines', () => {
    for (const id of ['ct-kh-bmt', 'dsct-bac-nam']) {
      const f = features.find((x) => x.properties.id === id)!;
      expect(f.properties.geom).toBe('osm');
      expect(f.geometry.type).toBe('LineString');
      if (f.geometry.type === 'LineString') {
        expect(f.geometry.coordinates.length).toBeGreaterThanOrEqual(8);
        // real corridors span a real distance, not a stub
        const lngs = f.geometry.coordinates.map((c) => c[0]);
        const lats = f.geometry.coordinates.map((c) => c[1]);
        const span =
          Math.max(...lngs) - Math.min(...lngs) + (Math.max(...lats) - Math.min(...lats));
        expect(span).toBeGreaterThan(0.5);
      }
    }
    // CT.24 specifically runs broadly west→east
    const ct24 = features.find((x) => x.properties.id === 'ct-kh-bmt')!;
    if (ct24.geometry.type === 'LineString') {
      const lngs = ct24.geometry.coordinates.map((c) => c[0]);
      expect(Math.max(...lngs) - Math.min(...lngs)).toBeGreaterThan(0.8);
    }
  });

  it('includes the "đang đấu thầu / gọi đầu tư" real-estate category with real entries', () => {
    const tender = features.filter((f) => f.properties.category === 'do-thi-dau-thau');
    expect(tender.length).toBeGreaterThanOrEqual(3);
    expect(tender.map((f) => f.properties.name).join(' ')).toMatch(/Ecopark|Eco City|ERA City/);
  });
});
