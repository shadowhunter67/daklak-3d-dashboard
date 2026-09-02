import { describe, expect, it } from 'vitest';
import {
  buildKeyProjectsLayers,
  buildKeyProjectsSource,
  KEY_PROJECTS_LABEL_LAYER_ID,
  KEY_PROJECTS_LINE_LAYER_ID,
  KEY_PROJECTS_POINT_LAYER_ID,
  KEY_PROJECTS_SOURCE_ID,
} from './keyProjectLayers';
import { KEY_PROJECT_STATUS_COLOR } from './keyProjects';

describe('keyProjectLayers', () => {
  it('the source is the bundled key-projects FeatureCollection', () => {
    const source = buildKeyProjectsSource();
    expect(source.type).toBe('geojson');
    expect((source.data as GeoJSON.FeatureCollection).type).toBe('FeatureCollection');
  });

  it('without glyphs: line + point layers only, both hidden, on the key-projects source', () => {
    const layers = buildKeyProjectsLayers(false);
    expect(layers.map((l) => l.id)).toEqual([
      KEY_PROJECTS_LINE_LAYER_ID,
      KEY_PROJECTS_POINT_LAYER_ID,
    ]);
    for (const layer of layers) {
      expect('source' in layer && layer.source).toBe(KEY_PROJECTS_SOURCE_ID);
      expect(layer.layout && 'visibility' in layer.layout && layer.layout.visibility).toBe('none');
    }
  });

  it('with glyphs: adds a hidden label layer', () => {
    const layers = buildKeyProjectsLayers(true);
    expect(layers.map((l) => l.id)).toContain(KEY_PROJECTS_LABEL_LAYER_ID);
  });

  it('point/line colour is a status match containing every status colour', () => {
    const [line, point] = buildKeyProjectsLayers(false);
    const lineColor = JSON.stringify(line.type === 'line' && line.paint?.['line-color']);
    const pointColor = JSON.stringify(point.type === 'circle' && point.paint?.['circle-color']);
    for (const color of Object.values(KEY_PROJECT_STATUS_COLOR)) {
      expect(lineColor).toContain(color);
      expect(pointColor).toContain(color);
    }
  });

  it('the line layer only takes LineString features, the point layer only Points', () => {
    const [line, point] = buildKeyProjectsLayers(false);
    if (line.type === 'line') expect(line.filter).toEqual(['==', ['geometry-type'], 'LineString']);
    if (point.type === 'circle') {
      expect(point.filter).toEqual(['==', ['geometry-type'], 'Point']);
    }
  });
});
