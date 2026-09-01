/**
 * Pure altitude-band and camera near/far math — no Three.js objects, no `useFrame`. `ScaleDirector.tsx`
 * calls these every frame with the camera's real altitude above ground (meters) and applies the
 * result to the actual camera. Kept pure so the band/hysteresis/near-far logic is unit-testable
 * without a WebGL context, matching `playerMovement.ts`'s own pure-math convention.
 *
 * See `reports/tourism-digital-twin/world-scale-lod-adr.md`'s Question 3 for why this approach
 * (single frame, dynamic near/far, no floating origin, no multi-camera shells) was chosen.
 */

export type ScaleBand = 'human' | 'local' | 'district' | 'province';

/** Upper altitude bound (meters) for each band, in ascending order — `province` has no upper
 * bound. Roughly: human = standing distance from one building, local = one neighborhood, district
 * = one ward/commune, province = the whole terrain. */
const BAND_ORDER: readonly { id: ScaleBand; maxMeters: number }[] = [
  { id: 'human', maxMeters: 40 },
  { id: 'local', maxMeters: 600 },
  { id: 'district', maxMeters: 8_000 },
  { id: 'province', maxMeters: Infinity },
];

/** Fraction above/below a band boundary the altitude must cross before the band actually changes —
 * prevents flicker (HUD/LOD detail toggling rapidly) when hovering exactly at a threshold. */
const HYSTERESIS_FRACTION = 0.2;

function bandIndexForAltitude(altitudeMeters: number): number {
  const index = BAND_ORDER.findIndex((band) => altitudeMeters <= band.maxMeters);
  return index === -1 ? BAND_ORDER.length - 1 : index;
}

/**
 * Returns the band `altitudeMeters` belongs to, given the previously-committed band —
 * `previousBand` is only changed if the altitude has moved clearly past the relevant threshold
 * (by `HYSTERESIS_FRACTION`), not merely crossed it, so hovering near a boundary doesn't toggle.
 */
export function scaleBandForAltitude(altitudeMeters: number, previousBand: ScaleBand): ScaleBand {
  const previousIndex = BAND_ORDER.findIndex((band) => band.id === previousBand);
  const rawIndex = bandIndexForAltitude(altitudeMeters);
  if (rawIndex === previousIndex) return previousBand;

  if (rawIndex > previousIndex) {
    // Climbing into a higher band — only promote once altitude clearly exceeds the current band's
    // own ceiling, not the instant it pokes past it.
    const ceiling = BAND_ORDER[previousIndex]!.maxMeters;
    return altitudeMeters > ceiling * (1 + HYSTERESIS_FRACTION)
      ? BAND_ORDER[rawIndex]!.id
      : previousBand;
  }

  // Descending into a lower band — only demote once altitude clearly drops below the current
  // band's own floor (the previous band's ceiling), not the instant it dips under it.
  const floor = previousIndex > 0 ? BAND_ORDER[previousIndex - 1]!.maxMeters : 0;
  return altitudeMeters < floor * (1 - HYSTERESIS_FRACTION)
    ? BAND_ORDER[rawIndex]!.id
    : previousBand;
}

const MIN_NEAR_METERS = 0.05;
const MAX_FAR_METERS = 500_000; // generous ceiling — comfortably covers the whole ~215km province.
const NEAR_ALTITUDE_FACTOR = 0.02;
const FAR_ALTITUDE_FACTOR = 2_000;

export interface CameraNearFarMeters {
  nearMeters: number;
  farMeters: number;
}

/**
 * Camera near/far in real meters for a given altitude above ground — replaces `WorldScene.tsx`'s
 * previous fixed `near=0.05/far=100`, which was only ever correct at the one altitude it was tuned
 * for. Scaling both by altitude keeps the near:far ratio roughly constant (~1e5) at any altitude,
 * which is what keeps a 24-bit depth buffer precise across the whole zoom range instead of only
 * near the ground.
 */
export function cameraNearFarMeters(altitudeMeters: number): CameraNearFarMeters {
  const altitude = Math.max(0.1, altitudeMeters);
  const nearMeters = Math.max(MIN_NEAR_METERS, altitude * NEAR_ALTITUDE_FACTOR);
  const farMeters = Math.min(
    MAX_FAR_METERS,
    Math.max(nearMeters * 10, altitude * FAR_ALTITUDE_FACTOR),
  );
  return { nearMeters, farMeters };
}
