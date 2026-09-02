import { describe, expect, it } from 'vitest';
import { buildDetailMapStyle } from './detailMapStyle';
import {
  WARD_BOUNDARY_FILL_LAYER_ID,
  WARD_BOUNDARY_LINE_LAYER_ID,
  WARD_BOUNDARY_SOURCE_ID,
  WARD_SELECTED_FILL_LAYER_ID,
  WARD_SELECTED_LINE_LAYER_ID,
} from './wardBoundaryLayers';
import {
  HAMLET_LABELS_LAYER_ID,
  OSM_VECTOR_SOURCE_ID,
  PLACES_SOURCE_LAYER,
  PLACE_LABELS_LAYER_ID,
  ROADS_LINE_LAYER_ID,
  ROADS_SOURCE_LAYER,
  ROAD_LABELS_LAYER_ID,
} from './roadLayers';
import { BUILDINGS_FILL_LAYER_ID, BUILDINGS_OUTLINE_LAYER_ID } from './buildingLayers';
import {
  WARD_LABEL_LAYER_ID,
  WARD_LABEL_SOURCE_ID,
  WARD_SELECTED_LABEL_LAYER_ID,
} from './wardLabelLayers';
import { PLANNING_FILL_LAYER_ID } from './planningLayers';
import type { DetailMapSourceAvailability } from './detailMapTypes';

const noSources: DetailMapSourceAvailability = {
  roads: false,
  administrativeBoundaries: false,
  dashboardOverlays: false,
  terrain: false,
  satellite: false,
};

const withRoads: DetailMapSourceAvailability = { ...noSources, roads: true };
const PMTILES_URL = '/maps/daklak.pmtiles';
const GLYPHS_URL = '/fonts/{fontstack}/{range}.pbf';

describe('buildDetailMapStyle', () => {
  it('always includes the ward-boundaries source, regardless of sourceAvailability', () => {
    const style = buildDetailMapStyle(noSources);
    expect(style.sources[WARD_BOUNDARY_SOURCE_ID]).toBeDefined();
    expect(style.sources[WARD_BOUNDARY_SOURCE_ID].type).toBe('geojson');
  });

  it('includes background + the inert planning wash + all 4 ward-boundary layers, in order', () => {
    const style = buildDetailMapStyle(noSources);
    const ids = style.layers.map((layer) => layer.id);
    expect(ids).toEqual([
      'background',
      WARD_BOUNDARY_FILL_LAYER_ID,
      PLANNING_FILL_LAYER_ID,
      WARD_BOUNDARY_LINE_LAYER_ID,
      WARD_SELECTED_FILL_LAYER_ID,
      WARD_SELECTED_LINE_LAYER_ID,
    ]);
    const planning = style.layers.find((l) => l.id === PLANNING_FILL_LAYER_ID);
    expect(planning?.type === 'fill' && planning.paint?.['fill-opacity']).toBe(0);
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

  it('with roads available but no sourceUrl, never emits the OSM source/layers (defensive guard)', () => {
    const style = buildDetailMapStyle(withRoads, undefined, GLYPHS_URL);
    expect(style.sources[OSM_VECTOR_SOURCE_ID]).toBeUndefined();
    const ids = style.layers.map((layer) => layer.id);
    expect(ids).not.toContain(ROADS_LINE_LAYER_ID);
    expect(ids).not.toContain(BUILDINGS_FILL_LAYER_ID);
  });

  it('with roads + sourceUrl, adds a vector source pointing at pmtiles://<url>', () => {
    const style = buildDetailMapStyle(withRoads, PMTILES_URL, GLYPHS_URL);
    const source = style.sources[OSM_VECTOR_SOURCE_ID];
    expect(source).toBeDefined();
    expect(source.type).toBe('vector');
    expect('url' in source && source.url).toBe(`pmtiles://${PMTILES_URL}`);
    expect('attribution' in source && source.attribution).toMatch(/OpenStreetMap/);
  });

  it('with roads + sourceUrl + glyphsUrl, the full layer id array is in the documented draw order', () => {
    const style = buildDetailMapStyle(withRoads, PMTILES_URL, GLYPHS_URL);
    const ids = style.layers.map((layer) => layer.id);
    expect(ids).toEqual([
      'background',
      WARD_BOUNDARY_FILL_LAYER_ID,
      PLANNING_FILL_LAYER_ID,
      BUILDINGS_FILL_LAYER_ID,
      BUILDINGS_OUTLINE_LAYER_ID,
      ROADS_LINE_LAYER_ID,
      WARD_BOUNDARY_LINE_LAYER_ID,
      WARD_SELECTED_FILL_LAYER_ID,
      WARD_SELECTED_LINE_LAYER_ID,
      WARD_LABEL_LAYER_ID,
      WARD_SELECTED_LABEL_LAYER_ID,
      ROAD_LABELS_LAYER_ID,
      PLACE_LABELS_LAYER_ID,
      HAMLET_LABELS_LAYER_ID,
    ]);
    expect(style.glyphs).toBe(GLYPHS_URL);
  });

  it('without glyphsUrl, skips every label layer (OSM + ward-name) but still renders roads/buildings', () => {
    const style = buildDetailMapStyle(withRoads, PMTILES_URL);
    const ids = style.layers.map((layer) => layer.id);
    expect(ids).toContain(ROADS_LINE_LAYER_ID);
    expect(ids).toContain(BUILDINGS_FILL_LAYER_ID);
    expect(ids).not.toContain(ROAD_LABELS_LAYER_ID);
    expect(ids).not.toContain(PLACE_LABELS_LAYER_ID);
    expect(ids).not.toContain(HAMLET_LABELS_LAYER_ID);
    expect(ids).not.toContain(WARD_LABEL_LAYER_ID);
    expect(style.sources[WARD_LABEL_SOURCE_ID]).toBeUndefined();
    expect(style.glyphs).toBeUndefined();
  });

  it('adds ward-name label layers + their source from glyphs alone, with no PMTiles source', () => {
    const style = buildDetailMapStyle(noSources, undefined, GLYPHS_URL);
    expect(style.sources[WARD_LABEL_SOURCE_ID]).toBeDefined();
    expect(style.sources[OSM_VECTOR_SOURCE_ID]).toBeUndefined();
    const ids = style.layers.map((layer) => layer.id);
    // ward-name labels are the last two layers, drawn on top of the boundary/highlight layers
    expect(ids).toEqual([
      'background',
      WARD_BOUNDARY_FILL_LAYER_ID,
      PLANNING_FILL_LAYER_ID,
      WARD_BOUNDARY_LINE_LAYER_ID,
      WARD_SELECTED_FILL_LAYER_ID,
      WARD_SELECTED_LINE_LAYER_ID,
      WARD_LABEL_LAYER_ID,
      WARD_SELECTED_LABEL_LAYER_ID,
    ]);
    expect(ids).not.toContain(ROAD_LABELS_LAYER_ID);
    expect(style.glyphs).toBe(GLYPHS_URL);
    const selectedLabel = style.layers.find((l) => l.id === WARD_SELECTED_LABEL_LAYER_ID)!;
    expect(selectedLabel.type).toBe('symbol');
    if (selectedLabel.type === 'symbol') {
      expect(selectedLabel.filter).toEqual(['==', ['get', 'code'], '']);
    }
  });

  it('every new layer references the correct source-layer, matching the tippecanoe build contract', () => {
    const style = buildDetailMapStyle(withRoads, PMTILES_URL, GLYPHS_URL);
    const byId = Object.fromEntries(style.layers.map((layer) => [layer.id, layer]));
    expect(
      'source-layer' in byId[ROADS_LINE_LAYER_ID] && byId[ROADS_LINE_LAYER_ID]['source-layer'],
    ).toBe(ROADS_SOURCE_LAYER);
    expect(
      'source-layer' in byId[BUILDINGS_FILL_LAYER_ID] &&
        byId[BUILDINGS_FILL_LAYER_ID]['source-layer'],
    ).toBe('buildings');
    expect(
      'source-layer' in byId[ROAD_LABELS_LAYER_ID] && byId[ROAD_LABELS_LAYER_ID]['source-layer'],
    ).toBe(ROADS_SOURCE_LAYER);
    expect(
      'source-layer' in byId[PLACE_LABELS_LAYER_ID] && byId[PLACE_LABELS_LAYER_ID]['source-layer'],
    ).toBe(PLACES_SOURCE_LAYER);
    expect(
      'source-layer' in byId[HAMLET_LABELS_LAYER_ID] &&
        byId[HAMLET_LABELS_LAYER_ID]['source-layer'],
    ).toBe(PLACES_SOURCE_LAYER);
  });

  it('splits place labels into a settlement tier (minzoom 8) and a hamlet tier (minzoom 13) so hamlet names do not clutter the province-wide overview', () => {
    const style = buildDetailMapStyle(withRoads, PMTILES_URL, GLYPHS_URL);
    const byId = Object.fromEntries(style.layers.map((layer) => [layer.id, layer]));
    const placeLayer = byId[PLACE_LABELS_LAYER_ID];
    const hamletLayer = byId[HAMLET_LABELS_LAYER_ID];
    expect('minzoom' in placeLayer && placeLayer.minzoom).toBe(8);
    expect('minzoom' in hamletLayer && hamletLayer.minzoom).toBe(13);
  });
});
