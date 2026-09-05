import { describe, expect, it } from 'vitest';
import {
  buildWardLabelLayers,
  buildWardLabelLeaderLayer,
  buildWardLabelLeaderSource,
  buildWardLabelSource,
  getWardLabelEntries,
  WARD_LABEL_LAYER_ID,
  WARD_LABEL_LEADER_LAYER_ID,
  WARD_LABEL_LEADER_SOURCE_ID,
  WARD_LABEL_SOURCE_ID,
  WARD_LABEL_TEXT_SIZE_STOPS,
  WARD_SELECTED_LABEL_LAYER_ID,
  wardLabelFontSizePx,
} from './wardLabelLayers';

describe('buildWardLabelSource', () => {
  it('emits one Point feature per bundled ward label (all 102), keyed by administrative code', () => {
    const source = buildWardLabelSource();
    expect(source.type).toBe('geojson');
    const data = source.data as GeoJSON.FeatureCollection<GeoJSON.Point>;
    expect(data.features).toHaveLength(102);
    for (const feature of data.features) {
      expect(feature.geometry.type).toBe('Point');
      expect(typeof feature.properties?.code).toBe('string');
      expect(String(feature.properties?.name).length).toBeGreaterThan(0);
      expect([1, 2]).toContain(feature.properties?.priority);
      const [lng, lat] = feature.geometry.coordinates;
      // Đắk Lắk (incl. former Phú Yên) rough bbox
      expect(lng).toBeGreaterThan(107);
      expect(lng).toBeLessThan(110);
      expect(lat).toBeGreaterThan(11.5);
      expect(lat).toBeLessThan(14);
    }
  });

  it('normalizes names to NFC so diacritics render from a single glyph run', () => {
    const data = buildWardLabelSource().data as GeoJSON.FeatureCollection<GeoJSON.Point>;
    for (const feature of data.features) {
      const name = String(feature.properties?.name);
      expect(name).toBe(name.normalize('NFC'));
    }
  });
});

describe('buildWardLabelLayers', () => {
  it('is a base symbol layer plus an always-visible selected layer, both on the ward-labels source', () => {
    const [base, selected] = buildWardLabelLayers();
    expect(base.id).toBe(WARD_LABEL_LAYER_ID);
    expect(selected.id).toBe(WARD_SELECTED_LABEL_LAYER_ID);
    expect(base.type).toBe('symbol');
    expect(selected.type).toBe('symbol');
    expect('source' in base && base.source).toBe(WARD_LABEL_SOURCE_ID);
    expect('source' in selected && selected.source).toBe(WARD_LABEL_SOURCE_ID);
  });

  it('the base layer prioritises ward centres in collisions via symbol-sort-key', () => {
    const [base] = buildWardLabelLayers();
    expect(base.type).toBe('symbol');
    if (base.type === 'symbol') {
      expect(base.layout?.['symbol-sort-key']).toEqual(['get', 'priority']);
    }
  });

  it('the selected layer starts inert (filter matches no code) and never yields to collisions', () => {
    const [, selected] = buildWardLabelLayers();
    expect(selected.type).toBe('symbol');
    if (selected.type === 'symbol') {
      expect(selected.filter).toEqual(['==', ['get', 'code'], '']);
      expect(selected.layout?.['text-allow-overlap']).toBe(true);
      expect(selected.layout?.['text-ignore-placement']).toBe(true);
    }
  });

  it('the base layer never lets MapLibre collision detection drop a label (hard product requirement)', () => {
    const [base] = buildWardLabelLayers();
    expect(base.type).toBe('symbol');
    if (base.type === 'symbol') {
      expect(base.layout?.['text-allow-overlap']).toBe(true);
      expect(base.layout?.['text-ignore-placement']).toBe(true);
      // Reads the per-feature displacement wardLabelPlacement.ts/MapLibreProvider computes —
      // [0, 0] (from buildWardLabelSource()) until the first placement pass runs.
      expect(base.layout?.['text-offset']).toEqual(['get', 'textOffset']);
    }
  });
});

describe('buildWardLabelSource', () => {
  it('every feature starts with a neutral [0, 0] textOffset (no visual jump before the first placement pass)', () => {
    const source = buildWardLabelSource();
    const data = source.data as GeoJSON.FeatureCollection<
      GeoJSON.Point,
      { textOffset: [number, number] }
    >;
    for (const feature of data.features) {
      expect(feature.properties.textOffset).toEqual([0, 0]);
    }
  });
});

describe('getWardLabelEntries', () => {
  it('exposes exactly the same 102 entries buildWardLabelSource() reads, keyed by administrative code', () => {
    const entries = getWardLabelEntries();
    expect(entries).toHaveLength(102);
    const source = buildWardLabelSource();
    const data = source.data as GeoJSON.FeatureCollection<GeoJSON.Point, { code: string }>;
    const sourceCodes = new Set(data.features.map((f) => f.properties.code));
    for (const [code] of entries) {
      expect(sourceCodes.has(code)).toBe(true);
    }
  });
});

describe('wardLabelFontSizePx', () => {
  it('matches WARD_LABEL_TEXT_SIZE_STOPS exactly at each stop zoom, for both priorities', () => {
    for (const stop of WARD_LABEL_TEXT_SIZE_STOPS) {
      expect(wardLabelFontSizePx(stop.zoom, 1)).toBe(stop.priority1);
      expect(wardLabelFontSizePx(stop.zoom, 2)).toBe(stop.priority2);
    }
  });

  it('interpolates linearly between two stops', () => {
    const [a, b] = WARD_LABEL_TEXT_SIZE_STOPS;
    const midZoom = (a.zoom + b.zoom) / 2;
    expect(wardLabelFontSizePx(midZoom, 1)).toBeCloseTo((a.priority1 + b.priority1) / 2, 5);
  });

  it('clamps below the first stop and above the last stop instead of extrapolating', () => {
    const first = WARD_LABEL_TEXT_SIZE_STOPS[0];
    const last = WARD_LABEL_TEXT_SIZE_STOPS[WARD_LABEL_TEXT_SIZE_STOPS.length - 1];
    expect(wardLabelFontSizePx(first.zoom - 5, 1)).toBe(first.priority1);
    expect(wardLabelFontSizePx(last.zoom + 5, 1)).toBe(last.priority1);
  });
});

describe('buildWardLabelLeaderLayer / buildWardLabelLeaderSource', () => {
  it('the leader layer is a thin line layer reading the leader source', () => {
    const layer = buildWardLabelLeaderLayer();
    expect(layer.id).toBe(WARD_LABEL_LEADER_LAYER_ID);
    expect(layer.type).toBe('line');
    expect('source' in layer && layer.source).toBe(WARD_LABEL_LEADER_SOURCE_ID);
  });

  it('the leader source starts empty — no leader lines until a displacement pass runs', () => {
    const source = buildWardLabelLeaderSource();
    const data = source.data as GeoJSON.FeatureCollection;
    expect(data.features).toEqual([]);
  });
});
