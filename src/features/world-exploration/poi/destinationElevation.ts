import type { TourismDestination } from '../../../entities/tourism/types';
import { latLonToWorld } from '../coordinates/worldCoordinates';
import type { TerrainSampler } from '../terrain/terrainHeightSampler';

/**
 * Phase T4 (reports/tourism-digital-twin/) — ground-anchoring destination markers to real
 * elevation, without touching the intro fly-in camera's path/framing (see
 * `WorldDestinationMarkers.tsx`'s doc comment for why Phase T3 reverted its first attempt at this,
 * and why only this marker-offset function changes now, not the camera).
 *
 * Small lift above the sampled ground so the marker pin renders just above the terrain surface
 * instead of clipping into it — the same idea as Phase T2/T3's fixed `MARKER_Z = 0.5`, now added
 * on top of the destination's real sampled height instead of replacing it with a flat constant.
 */
export const MARKER_GROUND_OFFSET = 0.05;

/**
 * Fallback world-space Y used before the shared terrain sampler has finished loading
 * (`useTerrainSampler()` returns `null` until then), or for the never-expected case of a
 * destination whose coordinates fall outside the terrain data's real bbox (all 4 verified
 * destinations are inside it — see `verifiedTourismDestinations.test.ts`). Matches Phase T2/T3's
 * original flat marker height so a marker is still visible immediately on mount, before the one
 * shared terrain PNG decode (`loadTerrainHeightSampler()`) resolves.
 */
export const MARKER_FALLBACK_HEIGHT = 0.5;

/**
 * Real per-destination marker height: samples the shared CPU terrain sampler
 * (`terrain/terrainHeightSampler.ts`, the same one `PlayerRig.tsx`/`TourRig.tsx` ground-anchor to)
 * at the destination's real lon/lat, in the same world-space Y units as everything else placed in
 * this scene. Falls back to `MARKER_FALLBACK_HEIGHT` while the sampler is still loading or if the
 * destination is (unexpectedly) outside the terrain data extent.
 */
export function getDestinationMarkerHeight(
  sampler: TerrainSampler | null,
  destination: Pick<TourismDestination, 'coordinates'>,
): number {
  if (!sampler) return MARKER_FALLBACK_HEIGHT;
  const { x, z } = latLonToWorld(destination.coordinates[0], destination.coordinates[1]);
  const height = sampler.getHeight(x, z);
  return height === null ? MARKER_FALLBACK_HEIGHT : height + MARKER_GROUND_OFFSET;
}
