import { verifiedTourismDestinations } from '../../../entities/tourism/verifiedTourismDestinations';
import { latLonToWorld } from '../coordinates/worldCoordinates';
import { useTerrainSampler } from '../terrain/useTerrainSampler';

/**
 * Phase T4 (reports/tourism-digital-twin/) — a modest, explicitly illustrative water surface at
 * Hồ Lắk's real, sourced coordinates (`verifiedTourismDestinations.ts`, id `'ho-lak'` — read from
 * that dataset rather than duplicated here, so this can never drift from the verified location).
 *
 * **What this is NOT**: a real lake-shoreline polygon. No sourced GIS boundary/shoreline geometry
 * for Hồ Lắk exists anywhere in this repo (unlike the road/terrain/destination data, which all
 * cite a real source) — drawing one here would be exactly the kind of fabricated geographic data
 * every prior phase's "no fabricated data" rule forbids. This is a small, flat, semi-transparent
 * disc centered on the real point location, sized arbitrarily for visual legibility at this
 * scene's scale (not derived from the real ~6.2 km² surface area cited in
 * `verifiedTourismDestinations.ts`'s description — converting a real area into this Mercator
 * -projected scene's local units would imply a shoreline precision this component does not have)
 * — illustrative styling only, consistent with `WorldExplorationView.tsx`'s existing
 * "ILLUSTRATIVE — KỊCH BẢN MINH HỌA" badge, not a claim about the lake's real shape or extent.
 */
const HO_LAK = verifiedTourismDestinations.find((destination) => destination.id === 'ho-lak')!;

const WATER_RADIUS = 0.9;
const WATER_LIFT_ABOVE_GROUND = 0.01;

export function WorldWaterPlane() {
  const sampler = useTerrainSampler();
  const { x, z } = latLonToWorld(HO_LAK.coordinates[0], HO_LAK.coordinates[1]);
  const groundHeight = sampler?.getHeight(x, z);
  if (groundHeight === null || groundHeight === undefined) return null;

  // Same local pre-rotation frame every other object placed directly in `WorldScene.tsx`'s
  // rotated `<group>` uses (see `WorldDestinationMarkers.tsx` / `coordinates/worldCoordinates.ts`
  // for the `(x, y, z) -> (x, z, -y)` derivation this mirrors): local `(x, -z, height)` lands at
  // world `(x, height, z)`. A `circleGeometry`'s default local +Z-facing normal maps, under that
  // same rotation, to world +Y — already horizontal, no extra per-mesh rotation needed.
  return (
    <mesh position={[x, -z, groundHeight + WATER_LIFT_ABOVE_GROUND]} raycast={() => null}>
      <circleGeometry args={[WATER_RADIUS, 48]} />
      <meshStandardMaterial
        color="#1c6f8a"
        transparent
        opacity={0.72}
        roughness={0.15}
        metalness={0.05}
      />
    </mesh>
  );
}
