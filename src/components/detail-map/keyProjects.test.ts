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
});
