import { verifiedTourismDestinations } from '../../../entities/tourism/verifiedTourismDestinations';
import type { TourismDestination } from '../../../entities/tourism/types';
import { latLonToWorld, worldDistance, type WorldXZ } from '../coordinates/worldCoordinates';

/**
 * Runtime adapter over Phase T2's `TourismDestination` domain data — NOT a second, forked POI
 * schema. `verifiedTourismDestinations.ts` is the one real, sourced dataset in this repo (4
 * entries, each with a cited `sourceUrl` — see its own doc comment for why no more may be added
 * without an equivalent source); this module only adds the runtime-only fields player/tour code
 * needs (a precomputed world-space position) on top of it, once, at module load.
 *
 * There is deliberately no separate `nameEn`/`descriptionEn` here: the source dataset has none
 * (only Vietnamese names/descriptions were ever verified), and fabricating an English translation
 * would violate the "no invented data" rule this whole domain is built on (see
 * `verifiedTourismDestinations.ts`). The English UI shows the same Vietnamese text with a short,
 * honest caption — see `WorldPoiPanel.tsx` / `worldExploration.poi.descriptionViOnly`.
 */
export interface WorldPoi extends TourismDestination {
  world: WorldXZ;
}

function toWorldPoi(destination: TourismDestination): WorldPoi {
  const [longitude, latitude] = destination.coordinates;
  return { ...destination, world: latLonToWorld(longitude, latitude) };
}

/** Precomputed once at module load — `verifiedTourismDestinations` is a small (4-entry), static,
 * committed dataset, not something that changes at runtime. */
export const worldPois: WorldPoi[] = verifiedTourismDestinations.map(toWorldPoi);

/** World-unit radius within which a POI is considered "nearby" for the HUD/E-interact prompt.
 * `2.4` matches `WorldFlyInCamera.tsx`'s settled orbit radius order of magnitude — this scene's
 * whole "human scale" (player eye height ~0.4, see `worldExplorationStore.ts`'s initial pose) is
 * tiny relative to the province-spanning terrain, so a POI is "nearby" well before the player is
 * visually on top of its marker. */
export const POI_PROXIMITY_RADIUS = 0.6;

export interface NearestPoiResult {
  poi: WorldPoi;
  distance: number;
}

/** Returns the single closest POI to `position`, or `null` if the list is empty — never "closest
 * among an arbitrary radius", callers compare `distance` against `POI_PROXIMITY_RADIUS`
 * themselves (HUD wants to show "62m to Hồ Lắk" even when far away, not just a boolean). */
export function findNearestPoi(
  position: WorldXZ,
  pois: readonly WorldPoi[] = worldPois,
): NearestPoiResult | null {
  let best: NearestPoiResult | null = null;
  for (const poi of pois) {
    const distance = worldDistance(position, poi.world);
    if (!best || distance < best.distance) best = { poi, distance };
  }
  return best;
}

export function getWorldPoiById(id: string): WorldPoi | undefined {
  return worldPois.find((poi) => poi.id === id);
}
