import type { Position } from 'geojson';
import { latLonToWorld } from '../coordinates/worldCoordinates';
import { metersToWorld } from '../coordinates/worldScale';
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
/**
 * Kerb-height clearance above the *visible* ground surface (ADR Q1 —
 * `reports/tourism-digital-twin/world-scale-lod-adr.md`, PR4/9), expressed in real meters via
 * `metersToWorld` — the last ad-hoc world-unit constant in this feature. The previous value,
 * `0.01` world-units, was not a road property at all: it was ~80m of terrain-vertical, a hand-tuned
 * fudge covering the gap between the raw height texture and the coarser mesh the GPU actually
 * rasterizes (see `terrain/terrainMeshSurface.ts`). That gap is fixed at the source now (PR4/9), so
 * this can finally mean what it says: a real kerb height above ground the player can see.
 */
export const ROAD_GROUND_LIFT_METERS = 0.25;
export const ROAD_GROUND_LIFT = metersToWorld(ROAD_GROUND_LIFT_METERS);

/** Fallback local-Z (world-space Y after rotation) used while the shared terrain sampler is still
 * loading, or for the rare vertex outside the terrain data's real bbox — a modest constant near
 * the ground rather than `0`, so an unanchored road segment does not visibly clip through terrain
 * that sits below sea-level-normalized `0`. Deliberately NOT routed through `metersToWorld`, same
 * reasoning as `player/movement/playerMovement.ts`'s `FALLBACK_GROUND_HEIGHT`: this stands in for
 * the terrain sampler's own (exaggerated-vertical) output while it is still loading, not for an
 * object's real-world size — `metersToWorld` would be the wrong tool for it. */
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
