import type { Feature, Geometry } from 'geojson';
import { describe, expect, it, vi } from 'vitest';
import type { WardProperties } from '../../types/map';
import { codeFromUv } from './terrainHitTest';

const config = {
  northWest: [0, 10] as [number, number],
  southEast: [10, 0] as [number, number],
  width: 10,
  height: 10,
};

function fakeFeature(code: string): Feature<Geometry, WardProperties> {
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [0, 0] },
    properties: { code, name: code, type: 'xa', provinceCode: '66', areaKm2: 1 },
  };
}

describe('codeFromUv', () => {
  it('returns null when there is no uv coordinate', () => {
    const featureAt = vi.fn();
    expect(codeFromUv(undefined, { invert: () => [0, 0] }, config, featureAt)).toBeNull();
    expect(featureAt).not.toHaveBeenCalled();
  });

  it('returns null when the projection has no invert function', () => {
    const featureAt = vi.fn();
    expect(codeFromUv({ x: 0.5, y: 0.5 }, {}, config, featureAt)).toBeNull();
    expect(featureAt).not.toHaveBeenCalled();
  });

  it('returns null when invert cannot resolve a coordinate', () => {
    const featureAt = vi.fn();
    const projection = { invert: () => null };
    expect(codeFromUv({ x: 0.5, y: 0.5 }, projection, config, featureAt)).toBeNull();
    expect(featureAt).not.toHaveBeenCalled();
  });

  it('maps uv into projected space before inverting', () => {
    const invert = vi.fn().mockReturnValue([108, 12]);
    const projection = { invert };
    const featureAt = vi.fn().mockReturnValue(fakeFeature('24580'));
    const code = codeFromUv({ x: 0.5, y: 0.5 }, projection, config, featureAt);
    expect(invert).toHaveBeenCalledWith([5, -5]);
    expect(featureAt).toHaveBeenCalledWith([108, 12]);
    expect(code).toBe('24580');
  });

  it('returns null when no feature is found at the resolved coordinate', () => {
    const projection = { invert: () => [108, 12] as [number, number] };
    const featureAt = vi.fn().mockReturnValue(undefined);
    expect(codeFromUv({ x: 0.5, y: 0.5 }, projection, config, featureAt)).toBeNull();
  });
});
