import { describe, expect, it } from 'vitest';
import { formatNumber, geometryToShapes } from './geo';
describe('GIS utilities', () => {
  it('turns a polygon into one Three shape', () => {
    expect(
      geometryToShapes({
        type: 'Polygon',
        coordinates: [
          [
            [108, 12],
            [109, 12],
            [109, 13],
            [108, 12],
          ],
        ],
      }),
    ).toHaveLength(1);
  });
  it('formats vi-VN numbers', () => expect(formatNumber(102)).toBe('102'));
  it('extracts polygon surfaces from a mixed geometry collection', () => {
    expect(
      geometryToShapes({
        type: 'GeometryCollection',
        geometries: [
          {
            type: 'Polygon',
            coordinates: [
              [
                [108, 12],
                [109, 12],
                [109, 13],
                [108, 12],
              ],
            ],
          },
          {
            type: 'LineString',
            coordinates: [
              [108, 12],
              [109, 13],
            ],
          },
        ],
      }),
    ).toHaveLength(1);
  });
});
