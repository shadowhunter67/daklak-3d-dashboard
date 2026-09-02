import { describe, expect, it } from 'vitest';
import { buildDetailMapStyle } from './detailMapStyle';
import {
  WARD_BOUNDARY_FILL_LAYER_ID,
  WARD_BOUNDARY_LINE_LAYER_ID,
  WARD_BOUNDARY_SOURCE_ID,
  WARD_SELECTED_FILL_LAYER_ID,
  WARD_SELECTED_LINE_LAYER_ID,
} from './wardBoundaryLayers';
import type { DetailMapSourceAvailability } from './detailMapTypes';

const noSources: DetailMapSourceAvailability = {
  roads: false,
  administrativeBoundaries: false,
  dashboardOverlays: false,
  terrain: false,
  satellite: false,
};

describe('buildDetailMapStyle', () => {
  it('always includes the ward-boundaries source, regardless of sourceAvailability', () => {
    const style = buildDetailMapStyle(noSources);
    expect(style.sources[WARD_BOUNDARY_SOURCE_ID]).toBeDefined();
    expect(style.sources[WARD_BOUNDARY_SOURCE_ID].type).toBe('geojson');
  });

  it('includes background + all 4 ward-boundary layers, in order', () => {
    const style = buildDetailMapStyle(noSources);
    const ids = style.layers.map((layer) => layer.id);
    expect(ids).toEqual([
      'background',
      WARD_BOUNDARY_FILL_LAYER_ID,
      WARD_BOUNDARY_LINE_LAYER_ID,
      WARD_SELECTED_FILL_LAYER_ID,
      WARD_SELECTED_LINE_LAYER_ID,
    ]);
  });

  it('the two "selected" layers start inert: zero opacity and a filter matching no code', () => {
    const style = buildDetailMapStyle(noSources);
    const selectedFill = style.layers.find((layer) => layer.id === WARD_SELECTED_FILL_LAYER_ID)!;
    const selectedLine = style.layers.find((layer) => layer.id === WARD_SELECTED_LINE_LAYER_ID)!;
    expect(selectedFill.type).toBe('fill');
    expect(selectedLine.type).toBe('line');
    if (selectedFill.type === 'fill') {
      expect(selectedFill.paint?.['fill-opacity']).toBe(0);
      expect(selectedFill.filter).toEqual(['==', ['get', 'code'], '']);
    }
    if (selectedLine.type === 'line') {
      expect(selectedLine.paint?.['line-opacity']).toBe(0);
      expect(selectedLine.filter).toEqual(['==', ['get', 'code'], '']);
    }
  });

  it('every ward-boundary layer references the ward-boundaries source', () => {
    const style = buildDetailMapStyle(noSources);
    const wardLayers = style.layers.filter((layer) => layer.id !== 'background');
    for (const layer of wardLayers) {
      expect('source' in layer && layer.source).toBe(WARD_BOUNDARY_SOURCE_ID);
    }
  });
});
