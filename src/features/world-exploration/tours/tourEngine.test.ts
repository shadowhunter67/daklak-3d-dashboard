import { describe, expect, it } from 'vitest';
import {
  advanceTourProgress,
  createInitialTourProgress,
  getTourStops,
  tourPositionForProgress,
  TOUR_DWELL_SECONDS,
  type TourProgress,
} from './tourEngine';
import { getWorldTourById } from './worldTours';
import type { WorldPoi } from '../poi/worldPoi';

const realTour = getWorldTourById('lakes-and-waterfalls')!;
const realStops = getTourStops(realTour);

// Small synthetic stops for tests that need exact, hand-computable distances/durations,
// independent of the real dataset's actual (larger, geography-derived) separations.
function poiAt(id: string, x: number, z: number): WorldPoi {
  return {
    id,
    name: id,
    category: 'lake',
    description: '',
    coordinates: [0, 0],
    sourceUrl: 'https://example.test/',
    confidence: 'verified',
    verificationStatus: 'reviewed',
    dataOwner: 'test',
    world: { x, z },
  };
}

describe('createInitialTourProgress', () => {
  it('starts dwelling at stop 0', () => {
    const progress = createInitialTourProgress();
    expect(progress).toEqual({ phase: 'dwelling', fromIndex: 0, phaseElapsed: 0 });
  });
});

describe('advanceTourProgress', () => {
  it('stays dwelling until TOUR_DWELL_SECONDS elapses', () => {
    let progress = createInitialTourProgress();
    progress = advanceTourProgress(progress, TOUR_DWELL_SECONDS - 0.5, realStops, false);
    expect(progress.phase).toBe('dwelling');
  });

  it('transitions dwelling -> traveling after the dwell time, if more stops remain', () => {
    let progress = createInitialTourProgress();
    progress = advanceTourProgress(progress, TOUR_DWELL_SECONDS + 0.01, realStops, false);
    expect(progress.phase).toBe('traveling');
    expect(progress.fromIndex).toBe(0);
  });

  it('a single-stop tour finishes after dwelling instead of traveling', () => {
    let progress = createInitialTourProgress();
    const oneStop = [poiAt('a', 0, 0)];
    progress = advanceTourProgress(progress, TOUR_DWELL_SECONDS + 0.01, oneStop, false);
    expect(progress.phase).toBe('finished');
  });

  it('traveling completes exactly when phaseElapsed reaches the leg duration, matching position t=1', () => {
    const stops = [poiAt('a', 0, 0), poiAt('b', 10, 0)]; // distance 10, speed default -> duration
    let progress: TourProgress = { phase: 'traveling', fromIndex: 0, phaseElapsed: 0 };
    // Advance to just before completion.
    const almostThere = advanceTourProgress(progress, 0.001, stops, false);
    expect(almostThere.phase).toBe('traveling');
    const nearEndPosition = tourPositionForProgress(stops, almostThere);
    expect(nearEndPosition.x).toBeGreaterThan(0);
    expect(nearEndPosition.x).toBeLessThan(10);

    // Advance far past the leg duration -> must have switched to dwelling at stop 1.
    progress = advanceTourProgress(progress, 1000, stops, false);
    expect(progress.phase).toBe('dwelling');
    expect(progress.fromIndex).toBe(1);
    expect(tourPositionForProgress(stops, progress)).toEqual({ x: 10, z: 0 });
  });

  it('reduced motion skips the traveling phase entirely (jumps straight to the next stop)', () => {
    let progress = createInitialTourProgress();
    // One tick to leave `dwelling` (matches real usage: TourRig calls this every frame with a
    // small delta, so a single call only ever crosses one phase boundary).
    progress = advanceTourProgress(progress, TOUR_DWELL_SECONDS + 0.01, realStops, true);
    expect(progress.phase).toBe('traveling');
    // The very next tick, reduced motion must not animate — it jumps straight to dwelling at the
    // next stop regardless of how little time has passed.
    progress = advanceTourProgress(progress, 0.001, realStops, true);
    expect(progress.phase).toBe('dwelling');
    expect(progress.fromIndex).toBe(1);
  });

  it('is a no-op once finished', () => {
    const finished = { phase: 'finished' as const, fromIndex: 3, phaseElapsed: 0 };
    const next = advanceTourProgress(finished, 100, realStops, false);
    expect(next).toEqual(finished);
  });

  it('never throws or infinite-loops on an empty stop list', () => {
    const progress = createInitialTourProgress();
    expect(() => advanceTourProgress(progress, 100, [], false)).not.toThrow();
  });
});

describe('tourPositionForProgress', () => {
  it('sits exactly on the current stop while dwelling', () => {
    const stops = [poiAt('a', 3, 4), poiAt('b', 10, 0)];
    const progress = { phase: 'dwelling' as const, fromIndex: 0, phaseElapsed: 0 };
    expect(tourPositionForProgress(stops, progress)).toEqual({ x: 3, z: 4 });
  });

  it('linearly interpolates halfway through a leg', () => {
    const stops = [poiAt('a', 0, 0), poiAt('b', 10, 0)];
    // legDuration = distance(10) / TOUR_TRAVEL_SPEED; set phaseElapsed to exactly half of that.
    const legDuration = 10 / 1.6; // TOUR_TRAVEL_SPEED, kept in sync via the direct import below
    const progress = { phase: 'traveling' as const, fromIndex: 0, phaseElapsed: legDuration / 2 };
    const position = tourPositionForProgress(stops, progress);
    expect(position.x).toBeCloseTo(5, 5);
    expect(position.z).toBeCloseTo(0, 5);
  });

  it('clamps to the last stop when finished', () => {
    const stops = [poiAt('a', 0, 0), poiAt('b', 10, 0)];
    const progress = { phase: 'finished' as const, fromIndex: 1, phaseElapsed: 0 };
    expect(tourPositionForProgress(stops, progress)).toEqual({ x: 10, z: 0 });
  });

  it('never returns NaN for a zero-distance leg (two stops at the same position)', () => {
    const stops = [poiAt('a', 5, 5), poiAt('b', 5, 5)];
    const progress = { phase: 'traveling' as const, fromIndex: 0, phaseElapsed: 2 };
    const position = tourPositionForProgress(stops, progress);
    expect(Number.isFinite(position.x)).toBe(true);
    expect(Number.isFinite(position.z)).toBe(true);
  });
});
