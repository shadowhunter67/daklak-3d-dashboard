import { describe, expect, it } from 'vitest';
import {
  camerasApproximatelyEqual,
  clampBearing,
  clampLatitude,
  clampLongitude,
  clampPitch,
  clampZoom,
  layerStatesEqual,
  parseDetailMapCamera,
  parseDetailMapLayers,
  serializeDetailMapParams,
} from './detailMapUrl';
import { DEFAULT_DETAIL_MAP_CAMERA, DEFAULT_DETAIL_MAP_LAYER_STATE } from './detailMapTypes';

describe('clamp helpers', () => {
  it('clamps latitude to [-90, 90]', () => {
    expect(clampLatitude(200)).toBe(90);
    expect(clampLatitude(-200)).toBe(-90);
    expect(clampLatitude(12.5)).toBe(12.5);
    expect(clampLatitude(Number.NaN)).toBe(DEFAULT_DETAIL_MAP_CAMERA.latitude);
  });

  it('clamps longitude to [-180, 180]', () => {
    expect(clampLongitude(200)).toBe(180);
    expect(clampLongitude(-200)).toBe(-180);
  });

  it('clamps zoom to [0, 22]', () => {
    expect(clampZoom(30)).toBe(22);
    expect(clampZoom(-5)).toBe(0);
  });

  it('wraps bearing into [0, 360)', () => {
    expect(clampBearing(370)).toBe(10);
    expect(clampBearing(-10)).toBe(350);
    expect(clampBearing(180)).toBe(180);
  });

  it('clamps pitch to [0, 85]', () => {
    expect(clampPitch(100)).toBe(85);
    expect(clampPitch(-5)).toBe(0);
  });
});

describe('parseDetailMapCamera', () => {
  it('falls back to the default camera for an empty search string', () => {
    expect(parseDetailMapCamera('')).toEqual(DEFAULT_DETAIL_MAP_CAMERA);
  });

  it('parses and clamps a valid camera', () => {
    expect(
      parseDetailMapCamera('?lat=12.9&lng=108.2&zoom=14.4&bearing=45&pitch=30'),
    ).toEqual({ latitude: 12.9, longitude: 108.2, zoom: 14.4, bearing: 45, pitch: 30 });
  });

  it('normalizes out-of-range and non-numeric values instead of crashing', () => {
    const camera = parseDetailMapCamera('?lat=999&lng=abc&zoom=-5&bearing=720&pitch=1000');
    expect(camera.latitude).toBe(90);
    expect(camera.longitude).toBe(DEFAULT_DETAIL_MAP_CAMERA.longitude);
    expect(camera.zoom).toBe(0);
    expect(camera.bearing).toBe(0);
    expect(camera.pitch).toBe(85);
  });

  it('ignores unknown query params without crashing', () => {
    expect(() => parseDetailMapCamera('?foo=bar&lat=12&unknown=1')).not.toThrow();
  });
});

describe('parseDetailMapLayers', () => {
  it('falls back to defaults for an empty search string', () => {
    expect(parseDetailMapLayers('')).toEqual(DEFAULT_DETAIL_MAP_LAYER_STATE);
  });

  it('parses an explicit layer state', () => {
    const layers = parseDetailMapLayers(
      '?basemap=terrain&roads=0&labels=1&boundaries=0&metrics=1&heatmap=1',
    );
    expect(layers.baseMap).toBe('terrain');
    expect(layers.roadsVisible).toBe(false);
    expect(layers.roadLabelsVisible).toBe(true);
    expect(layers.placeLabelsVisible).toBe(true);
    expect(layers.administrativeBoundariesVisible).toBe(false);
    expect(layers.dashboardMetricsVisible).toBe(true);
    expect(layers.heatmapVisible).toBe(true);
    expect(layers.terrainVisible).toBe(true);
    expect(layers.satelliteVisible).toBe(false);
  });

  it('normalizes an invalid basemap to the default', () => {
    expect(parseDetailMapLayers('?basemap=google-satellite').baseMap).toBe('default');
  });
});

describe('serializeDetailMapParams', () => {
  it('round-trips through parse', () => {
    const camera = { latitude: 12.9, longitude: 108.2, zoom: 14.4, bearing: 45, pitch: 30 };
    const layers = {
      ...DEFAULT_DETAIL_MAP_LAYER_STATE,
      baseMap: 'terrain' as const,
      roadsVisible: false,
    };
    const search = `?${serializeDetailMapParams(camera, layers).toString()}`;
    expect(parseDetailMapCamera(search)).toEqual(camera);
    expect(parseDetailMapLayers(search).baseMap).toBe('terrain');
    expect(parseDetailMapLayers(search).roadsVisible).toBe(false);
  });
});

describe('camerasApproximatelyEqual', () => {
  it('treats sub-epsilon floating point drift as equal', () => {
    const a = DEFAULT_DETAIL_MAP_CAMERA;
    const b = { ...a, latitude: a.latitude + 1e-9 };
    expect(camerasApproximatelyEqual(a, b)).toBe(true);
  });

  it('treats a real camera move as different', () => {
    const a = DEFAULT_DETAIL_MAP_CAMERA;
    const b = { ...a, zoom: a.zoom + 1 };
    expect(camerasApproximatelyEqual(a, b)).toBe(false);
  });
});

describe('layerStatesEqual', () => {
  it('detects no difference', () => {
    expect(layerStatesEqual(DEFAULT_DETAIL_MAP_LAYER_STATE, DEFAULT_DETAIL_MAP_LAYER_STATE)).toBe(
      true,
    );
  });

  it('detects a toggle difference', () => {
    expect(
      layerStatesEqual(DEFAULT_DETAIL_MAP_LAYER_STATE, {
        ...DEFAULT_DETAIL_MAP_LAYER_STATE,
        heatmapVisible: true,
      }),
    ).toBe(false);
  });
});
