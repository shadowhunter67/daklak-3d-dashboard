import type { Geometry, Position } from 'geojson';
import { describe, expect, it } from 'vitest';
import { drawGeometryPath } from './geometryPath';

function fakeContext() {
  const calls: Array<['moveTo' | 'lineTo', number, number] | ['closePath']> = [];
  return {
    calls,
    context: {
      moveTo: (x: number, y: number) => calls.push(['moveTo', x, y]),
      lineTo: (x: number, y: number) => calls.push(['lineTo', x, y]),
      closePath: () => calls.push(['closePath']),
    } as unknown as CanvasRenderingContext2D,
  };
}

const identityProject = ([x, y]: Position): [number, number] => [x, y];

describe('drawGeometryPath', () => {
  it('draws a single ring as moveTo followed by lineTo and closePath', () => {
    const polygon: Geometry = {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 0],
        ],
      ],
    };
    const { calls, context } = fakeContext();
    drawGeometryPath(context, polygon, identityProject);
    expect(calls).toEqual([
      ['moveTo', 0, 0],
      ['lineTo', 1, 0],
      ['lineTo', 1, 1],
      ['lineTo', 0, 0],
      ['closePath'],
    ]);
  });

  it('draws holes as separate rings within the same polygon', () => {
    const polygonWithHole: Geometry = {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [4, 0],
          [4, 4],
          [0, 0],
        ],
        [
          [1, 1],
          [2, 1],
          [2, 2],
          [1, 1],
        ],
      ],
    };
    const { calls, context } = fakeContext();
    drawGeometryPath(context, polygonWithHole, identityProject);
    const moveToCount = calls.filter(([op]) => op === 'moveTo').length;
    const closePathCount = calls.filter(([op]) => op === 'closePath').length;
    expect(moveToCount).toBe(2);
    expect(closePathCount).toBe(2);
  });

  it('draws every polygon inside a MultiPolygon', () => {
    const multiPolygon: Geometry = {
      type: 'MultiPolygon',
      coordinates: [
        [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 0],
          ],
        ],
        [
          [
            [5, 5],
            [6, 5],
            [6, 6],
            [5, 5],
          ],
        ],
      ],
    };
    const { calls, context } = fakeContext();
    drawGeometryPath(context, multiPolygon, identityProject);
    expect(calls.filter(([op]) => op === 'moveTo')).toHaveLength(2);
    expect(calls[0]).toEqual(['moveTo', 0, 0]);
    expect(calls[calls.findIndex(([, x]) => x === 5)]).toEqual(['moveTo', 5, 5]);
  });

  it('recurses into every member of a GeometryCollection', () => {
    const collection: Geometry = {
      type: 'GeometryCollection',
      geometries: [
        {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [1, 0],
              [1, 1],
              [0, 0],
            ],
          ],
        },
      ],
    };
    const { calls, context } = fakeContext();
    drawGeometryPath(context, collection, identityProject);
    expect(calls).toEqual([
      ['moveTo', 0, 0],
      ['lineTo', 1, 0],
      ['lineTo', 1, 1],
      ['lineTo', 0, 0],
      ['closePath'],
    ]);
  });

  it('ignores geometry types that are not polygonal', () => {
    const point: Geometry = { type: 'Point', coordinates: [0, 0] };
    const { calls, context } = fakeContext();
    drawGeometryPath(context, point, identityProject);
    expect(calls).toEqual([]);
  });
});
