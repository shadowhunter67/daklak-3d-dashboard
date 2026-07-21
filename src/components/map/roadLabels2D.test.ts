import type { GeoProjection } from 'd3-geo';
import { describe, expect, it } from 'vitest';
import type { RoadCollection } from '../../data/loadRoads';
import { buildRoadLabels2D, projectedLine } from './roadLabels2D';

const identityProjection = ((position: [number, number]) => position) as GeoProjection;

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

describe('projectedLine', () => {
  it('sums the euclidean length between projected points', () => {
    const result = projectedLine(
      [
        [0, 0],
        [3, 4],
      ],
      identityProjection,
    );
    expect(result.length).toBe(5);
    expect(result.points).toEqual([
      [0, 0],
      [3, 4],
    ]);
  });
});

describe('buildRoadLabels2D', () => {
  const roads: RoadCollection = {
    type: 'FeatureCollection',
    features: [
      road('n1', 'national', 'Quốc lộ 26', [
        [0, 0],
        [100, 0],
      ]),
      road('d1', 'district', 'Đường huyện', [
        [0, 0],
        [50, 0],
      ]),
    ],
  };

  it('excludes district roads and unnamed roads', () => {
    const labels = buildRoadLabels2D(roads, [], identityProjection, true, false);
    expect(labels.map((label) => label.text)).toEqual(['Quốc lộ 26']);
  });

  it('drops a label that sits too close to an administrative label when labels are visible', () => {
    // buildRoadLabels2D picks points[floor(length/2)] as the representative point, which for a
    // 2-point line is the line's end coordinate rather than its true midpoint.
    const nearAdministrativePoint: [number, number] = [100, 0];
    const labels = buildRoadLabels2D(
      roads,
      [nearAdministrativePoint],
      identityProjection,
      true,
      false,
    );
    expect(labels).toHaveLength(0);
  });

  it('keeps labels near administrative points when labels are hidden', () => {
    const nearAdministrativePoint: [number, number] = [100, 0];
    const labels = buildRoadLabels2D(
      roads,
      [nearAdministrativePoint],
      identityProjection,
      false,
      false,
    );
    expect(labels.map((label) => label.text)).toEqual(['Quốc lộ 26']);
  });

  it('picks the point from the longest segment for a repeated road name', () => {
    const multiSegmentRoads: RoadCollection = {
      type: 'FeatureCollection',
      features: [
        road('n1', 'national', 'QL 27', [
          [0, 0],
          [10, 0],
        ]),
        road('n2', 'national', 'QL 27', [
          [200, 200],
          [400, 200],
        ]),
      ],
    };
    const labels = buildRoadLabels2D(multiSegmentRoads, [], identityProjection, true, false);
    expect(labels).toHaveLength(1);
    expect(labels[0].point).toEqual([400, 200]);
  });
});
