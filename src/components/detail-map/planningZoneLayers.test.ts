import { describe, expect, it } from 'vitest';
import {
  buildPlanningZoneLayers,
  buildPlanningZonesSource,
  PLANNING_ZONES_FILL_LAYER_ID,
  PLANNING_ZONES_LINE_LAYER_ID,
  PLANNING_ZONES_SOURCE_ID,
} from './planningZoneLayers';

describe('planningZoneLayers', () => {
  it('the source is the bundled planning-zones FeatureCollection', () => {
    const source = buildPlanningZonesSource();
    expect(source.type).toBe('geojson');
    expect((source.data as GeoJSON.FeatureCollection).type).toBe('FeatureCollection');
  });

  it('fill + line layers, both hidden by default, on the planning-zones source', () => {
    const layers = buildPlanningZoneLayers();
    expect(layers.map((l) => l.id)).toEqual([
      PLANNING_ZONES_FILL_LAYER_ID,
      PLANNING_ZONES_LINE_LAYER_ID,
    ]);
    for (const layer of layers) {
      expect('source' in layer && layer.source).toBe(PLANNING_ZONES_SOURCE_ID);
      expect(layer.layout && 'visibility' in layer.layout && layer.layout.visibility).toBe('none');
    }
  });
});
