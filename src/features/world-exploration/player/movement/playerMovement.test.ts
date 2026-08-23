import { describe, expect, it } from 'vitest';
import {
  computeFlyMovement,
  computeWalkMovement,
  FALLBACK_GROUND_HEIGHT,
  FLY_SPEED,
  GRAVITY,
  JUMP_VELOCITY,
  RUN_MULTIPLIER,
  updateLookAngles,
  WALK_SPEED,
  type MovementInput,
  type PlayerBodyState,
} from './playerMovement';

const noInput: MovementInput = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  run: false,
  jumpOrAscend: false,
};

function flatGround(): number | null {
  return 0;
}

function baseState(overrides: Partial<PlayerBodyState> = {}): PlayerBodyState {
  return { x: 0, y: 0, z: 0, velocityY: 0, yaw: 0, pitch: 0, grounded: true, ...overrides };
}

describe('computeWalkMovement', () => {
  it('does not move when no input is held', () => {
    const next = computeWalkMovement(baseState(), noInput, 1, flatGround);
    expect(next.x).toBeCloseTo(0, 10);
    expect(next.z).toBeCloseTo(0, 10);
  });

  it('moving forward at yaw=0 decreases Z (forward is -Z, matching the store convention)', () => {
    const input = { ...noInput, forward: true };
    const next = computeWalkMovement(baseState(), input, 1, flatGround);
    expect(next.z).toBeLessThan(0);
    expect(next.x).toBeCloseTo(0, 10);
  });

  it('is frame-rate independent: two half-steps cover the same distance as one full step', () => {
    const input = { ...noInput, forward: true };
    const oneStep = computeWalkMovement(baseState(), input, 1, flatGround);
    let twoSteps = computeWalkMovement(baseState(), input, 0.5, flatGround);
    twoSteps = computeWalkMovement(twoSteps, input, 0.5, flatGround);
    expect(twoSteps.z).toBeCloseTo(oneStep.z, 10);
  });

  it('running multiplies horizontal speed by RUN_MULTIPLIER', () => {
    const walking = computeWalkMovement(baseState(), { ...noInput, forward: true }, 1, flatGround);
    const running = computeWalkMovement(
      baseState(),
      { ...noInput, forward: true, run: true },
      1,
      flatGround,
    );
    expect(Math.abs(running.z)).toBeCloseTo(Math.abs(walking.z) * RUN_MULTIPLIER, 10);
  });

  it('diagonal movement (forward+right) is normalized, not faster than a single direction', () => {
    const forwardOnly = computeWalkMovement(
      baseState(),
      { ...noInput, forward: true },
      1,
      flatGround,
    );
    const diagonal = computeWalkMovement(
      baseState(),
      { ...noInput, forward: true, right: true },
      1,
      flatGround,
    );
    const forwardSpeed = Math.hypot(forwardOnly.x, forwardOnly.z);
    const diagonalSpeed = Math.hypot(diagonal.x, diagonal.z);
    expect(diagonalSpeed).toBeCloseTo(forwardSpeed, 6);
  });

  it('yaw rotates the movement direction (moving forward at yaw=PI/2 changes X, not Z)', () => {
    const next = computeWalkMovement(
      baseState({ yaw: Math.PI / 2 }),
      { ...noInput, forward: true },
      1,
      flatGround,
    );
    expect(Math.abs(next.x)).toBeGreaterThan(0.5);
    expect(Math.abs(next.z)).toBeLessThan(1e-6);
  });

  it('stays exactly on the ground height when grounded and no jump is pressed', () => {
    const groundAt5 = () => 0.75;
    const next = computeWalkMovement(baseState({ y: 0.75 }), noInput, 1, groundAt5);
    expect(next.y).toBeCloseTo(0.75, 10);
    expect(next.grounded).toBe(true);
  });

  it('jump applies an upward impulse and leaves the ground', () => {
    const next = computeWalkMovement(
      baseState(),
      { ...noInput, jumpOrAscend: true },
      0.01,
      flatGround,
    );
    expect(next.velocityY).toBeGreaterThan(0);
  });

  it('cannot jump while airborne (no double jump)', () => {
    const airborne = baseState({ grounded: false, velocityY: 0.5, y: 1 });
    const next = computeWalkMovement(
      airborne,
      { ...noInput, jumpOrAscend: true },
      0.01,
      flatGround,
    );
    // Velocity should have continued falling under gravity, not been reset to JUMP_VELOCITY.
    expect(next.velocityY).toBeLessThan(0.5);
    expect(next.velocityY).not.toBe(JUMP_VELOCITY);
  });

  it('gravity eventually brings a jumping player back down to the ground, never below it', () => {
    let state = computeWalkMovement(
      baseState(),
      { ...noInput, jumpOrAscend: true },
      0.05,
      flatGround,
    );
    expect(state.grounded).toBe(false);
    // Simulate ~2 seconds of falling in small steps.
    for (let i = 0; i < 200; i++) {
      state = computeWalkMovement(state, noInput, 0.01, flatGround);
      expect(state.y).toBeGreaterThanOrEqual(0 - 1e-9); // never below ground
    }
    expect(state.grounded).toBe(true);
    expect(state.y).toBeCloseTo(0, 6);
  });

  it('follows a sloped/varying terrain height smoothly (no snapping to a stale value)', () => {
    let terrainY = 0;
    const variableGround = () => terrainY;
    let state = baseState({ y: 0 });
    state = computeWalkMovement(state, noInput, 1, variableGround);
    expect(state.y).toBeCloseTo(0, 10);
    terrainY = 0.5; // simulate walking onto higher ground
    state = computeWalkMovement(state, noInput, 1, variableGround);
    expect(state.y).toBeCloseTo(0.5, 10);
  });

  it('falls back to the previous Y (not NaN/0) when the sampler has no data at the new position', () => {
    const noData = () => null;
    const next = computeWalkMovement(baseState({ y: 1.2 }), noInput, 1, noData);
    expect(next.y).toBeCloseTo(1.2, 10);
  });
});

describe('computeFlyMovement', () => {
  const bounds = { minX: -10, maxX: 10, minZ: -10, maxZ: 10 };

  it('does not move when no input is held', () => {
    const next = computeFlyMovement(baseState(), noInput, 1, bounds);
    expect(next.x).toBeCloseTo(0, 10);
    expect(next.y).toBeCloseTo(0, 10);
    expect(next.z).toBeCloseTo(0, 10);
  });

  it('is frame-rate independent for horizontal movement', () => {
    const input = { ...noInput, forward: true };
    const oneStep = computeFlyMovement(baseState(), input, 1, bounds);
    let twoSteps = computeFlyMovement(baseState(), input, 0.5, bounds);
    twoSteps = computeFlyMovement(twoSteps, input, 0.5, bounds);
    expect(twoSteps.z).toBeCloseTo(oneStep.z, 6);
  });

  it('Space (jumpOrAscend) climbs; Shift (run) descends', () => {
    const up = computeFlyMovement(baseState(), { ...noInput, jumpOrAscend: true }, 1, bounds);
    expect(up.y).toBeGreaterThan(0);
    const down = computeFlyMovement(baseState(), { ...noInput, run: true }, 1, bounds);
    expect(down.y).toBeLessThan(0);
  });

  it('never sets grounded/velocityY (fly mode has no gravity)', () => {
    const next = computeFlyMovement(
      baseState({ grounded: false, velocityY: 3 }),
      { ...noInput, forward: true },
      1,
      bounds,
    );
    expect(next.grounded).toBe(false);
    expect(next.velocityY).toBe(0);
  });

  it('clamps horizontal position to stay near the real data bounds even with sustained input', () => {
    let state = baseState({ z: -9.9 });
    const input = { ...noInput, forward: true };
    for (let i = 0; i < 500; i++) state = computeFlyMovement(state, input, 0.1, bounds);
    expect(state.z).toBeGreaterThanOrEqual(bounds.minZ - 1.5 - 1e-6);
  });

  it('clamps altitude to a sane range even with sustained ascend input', () => {
    let state = baseState();
    const input = { ...noInput, jumpOrAscend: true };
    for (let i = 0; i < 500; i++) state = computeFlyMovement(state, input, 0.1, bounds);
    expect(state.y).toBeLessThanOrEqual(4 + 1e-6);
  });

  it('looking up while moving forward climbs (pitch affects vertical motion)', () => {
    const lookingUp = computeFlyMovement(
      baseState({ pitch: 0.5 }),
      { ...noInput, forward: true },
      1,
      bounds,
    );
    expect(lookingUp.y).toBeGreaterThan(0);
  });
});

describe('updateLookAngles', () => {
  it('moving the pointer right increases... decreases yaw per the documented sign convention', () => {
    const { yaw } = updateLookAngles(0, 0, 10, 0, 0.01);
    expect(yaw).toBeCloseTo(-0.1, 10);
  });

  it('clamps pitch just short of straight up/down (never flips the camera)', () => {
    const { pitch } = updateLookAngles(0, 0, 0, -100000, 0.01);
    expect(pitch).toBeLessThan(Math.PI / 2);
    expect(pitch).toBeGreaterThan(0);
  });

  it('wraps yaw into (-PI, PI] instead of growing unbounded', () => {
    const { yaw } = updateLookAngles(3, 0, -1000, 0, 0.01);
    expect(yaw).toBeGreaterThanOrEqual(-Math.PI);
    expect(yaw).toBeLessThanOrEqual(Math.PI);
  });
});

// Sanity checks that the exported tuning constants stay in a plausible, human-scale range —
// catches an accidental typo (e.g. a missing decimal point) turning WALK_SPEED into something
// wildly too fast/slow without needing to eyeball it in a real browser every time.
describe('tuning constants', () => {
  it('WALK_SPEED/FLY_SPEED/GRAVITY/JUMP_VELOCITY/FALLBACK_GROUND_HEIGHT are all positive and finite', () => {
    for (const value of [WALK_SPEED, FLY_SPEED, GRAVITY, JUMP_VELOCITY, FALLBACK_GROUND_HEIGHT]) {
      expect(value).toBeGreaterThan(0);
      expect(Number.isFinite(value)).toBe(true);
    }
  });
});
