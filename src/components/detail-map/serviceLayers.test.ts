import { describe, expect, it } from 'vitest';
import {
  buildServicePointLayers,
  buildServicesSource,
  SERVICE_CATEGORY_COLOR,
  SERVICES_LABELS_LAYER_ID,
  SERVICES_POINTS_LAYER_ID,
  SERVICES_SOURCE_LAYER,
  SERVICES_VECTOR_SOURCE_ID,
} from './serviceLayers';

describe('serviceLayers', () => {
  it('builds a pmtiles:// vector source with OSM attribution', () => {
    const source = buildServicesSource('maps/daklak-services.pmtiles');
    expect(source.type).toBe('vector');
    expect(source.url).toBe('pmtiles://maps/daklak-services.pmtiles');
    expect(source.attribution).toContain('OpenStreetMap');
  });

  it('without labels: only the points layer, hidden by default, on the services source-layer', () => {
    const layers = buildServicePointLayers(false);
    expect(layers.map((l) => l.id)).toEqual([SERVICES_POINTS_LAYER_ID]);
    const [points] = layers;
    expect('source' in points && points.source).toBe(SERVICES_VECTOR_SOURCE_ID);
    expect('source-layer' in points && points['source-layer']).toBe(SERVICES_SOURCE_LAYER);
    expect(points.layout && 'visibility' in points.layout && points.layout.visibility).toBe('none');
  });

  it('with labels: adds a hidden-by-default symbol layer requiring a name', () => {
    const layers = buildServicePointLayers(true);
    expect(layers.map((l) => l.id)).toEqual([SERVICES_POINTS_LAYER_ID, SERVICES_LABELS_LAYER_ID]);
    const labels = layers[1];
    expect(labels.type).toBe('symbol');
    expect('source-layer' in labels && labels['source-layer']).toBe(SERVICES_SOURCE_LAYER);
    expect('filter' in labels && labels.filter).toEqual(['has', 'name']);
    expect(labels.layout && 'visibility' in labels.layout && labels.layout.visibility).toBe('none');
  });

  it('the points layer starts hidden regardless of withLabels', () => {
    for (const withLabels of [true, false]) {
      const [points] = buildServicePointLayers(withLabels);
      expect(points.layout && 'visibility' in points.layout && points.layout.visibility).toBe(
        'none',
      );
    }
  });

  it('the circle-color expression matches on amenity, falling back to the government color', () => {
    const [points] = buildServicePointLayers(false);
    const paint = 'paint' in points ? points.paint : undefined;
    const expression = paint && 'circle-color' in paint ? paint['circle-color'] : undefined;
    expect(Array.isArray(expression)).toBe(true);
    const arr = expression as unknown[];
    expect(arr[0]).toBe('match');
    expect(arr[1]).toEqual(['get', 'amenity']);
    // Last element of a `match` expression is the fallback (no case matched) — a node with no
    // `amenity` at all (the office=government-only nodes, see docstring) must fall back to the
    // SAME color as the explicit GOVERNMENT_AMENITIES case, not a generic/uncategorized color.
    expect(arr[arr.length - 1]).toBe(SERVICE_CATEGORY_COLOR.government);
    expect(arr).toContain(SERVICE_CATEGORY_COLOR.health);
    expect(arr).toContain(SERVICE_CATEGORY_COLOR.education);
  });
});
