import type { Position } from 'geojson';
import { latLonToWorld } from '../coordinates/worldCoordinates';
import type { TerrainSampler } from '../terrain/terrainHeightSampler';

/**
 * Phase T4 (reports/tourism-digital-twin/) — projects one road-line vertex (a real `[lon, lat]`
 * pair from `src/data/loadRoads.ts`'s already-shipped `daklak-roads.json.gz`, the same dataset
 * `src/components/map/RoadLayer3D.tsx` renders for the `3d` view) into this scene's coordinate
 * frame, ground-anchored to the shared CPU terrain sampler — same idea as
 * `poi/destinationElevation.ts`'s marker anchoring, and the same "reuse the data, not the
 * component" pattern `WorldTerrainMesh.tsx` already set for the terrain textures: this module
 * reuses `src/components/map/roadLabels3D.ts`'s pure, already-tested `buildRoadGeometryBuckets`
 * (only supplying it a different `toPoint` projector, ground-anchored to *this* scene's terrain
 * sampler instead of `RoadLayer3D.tsx`'s own separate height-pixel decode) — not a re-implemented
 * road renderer.
 *
 * Returned as a local pre-rotation `[x, -z, y]` triple, matching every other object placed
 * directly in `WorldScene.tsx`'s rotated `<group>` (see `WorldDestinationMarkers.tsx` /
 * `coordinates/worldCoordinates.ts`'s doc comments for the `(x, y, z) -> (x, z, -y)` rotation
 * derivation this mirrors).
 */
export const ROAD_GROUND_LIFT = 0.01;

/** Fallback local-Z (world-space Y after rotation) used while the shared terrain sampler is still
 * loading, or for the rare vertex outside the terrain data's real bbox — a modest constant near
 * the ground rather than `0`, so an unanchored road segment does not visibly clip through terrain
 * that sits below sea-level-normalized `0`. */
export const ROAD_FALLBACK_HEIGHT = 0.06;

export function projectRoadPoint(
  sampler: TerrainSampler | null,
  coordinate: Position,
): [number, number, number] {
  const { x, z } = latLonToWorld(coordinate[0], coordinate[1]);
  const groundHeight = sampler ? sampler.getHeight(x, z) : null;
  const y = groundHeight === null ? ROAD_FALLBACK_HEIGHT : groundHeight + ROAD_GROUND_LIFT;
  return [x, -z, y];
}
