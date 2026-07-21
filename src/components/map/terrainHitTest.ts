import type { Feature, Geometry } from 'geojson';
import type { WardProperties } from '../../types/map';

interface TerrainProjection {
  invert?: (point: [number, number]) => [number, number] | null;
}

interface TerrainHitTestConfig {
  northWest: [number, number];
  southEast: [number, number];
  width: number;
  height: number;
}

export function codeFromUv(
  uv: { x: number; y: number } | undefined,
  projection: TerrainProjection,
  config: TerrainHitTestConfig,
  featureAt: (point: [number, number]) => Feature<Geometry, WardProperties> | undefined,
): string | null {
  if (!uv || !projection.invert) return null;
  const projectedX = config.northWest[0] + uv.x * config.width;
  const projectedY = config.southEast[1] - uv.y * config.height;
  const coordinate = projection.invert([projectedX, projectedY]);
  return coordinate ? (featureAt(coordinate)?.properties.code ?? null) : null;
}
