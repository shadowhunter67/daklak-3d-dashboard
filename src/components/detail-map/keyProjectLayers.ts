import type {
  ExpressionSpecification,
  GeoJSONSourceSpecification,
  LayerSpecification,
} from 'maplibre-gl';
import { KEY_PROJECTS, KEY_PROJECT_STATUS_COLOR } from './keyProjects';

/**
 * Map layers for the `keyProjects.ts` reference layer: corridor lines, project points, and point
 * labels. All bundled — no env/network dependency, like the ward boundaries. Colour encodes
 * status (`KEY_PROJECT_STATUS_COLOR`). Off by default; `MapLibreProvider.setKeyProjectsVisible`
 * toggles all three layers together and wires the click → popup.
 *
 * Draw slot: above every other layer (labels included) — this is a focused reference overlay the
 * user explicitly turns on, so it should never be occluded.
 */
export const KEY_PROJECTS_SOURCE_ID = 'key-projects';
export const KEY_PROJECTS_LINE_LAYER_ID = 'key-projects-line';
export const KEY_PROJECTS_POINT_LAYER_ID = 'key-projects-point';
export const KEY_PROJECTS_LABEL_LAYER_ID = 'key-projects-label';

const STATUS_COLOR_EXPRESSION: ExpressionSpecification = [
  'match',
  ['get', 'status'],
  'chuan-bi',
  KEY_PROJECT_STATUS_COLOR['chuan-bi'],
  'sap-khoi-cong',
  KEY_PROJECT_STATUS_COLOR['sap-khoi-cong'],
  'dang-thi-cong',
  KEY_PROJECT_STATUS_COLOR['dang-thi-cong'],
  'hoan-thanh',
  KEY_PROJECT_STATUS_COLOR['hoan-thanh'],
  '#c9c9c9',
];

export function buildKeyProjectsSource(): GeoJSONSourceSpecification {
  return { type: 'geojson', data: KEY_PROJECTS };
}

export function buildKeyProjectsLayers(withLabels: boolean): LayerSpecification[] {
  const layers: LayerSpecification[] = [
    {
      id: KEY_PROJECTS_LINE_LAYER_ID,
      type: 'line',
      source: KEY_PROJECTS_SOURCE_ID,
      filter: ['==', ['geometry-type'], 'LineString'],
      layout: { 'line-cap': 'round', 'line-join': 'round', visibility: 'none' },
      paint: {
        'line-color': STATUS_COLOR_EXPRESSION,
        'line-width': ['interpolate', ['linear'], ['zoom'], 7, 2, 12, 4.5],
        'line-opacity': 0.9,
        'line-dasharray': [2, 1.4],
      },
    },
    {
      id: KEY_PROJECTS_POINT_LAYER_ID,
      type: 'circle',
      source: KEY_PROJECTS_SOURCE_ID,
      filter: ['==', ['geometry-type'], 'Point'],
      layout: { visibility: 'none' },
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 7, 4.5, 12, 8],
        'circle-color': STATUS_COLOR_EXPRESSION,
        'circle-stroke-color': '#0b1f1c',
        'circle-stroke-width': 1.5,
      },
    },
  ];

  if (withLabels) {
    layers.push({
      id: KEY_PROJECTS_LABEL_LAYER_ID,
      type: 'symbol',
      source: KEY_PROJECTS_SOURCE_ID,
      minzoom: 8.5,
      layout: {
        visibility: 'none',
        'text-field': ['get', 'name'],
        'text-font': ['Noto Sans Regular'],
        'text-size': 11,
        'text-anchor': 'top',
        'text-offset': [0, 0.9],
        'text-max-width': 9,
        // point placement for every feature — for a corridor LineString MapLibre anchors one
        // label near its middle, which is fine for this sparse reference layer.
      },
      paint: {
        'text-color': '#f4ead2',
        'text-halo-color': '#0b1f1c',
        'text-halo-width': 1.6,
      },
    });
  }

  return layers;
}

export const KEY_PROJECT_LAYER_IDS = [
  KEY_PROJECTS_LINE_LAYER_ID,
  KEY_PROJECTS_POINT_LAYER_ID,
  KEY_PROJECTS_LABEL_LAYER_ID,
];
