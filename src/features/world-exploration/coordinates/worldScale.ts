import { displacementScale, terrainMetadata } from '../../../components/map/terrainConfig';
import { haversineDistanceMeters, latLonToWorld, worldToLatLon } from './worldCoordinates';

/**
 * Single source of truth for meters <-> world-unit conversion — see
 * `reports/tourism-digital-twin/world-scale-lod-adr.md` for why this exists (a real bug: building
 * height was tuned independently of every other size/speed constant in this scene, and the
 * mismatch produced a spike visible from the province overview camera, fixed ad hoc in PR #105).
 *
 * Every new "real-world size" constant added to world-exploration (player eye height, movement
 * speed, building/tree height, camera altitude bands, ...) must go through `metersToWorld`/
 * `worldToMeters` — never invent an independent per-feature ratio again.
 *
 * `METERS_PER_WORLD_UNIT_HORIZONTAL` is derived, not hardcoded: measured at the province bbox's
 * center latitude by moving exactly 1 world-unit east via `latLonToWorld`/`worldToLatLon` and
 * measuring the real distance with `haversineDistanceMeters` (already used for HUD distance
 * display — same "honest real-world meters" contract, see that function's own doc comment). If
 * `utils/geo.ts`'s projection scale ever changes, this recomputes automatically instead of silently
 * drifting from a stale constant.
 */
const bboxCenterLon = (terrainMetadata.bbox[0] + terrainMetadata.bbox[2]) / 2;
const bboxCenterLat = (terrainMetadata.bbox[1] + terrainMetadata.bbox[3]) / 2;
const centerWorld = latLonToWorld(bboxCenterLon, bboxCenterLat);
const eastOfCenter = worldToLatLon(centerWorld.x + 1, centerWorld.z);

export const METERS_PER_WORLD_UNIT_HORIZONTAL = haversineDistanceMeters(
  [bboxCenterLon, bboxCenterLat],
  eastOfCenter,
);

/**
 * How many real meters of elevation one world-unit of terrain *height* (`TerrainSampler.getHeight`,
 * `displacementScale`) represents — derived from the same `elevationMinMeters`/`elevationMaxMeters`
 * clip bounds `terrainHeightSampler.ts` already uses to reconstruct real elevation, divided by
 * `displacementScale` (both linear in the same normalized 0..1 grayscale value, so this ratio is
 * exact, not approximate).
 */
export const METERS_PER_WORLD_UNIT_VERTICAL =
  (terrainMetadata.elevationMaxMeters - terrainMetadata.elevationMinMeters) / displacementScale;

/**
 * How much more exaggerated the terrain's vertical scale is than the true horizontal scale —
 * documented, not fought: see `world-scale-lod-adr.md`'s Question 2 for why objects (buildings,
 * player, trees) deliberately do NOT use this factor and instead convert via the horizontal ratio
 * (true 1:1 scale), while the terrain mesh itself keeps it.
 */
export const VERTICAL_EXAGGERATION =
  METERS_PER_WORLD_UNIT_HORIZONTAL / METERS_PER_WORLD_UNIT_VERTICAL;

/** Converts a true real-world size/distance (meters) to world-units, using the horizontal
 * (true-scale) ratio — this is what every object placed in the scene should use for its own size,
 * never `METERS_PER_WORLD_UNIT_VERTICAL`. */
export function metersToWorld(meters: number): number {
  return meters / METERS_PER_WORLD_UNIT_HORIZONTAL;
}

/** Inverse of `metersToWorld`. */
export function worldToMeters(worldUnits: number): number {
  return worldUnits * METERS_PER_WORLD_UNIT_HORIZONTAL;
}
