import { beforeEach, describe, expect, it } from 'vitest';
import { createWorldExplorationStore, type WorldExplorationState } from './worldExplorationStore';

let store: ReturnType<typeof createWorldExplorationStore>;

beforeEach(() => {
  store = createWorldExplorationStore();
});

function state(): WorldExplorationState {
  return store.getState();
}

describe('mode switching', () => {
  it('defaults to fly mode', () => {
    expect(state().mode).toBe('fly');
  });

  it('switching away from tour pauses it without clearing which tour was active', () => {
    state().startTour('nature');
    expect(state().tourPlaying).toBe(true);
    state().setMode('walk');
    expect(state().mode).toBe('walk');
    expect(state().tourPlaying).toBe(false);
    expect(state().activeTourId).toBe('nature');
  });

  it('switching between walk/fly never touches tour fields', () => {
    state().setMode('walk');
    state().setMode('fly');
    expect(state().activeTourId).toBeNull();
    expect(state().tourStopIndex).toBe(0);
  });
});

describe('tour lifecycle', () => {
  it('startTour switches mode to tour, resets stop index, and starts playing', () => {
    state().setTourStopIndex(2);
    state().startTour('coffee-culture');
    expect(state().mode).toBe('tour');
    expect(state().activeTourId).toBe('coffee-culture');
    expect(state().tourStopIndex).toBe(0);
    expect(state().tourPlaying).toBe(true);
  });

  it('pause/resume toggles tourPlaying without losing the active tour', () => {
    state().startTour('nature');
    state().pauseTour();
    expect(state().tourPlaying).toBe(false);
    expect(state().activeTourId).toBe('nature');
    state().resumeTour();
    expect(state().tourPlaying).toBe(true);
  });

  it('resume is a no-op (stays paused) if no tour is active', () => {
    state().resumeTour();
    expect(state().tourPlaying).toBe(false);
  });

  it('stopTour clears the active tour entirely', () => {
    state().startTour('nature');
    state().stopTour();
    expect(state().activeTourId).toBeNull();
    expect(state().tourPlaying).toBe(false);
    expect(state().tourStopIndex).toBe(0);
  });
});

describe('teleportRequest', () => {
  it('each request gets a strictly increasing requestId, so a consumer effect fires even for the same target twice', () => {
    state().requestTeleport({ x: 1, z: 2 });
    const first = state().teleportRequest;
    state().requestTeleport({ x: 1, z: 2 });
    const second = state().teleportRequest;
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(second!.requestId).toBeGreaterThan(first!.requestId);
    expect(second!.x).toBe(1);
    expect(second!.z).toBe(2);
  });

  it('carries an optional yaw through untouched', () => {
    state().requestTeleport({ x: 5, z: 6, yaw: 1.2 });
    expect(state().teleportRequest?.yaw).toBe(1.2);
  });
});

describe('POI selection and proximity', () => {
  it('selectPoi and setNearestPoi are independent fields', () => {
    state().selectPoi('ho-lak');
    state().setNearestPoi('buon-don', 12.5);
    expect(state().selectedPoiId).toBe('ho-lak');
    expect(state().nearestPoiId).toBe('buon-don');
    expect(state().nearestPoiDistance).toBe(12.5);
  });

  it('clearing nearest POI clears distance too (no stale distance for a null POI)', () => {
    state().setNearestPoi('ho-lak', 3);
    state().setNearestPoi(null, null);
    expect(state().nearestPoiId).toBeNull();
    expect(state().nearestPoiDistance).toBeNull();
  });
});

describe('camera scale (altitude/band)', () => {
  it('defaults to a plausible altitude matching the intro camera settled position, and the province band', () => {
    expect(state().cameraAltitudeMeters).toBeGreaterThan(0);
    expect(state().scaleBand).toBe('province');
  });

  it('setCameraScale commits both fields together', () => {
    state().setCameraScale(15, 'human');
    expect(state().cameraAltitudeMeters).toBe(15);
    expect(state().scaleBand).toBe('human');
  });
});

describe('two independent store instances', () => {
  it('do not share state (factory, not a singleton)', () => {
    const other = createWorldExplorationStore();
    store.getState().setMode('walk');
    expect(other.getState().mode).toBe('fly');
  });
});
