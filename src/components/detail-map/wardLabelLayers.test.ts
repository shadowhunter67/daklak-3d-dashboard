import { describe, expect, it } from 'vitest';
import {
  buildWardLabelLayers,
  buildWardLabelSource,
  WARD_LABEL_LAYER_ID,
  WARD_LABEL_SOURCE_ID,
  WARD_SELECTED_LABEL_LAYER_ID,
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
});
