import type { Position } from 'geojson';
import { describe, expect, it } from 'vitest';
import type { RoadCollection } from '../../data/loadRoads';
import {
  buildRoadGeometryBuckets,
  buildRoadLabels3D,
  createTerrainPointProjector,
  parts,
} from './roadLabels3D';

const identityProjectFlat = (coordinate: Position): [number, number] => [
  coordinate[0],
  coordinate[1],
];

function road(
  id: string,
  roadClass: 'national' | 'provincial' | 'district',
  name: string,
  coordinates: [number, number][],
): RoadCollection['features'][number] {
  return {
    type: 'Feature',
    geometry: { type: 'LineString', coordinates },
    properties: { id, roadClass, name, reference: null, sourceId: id },
  };
}

describe('parts', () => {
  it('wraps a LineString into a single-element list', () => {
    expect(parts({ type: 'LineString', coordinates: [[0, 0]] })).toEqual([[[0, 0]]]);
  });
  it('passes MultiLineString coordinates through unchanged', () => {
    const coordinates = [[[0, 0]], [[1, 1]]];
    expect(parts({ type: 'MultiLineString', coordinates })).toBe(coordinates);
  });
});

describe('createTerrainPointProjector', () => {
  const config = {
    width: 4,
    height: 4,
    northWest: [0, 4] as [number, number],
    terrainWidth: 4,
    terrainHeight: 4,
    displacementBias: 0.1,
    displacementScale: 0.5,
  };

  it('samples elevation from the height pixel buffer at the projected pixel', () => {
    // 4x4 RGBA buffer where every pixel's red channel encodes its column index * 60.
    const pixels = new Uint8ClampedArray(4 * 4 * 4);
    for (let y = 0; y < 4; y += 1) {
      for (let x = 0; x < 4; x += 1) {
        pixels[(y * 4 + x) * 4] = x * 60;
      }
    }
    const toPoint = createTerrainPointProjector(pixels, config, identityProjectFlat);
    const [x, y, z] = toPoint([2, 4]);
    expect(x).toBe(2);
    expect(y).toBe(-4);
    // column 2 -> red 120 -> elevation 120/255
    expect(z).toBeCloseTo(0.1 + (120 / 255) * 0.5 + 0.008, 5);
  });

  it('clamps out-of-range coordinates to the edge pixel instead of throwing', () => {
    const pixels = new Uint8ClampedArray(4 * 4 * 4);
    const toPoint = createTerrainPointProjector(pixels, config, identityProjectFlat);
    expect(() => toPoint([-50, 50])).not.toThrow();
  });
});

describe('buildRoadGeometryBuckets', () => {
  it('groups projected line segment pairs by road class', () => {
    const roads: RoadCollection = {
      type: 'FeatureCollection',
      features: [
        road('n1', 'national', 'QL 1', [
          [0, 0],
          [1, 0],
          [2, 0],
        ]),
        road('p1', 'provincial', 'TL 2', [
          [5, 5],
          [6, 5],
        ]),
      ],
    };
    const toPoint = (coordinate: Position): [number, number, number] => [
      coordinate[0],
      coordinate[1],
      0,
    ];
    const buckets = buildRoadGeometryBuckets(roads, toPoint);
    // 3-point line -> 2 segments -> 4 points -> 12 numbers
    expect(buckets.national).toHaveLength(12);
    expect(buckets.provincial).toHaveLength(6);
    expect(buckets.district).toHaveLength(0);
  });
});

describe('buildRoadLabels3D', () => {
  const toPoint = (coordinate: Position): [number, number, number] => [
    coordinate[0],
    coordinate[1],
    0,
  ];

  it('excludes district roads and unnamed roads', () => {
    const roads: RoadCollection = {
      type: 'FeatureCollection',
      features: [
        road('n1', 'national', 'QL 26', [
          [0, 0],
          [10, 0],
        ]),
        road('d1', 'district', 'Đường xã', [
          [0, 0],
          [5, 0],
        ]),
      ],
    };
    const labels = buildRoadLabels3D(roads, [], identityProjectFlat, toPoint, true);
    expect(labels.map((label) => label.text)).toEqual(['QL 26']);
  });

  it('always keeps national roads even when close to an administrative point', () => {
    const roads: RoadCollection = {
      type: 'FeatureCollection',
      features: [
        road('n1', 'national', 'QL 26', [
          [0, 0],
          [10, 0],
        ]),
      ],
    };
    const nearPoint: [number, number] = [10, 0];
    const labels = buildRoadLabels3D(roads, [nearPoint], identityProjectFlat, toPoint, true);
    expect(labels).toHaveLength(1);
  });

  it('drops non-national roads within 18 units of an administrative point', () => {
    const roads: RoadCollection = {
      type: 'FeatureCollection',
      features: [
        road('p1', 'provincial', 'TL 8', [
          [0, 0],
          [10, 0],
        ]),
      ],
    };
    const nearPoint: [number, number] = [10, 0];
    const labels = buildRoadLabels3D(roads, [nearPoint], identityProjectFlat, toPoint, true);
    expect(labels).toHaveLength(0);
  });

  it('limits results to 8 when labels are visible and 14 when hidden', () => {
    const roads: RoadCollection = {
      type: 'FeatureCollection',
      features: Array.from({ length: 20 }, (_, index) =>
        road(`p${index}`, 'provincial', `TL ${index}`, [
          [index * 100, 0],
          [index * 100 + 10, 0],
        ]),
      ),
    };
    expect(buildRoadLabels3D(roads, [], identityProjectFlat, toPoint, true)).toHaveLength(8);
    expect(buildRoadLabels3D(roads, [], identityProjectFlat, toPoint, false)).toHaveLength(14);
  });

  it('picks the entry with the higher score for a repeated road name', () => {
    const roads: RoadCollection = {
      type: 'FeatureCollection',
      features: [
        road('p1', 'provincial', 'TL 8', [
          [0, 0],
          [1, 0],
        ]),
        road('n1', 'national', 'TL 8', [
          [50, 50],
          [51, 50],
        ]),
      ],
    };
    const labels = buildRoadLabels3D(roads, [], identityProjectFlat, toPoint, true);
    expect(labels).toHaveLength(1);
    // the national feature scores +10,000 so it wins despite an equally short line
    expect(labels[0].roadClass).toBe('national');
  });
});
