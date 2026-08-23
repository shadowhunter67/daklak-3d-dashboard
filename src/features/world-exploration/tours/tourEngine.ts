import { worldDistance, type WorldXZ } from '../coordinates/worldCoordinates';
import { getWorldPoiById, type WorldPoi } from '../poi/worldPoi';
import type { WorldTour } from './worldTours';

/** World units/second the tour camera travels between stops — same order of magnitude as
 * `WorldFlyInCamera.tsx`'s settled orbit radius (~5 world units), tuned so a multi-stop tour
 * takes a handful of seconds per leg, not an abrupt jump or a minutes-long crawl. */
export const TOUR_TRAVEL_SPEED = 1.6;
/** Seconds to linger at each stop before departing — long enough to read the POI panel's title. */
export const TOUR_DWELL_SECONDS = 4;

export type TourPhase = 'dwelling' | 'traveling' | 'finished';

export interface TourProgress {
  phase: TourPhase;
  /** Index into the tour's resolved stops the player is departing from (or currently at, while
   * dwelling). */
  fromIndex: number;
  /** Seconds elapsed within the current phase. */
  phaseElapsed: number;
}

export function createInitialTourProgress(): TourProgress {
  return { phase: 'dwelling', fromIndex: 0, phaseElapsed: 0 };
}

/** Resolves a tour's `stops` (ids) against the live POI list, silently dropping any id that no
 * longer resolves (defensive — should never happen for the committed `worldTours.ts`, covered by
 * `worldTours.test.ts`'s "every stop resolves" assertion — but a playback engine must not throw
 * on stale data). */
export function getTourStops(tour: WorldTour): WorldPoi[] {
  return tour.stops.map(getWorldPoiById).filter((poi): poi is WorldPoi => poi !== undefined);
}

/** Seconds to travel one leg (`stops[index]` -> `stops[index + 1]`) at `TOUR_TRAVEL_SPEED` — the
 * single source of truth both `advanceTourProgress` (when to switch back to `dwelling`) and
 * `tourPositionForProgress` (how far along the leg we are) must agree on, or the reported
 * position and the phase-completion decision would drift apart on any leg whose real-world
 * distance takes more than a token fixed duration to traverse. */
function legDurationSeconds(stops: WorldPoi[], index: number): number {
  const from = stops[index];
  const to = stops[Math.min(index + 1, stops.length - 1)];
  if (!from || !to) return 0;
  const distance = worldDistance(from.world, to.world);
  return distance > 0 ? distance / TOUR_TRAVEL_SPEED : 0;
}

/**
 * Advances tour playback by `deltaSeconds`. Pure — no timers, no DOM, no Three.js; `TourRig.tsx`
 * drives this from `useFrame`'s own delta and applies the result to the camera/player.
 *
 * `reducedMotion`: skips the `traveling` phase's continuous motion entirely (jumps straight to
 * the next stop instead of animating toward it) — same policy `WorldFlyInCamera.tsx` already
 * applies to its own automatic fly-in/orbit. Dwelling (a static pause to read the POI panel) is
 * not motion and is kept either way.
 */
export function advanceTourProgress(
  progress: TourProgress,
  deltaSeconds: number,
  stops: WorldPoi[],
  reducedMotion: boolean,
): TourProgress {
  if (progress.phase === 'finished' || stops.length === 0) return progress;

  const phaseElapsed = progress.phaseElapsed + deltaSeconds;

  if (progress.phase === 'dwelling') {
    if (phaseElapsed < TOUR_DWELL_SECONDS) return { ...progress, phaseElapsed };
    const isLastStop = progress.fromIndex >= stops.length - 1;
    if (isLastStop) return { phase: 'finished', fromIndex: progress.fromIndex, phaseElapsed: 0 };
    return { phase: 'traveling', fromIndex: progress.fromIndex, phaseElapsed: 0 };
  }

  // traveling
  if (reducedMotion) {
    return { phase: 'dwelling', fromIndex: progress.fromIndex + 1, phaseElapsed: 0 };
  }
  const duration = legDurationSeconds(stops, progress.fromIndex);
  if (phaseElapsed < duration) return { ...progress, phaseElapsed };
  return { phase: 'dwelling', fromIndex: progress.fromIndex + 1, phaseElapsed: 0 };
}

/**
 * World-space XZ position for the current progress. `traveling` interpolates linearly between
 * `stops[fromIndex]` and `stops[fromIndex + 1]` at a speed-derived fraction (not a fixed
 * duration — a long leg and a short leg both feel like the same travel speed, matching how the
 * task frames Fly mode's "giới hạn tốc độ hợp lý" for consistency between the two camera modes).
 * `dwelling`/`finished` sit exactly on `stops[fromIndex]` (clamped to the last stop once
 * finished).
 */
export function tourPositionForProgress(stops: WorldPoi[], progress: TourProgress): WorldXZ {
  const clampedIndex = Math.min(progress.fromIndex, stops.length - 1);
  const from = stops[clampedIndex]!.world;
  if (progress.phase !== 'traveling') return from;

  const to = stops[Math.min(clampedIndex + 1, stops.length - 1)]!.world;
  const legDuration = legDurationSeconds(stops, clampedIndex);
  const t = legDuration > 0 ? Math.min(1, progress.phaseElapsed / legDuration) : 1;
  return { x: from.x + (to.x - from.x) * t, z: from.z + (to.z - from.z) * t };
}
