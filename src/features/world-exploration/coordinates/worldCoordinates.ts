import { projection } from '../../../utils/geo';
import { terrainMetadata } from '../../../components/map/terrainConfig';

/**
 * Single shared lon/lat <-> world-space conversion for every world-exploration object (terrain,
 * markers, player, POI, tour waypoints, teleport targets). Nothing else in this feature should
 * call `projection()` directly — see `WorldDestinationMarkers.tsx` (Phase T2) for the transform
 * this factors out and generalizes.
 *
 * Derivation (verified against the scene graph in `WorldScene.tsx`, not guessed):
 * - `WorldScene.tsx` wraps `WorldTerrainMesh`/`WorldDestinationMarkers`/player content in a single
 *   `<group rotation={[-Math.PI / 2, 0, 0]}>`. Rotating a point `(x, y, z)` by -90 degrees about
 *   the X axis maps it to `(x, z, -y)`.
 * - Phase T2's markers already establish the working convention for content placed *directly* in
 *   that group (no extra per-object translation): local pre-rotation position
 *   `(point[0], -point[1], zOffset)` (see `WorldDestinationMarkers.tsx`) becomes, after rotation,
 *   world position `(point[0], zOffset, point[1])`.
 * - So: `worldX = mercatorX`, `worldZ = mercatorY`, and `worldY` is whatever height/offset the
 *   object supplies independently (terrain sampler, fixed marker offset, player eye height, ...).
 *   This holds for any point in this scene, not just markers — the terrain mesh's own `position`
 *   offset (`terrainCenter`) is an unrelated implementation detail of how its geometry vertices are
 *   authored; it does not change where a *given lon/lat* ends up in this shared world frame (see
 *   `terrainHeightSampler.ts`'s doc comment for the corresponding UV derivation, cross-checked
 *   independently from the Python terrain-generation pipeline).
 */
export interface WorldXZ {
  x: number;
  z: number;
}

export function latLonToWorld(longitude: number, latitude: number): WorldXZ {
  const point = projection([longitude, latitude]);
  if (!point) return { x: 0, z: 0 };
  return { x: point[0], z: point[1] };
}

/** Inverse of `latLonToWorld` — d3's Mercator projection exposes `.invert()`. */
export function worldToLatLon(x: number, z: number): [longitude: number, latitude: number] {
  const inverted = projection.invert?.([x, z]);
  return inverted ? [inverted[0], inverted[1]] : [0, 0];
}

/** Great-circle-ish planar distance in world units between two world-space XZ points (the scene
 * is small enough — one province — that flat Euclidean distance in the Mercator-projected plane
 * is an acceptable approximation for "how far is the player from this POI", same tolerance the
 * existing terrain/projection pipeline already accepts — see `world-engine-adr.md`). */
export function worldDistance(a: WorldXZ, b: WorldXZ): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

/** Earth's mean radius in meters (IUGG), used only for `haversineDistanceMeters` — an honest
 * real-world distance for HUD display ("62 m to Hồ Lắk"). Deliberately not derived from the
 * Mercator-projected `worldDistance` above: `projection()` (`utils/geo.ts`) is not equidistant,
 * so a "world units" figure would not be a truthful meters value at any but the smallest scales.
 * `POI_PROXIMITY_RADIUS`/`worldDistance` (gameplay proximity threshold) intentionally keep using
 * world units instead — that only needs internal consistency, not real-world accuracy. */
const EARTH_RADIUS_METERS = 6371000;

export function haversineDistanceMeters(
  [lon1, lat1]: [number, number],
  [lon2, lat2]: [number, number],
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(a)));
}

export interface WorldBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/**
 * World-space extent of the real terrain data (province bbox), derived the same way any other
 * point's world position is derived (`latLonToWorld`) — deliberately NOT from `terrainCenter`/
 * `terrainWidth`/`terrainHeight` in `terrainConfig.ts`, which live in the terrain mesh's own
 * pre-rotation local-vertex space (an unrelated authoring detail, see this module's top doc
 * comment). Used for movement clamping (Fly mode) and teleport/POI validation.
 */
export function getWorldBounds(): WorldBounds {
  const [minLon, minLat, maxLon, maxLat] = terrainMetadata.bbox;
  const nw = latLonToWorld(minLon, maxLat);
  const se = latLonToWorld(maxLon, minLat);
  return {
    minX: Math.min(nw.x, se.x),
    maxX: Math.max(nw.x, se.x),
    minZ: Math.min(nw.z, se.z),
    maxZ: Math.max(nw.z, se.z),
  };
}
