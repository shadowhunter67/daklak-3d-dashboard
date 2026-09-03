import { describe, expect, it } from 'vitest';
import type { Position } from 'geojson';
import { sliceFeatureCollectionLines, sliceLineByRatio } from './lineDrawAnimation';

const LINE: Position[] = [
  [108, 12],
  [108.1, 12],
  [108.2, 12],
];

describe('sliceLineByRatio', () => {
  it('at ratio 0, collapses to a degenerate line at the start point', () => {
    const sliced = sliceLineByRatio([...LINE], 0);
    expect(sliced).toEqual([LINE[0], LINE[0]]);
  });

  it('at ratio 1 (or above), returns the full line unchanged', () => {
    expect(sliceLineByRatio([...LINE], 1)).toEqual(LINE);
    expect(sliceLineByRatio([...LINE], 5)).toEqual(LINE);
  });

  it('at ratio 0.5, stops roughly halfway along total length (straight line, even segments)', () => {
    const sliced = sliceLineByRatio([...LINE], 0.5);
    const last = sliced[sliced.length - 1];
    // Floating-point segment-length math can land the cut a hair before or after the exact
    // midpoint vertex — assert the endpoint is near (108.1, 12), not the precise point count.
    expect(last[0]).toBeCloseTo(108.1, 3);
    expect(last[1]).toBeCloseTo(12, 5);
    expect(sliced.length).toBeGreaterThanOrEqual(2);
    expect(sliced.length).toBeLessThanOrEqual(3);
  });

  it('the total travelled length increases monotonically with ratio', () => {
    const lengthOf = (coords: readonly (readonly number[])[]) => {
      let len = 0;
      for (let i = 1; i < coords.length; i++) {
        len += Math.hypot(coords[i][0] - coords[i - 1][0], coords[i][1] - coords[i - 1][1]);
      }
      return len;
    };
    const steps = [0, 0.25, 0.5, 0.75, 1];
    const lengths = steps.map((r) => lengthOf(sliceLineByRatio([...LINE], r)));
    for (let i = 1; i < lengths.length; i++) {
      expect(lengths[i]).toBeGreaterThanOrEqual(lengths[i - 1] - 1e-9);
    }
  });

  it('a degenerate 1-point or already-degenerate line is returned as-is', () => {
    expect(sliceLineByRatio([[108, 12]], 0.5)).toEqual([[108, 12]]);
  });

  it('a zero-length line (all coincident points) does not divide by zero', () => {
    expect(() =>
      sliceLineByRatio(
        [
          [108, 12],
          [108, 12],
        ],
        0.5,
      ),
    ).not.toThrow();
  });
});

describe('sliceFeatureCollectionLines', () => {
  const collection = {
    type: 'FeatureCollection' as const,
    features: [
      {
        type: 'Feature' as const,
        geometry: { type: 'LineString' as const, coordinates: [...LINE] },
        properties: { id: 'line-1' },
      },
      {
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [108, 12] },
        properties: { id: 'point-1' },
      },
    ],
  };

  it('slices LineString features but leaves Point features untouched', () => {
    const result = sliceFeatureCollectionLines(collection, 0.5);
    const line = result.features.find((f) => f.properties.id === 'line-1')!;
    const point = result.features.find((f) => f.properties.id === 'point-1')!;
    expect(line.geometry.type).toBe('LineString');
    if (line.geometry.type === 'LineString') {
      const lastLng = line.geometry.coordinates[line.geometry.coordinates.length - 1][0];
      expect(lastLng).toBeLessThanOrEqual(LINE[LINE.length - 1][0]);
      expect(lastLng).toBeCloseTo(108.1, 3);
    }
    expect(point.geometry).toEqual(collection.features[1].geometry);
  });

  it('at ratio 1, every feature is unchanged', () => {
    expect(sliceFeatureCollectionLines(collection, 1)).toEqual(collection);
  });
});
