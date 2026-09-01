import { metersToWorld, worldToMeters } from '../../coordinates/worldScale';

/**
 * Pure player-movement math — no Three.js objects, no DOM, no `useFrame`. `PlayerRig.tsx` calls
 * these every frame with real `delta` (frame-rate independent by construction: every quantity
 * here is speed * deltaSeconds, never a fixed per-frame step) and applies the result to the
 * actual camera/group. Kept pure specifically so movement, gravity, ground-snapping, and mouse
 * -look math can be unit tested without a WebGL context.
 *
 * Speed/size constants below are declared in real meters and converted via
 * `coordinates/worldScale.ts` — see `reports/tourism-digital-twin/world-scale-lod-adr.md` for why
 * (this file's own `WALK_SPEED`/`FLY_SPEED` used to be independently "tuned by feel" world-unit
 * numbers with no shared ground truth, the same class of bug that caused the building-height spike,
 * PR #105).
 */

export interface MovementInput {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  /** Walk: Shift = run. Fly: Shift = descend (see `computeFlyMovement`). */
  run: boolean;
  /** Walk: Space = jump (edge-triggered by the caller — see `PlayerInput`'s doc comment; passing
   * `true` every frame the key is held would repeatedly re-trigger the jump). Fly: Space = ascend
   * (held, not edge-triggered). */
  jumpOrAscend: boolean;
}

export interface PlayerBodyState {
  x: number;
  y: number;
  z: number;
  velocityY: number;
  yaw: number;
  pitch: number;
  grounded: boolean;
}

/** Average human walking speed (real m/s) — Walk mode is always close to the ground, so unlike
 * Fly mode it does not need to scale with altitude. */
export const WALK_SPEED = metersToWorld(1.4); // world units/second
export const RUN_MULTIPLIER = 2.1;
/** Initial vertical velocity for a moderate human jump (real m/s, ~0.46m apex under `GRAVITY`
 * below) — an "object"-scale quantity like `EYE_HEIGHT` (`PlayerRig.tsx`), not a terrain-scale one. */
export const JUMP_VELOCITY = metersToWorld(3.0);
/** Real Earth gravity (m/s²) — same true-scale conversion as everything else placed *in* the
 * scene (players, buildings), not terrain's own exaggerated vertical scale (see
 * `world-scale-lod-adr.md`'s Question 2 for why those two are deliberately different). */
export const GRAVITY = metersToWorld(9.8);

const MIN_FLY_SPEED_METERS_PER_SECOND = 3;
const MAX_FLY_SPEED_METERS_PER_SECOND = 60_000;
const FLY_SPEED_ALTITUDE_FACTOR = 1.5;
/** Vertical (ascend/descend) speed as a fraction of the current horizontal fly speed — preserves
 * the original hand-tuned feel (`2.0 / 3.2` from the pre-altitude-scaled constants) now that both
 * scale with altitude together instead of being two independent fixed numbers. */
const FLY_VERTICAL_SPEED_RATIO = 2.0 / 3.2;

/**
 * Fly-mode horizontal speed (real m/s) as a function of the camera's current altitude above
 * ground — this is the "seamless zoom" behavior (`world-scale-lod-adr.md`'s Question 3): slow and
 * precise near the ground, fast enough to cross the whole province in a few seconds from a high
 * vantage, with no discrete "zoom level" to jump between. Replaces the old fixed `FLY_SPEED`
 * constant (`3.2` world-units/second at every altitude, which worked out to a nonsensical ~132
 * km/s at ground level and the same crawl from orbit).
 */
export function flySpeedMetersPerSecond(altitudeMeters: number): number {
  return clamp(
    altitudeMeters * FLY_SPEED_ALTITUDE_FACTOR,
    MIN_FLY_SPEED_METERS_PER_SECOND,
    MAX_FLY_SPEED_METERS_PER_SECOND,
  );
}

/** A world-unit fallback ground height used only when the terrain sampler has no data at all yet
 * (still loading) or the player is briefly outside the sampled bbox — never left `undefined`, so
 * movement code never has to special-case "no ground exists". Deliberately NOT converted via
 * `metersToWorld` — this stands in for `TerrainSampler.getHeight()`, which lives on terrain's own
 * exaggerated vertical scale (`world-scale-lod-adr.md`'s Question 2), not the true "object" scale
 * everything else in this file now uses. */
export const FALLBACK_GROUND_HEIGHT = 0.3;

function horizontalInputVector(input: MovementInput): { x: number; z: number } {
  let x = 0;
  let z = 0;
  if (input.forward) z -= 1;
  if (input.backward) z += 1;
  if (input.left) x -= 1;
  if (input.right) x += 1;
  const length = Math.hypot(x, z);
  return length > 0 ? { x: x / length, z: z / length } : { x: 0, z: 0 };
}

/** Rotates the local (camera-relative) input vector by `yaw` into world-space XZ. `yaw = 0` faces
 * world -Z, increasing yaw turns counter-clockwise viewed from above — the same convention
 * `worldExplorationStore.ts`'s `WorldPose.yaw` documents. */
function yawToWorld(local: { x: number; z: number }, yaw: number): { x: number; z: number } {
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);
  return {
    x: local.x * cos - local.z * sin,
    z: local.x * sin + local.z * cos,
  };
}

/**
 * Walk mode: horizontal movement is snapped to the terrain surface every frame (via
 * `groundHeightAt`, the CPU terrain sampler's `getHeight`), which is also how slopes are handled
 * — no separate slope-limiting logic is needed because the player's Y simply follows the
 * (smoothly bilinear-interpolated, so never jittery) height field continuously while grounded.
 * Vertical motion (jump/gravity) is a simple projectile: `velocityY` integrates gravity every
 * frame and jump applies one upward impulse; landing snaps exactly to `groundHeightAt` rather
 * than letting integration drift below it, so the player can never end up under the terrain.
 */
export function computeWalkMovement(
  state: PlayerBodyState,
  input: MovementInput,
  deltaSeconds: number,
  groundHeightAt: (x: number, z: number) => number | null,
): PlayerBodyState {
  const local = horizontalInputVector(input);
  const speed = WALK_SPEED * (input.run ? RUN_MULTIPLIER : 1);
  const worldDelta = yawToWorld(local, state.yaw);
  const nextX = state.x + worldDelta.x * speed * deltaSeconds;
  const nextZ = state.z + worldDelta.z * speed * deltaSeconds;

  const groundHere = groundHeightAt(nextX, nextZ) ?? state.y;
  let velocityY = state.velocityY;

  if (state.grounded && input.jumpOrAscend) {
    velocityY = JUMP_VELOCITY;
  } else if (!state.grounded) {
    velocityY -= GRAVITY * deltaSeconds;
  }

  // `grounded` is fully determined by where `nextY` actually lands relative to the terrain below
  // it, not tracked incrementally through the branches above (a jump sets `velocityY` upward but
  // the player is still airborne the instant it's applied — this recomputes the real answer every
  // frame instead of threading a second, redundant "am I grounded now" flag through them).
  let nextY = state.y + velocityY * deltaSeconds;
  const grounded = nextY <= groundHere;
  if (grounded) {
    nextY = groundHere;
    velocityY = 0;
  }

  return { ...state, x: nextX, y: nextY, z: nextZ, velocityY, grounded };
}

/**
 * Fly mode: full 3D free movement in the look direction (forward respects pitch, so looking up
 * while moving forward climbs), plus explicit vertical keys, clamped to stay within (a small
 * margin above/below) the real terrain data bounds — "không để camera thoát quá xa khỏi vùng dữ
 * liệu" (task requirement). No gravity, no ground snapping.
 *
 * Speed is altitude-relative (`flySpeedMetersPerSecond`), not fixed — `groundHeightAt` samples the
 * terrain directly under the player each call to compute that altitude, the same pattern
 * `computeWalkMovement` already uses for ground-snapping.
 */
export function computeFlyMovement(
  state: PlayerBodyState,
  input: MovementInput,
  deltaSeconds: number,
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number },
  groundHeightAt: (x: number, z: number) => number | null,
  margin = 1.5,
  minAltitude = -0.3,
  maxAltitude = 4,
): PlayerBodyState {
  const local = horizontalInputVector(input);
  const cosPitch = Math.cos(state.pitch);
  const sinPitch = Math.sin(state.pitch);
  // Forward vector including pitch (moving "forward" while looking up climbs); strafe stays
  // level (real flight-sim convention — strafing doesn't also bank you up/down).
  const forwardWorld = yawToWorld({ x: 0, z: local.z }, state.yaw);
  const strafeWorld = yawToWorld({ x: local.x, z: 0 }, state.yaw);

  // Falls back to `FALLBACK_GROUND_HEIGHT` (the terrain's own "unknown ground" baseline), NOT
  // `state.y` — the player is very likely high above the ground exactly when the sampler has no
  // data yet (e.g. right at the intro handoff, well outside the terrain's real sampled bbox at
  // `z=5.2`, per `PlayerRig.tsx`'s starting pose) or is still loading, so assuming "I'm standing on
  // whatever I'm at right now" (altitude 0) would wrongly clamp speed to the minimum at the exact
  // moment a fast speed is most needed.
  const groundHere = groundHeightAt(state.x, state.z) ?? FALLBACK_GROUND_HEIGHT;
  const altitudeMeters = Math.max(0, worldToMeters(state.y - groundHere));
  const speed = metersToWorld(flySpeedMetersPerSecond(altitudeMeters));
  const verticalSpeed = speed * FLY_VERTICAL_SPEED_RATIO;

  const dx = (forwardWorld.x * cosPitch + strafeWorld.x) * speed * deltaSeconds;
  const dz = (forwardWorld.z * cosPitch + strafeWorld.z) * speed * deltaSeconds;
  // `local.z` is -1 when moving forward, +1 backward (see `horizontalInputVector`); climbing
  // while looking up and moving forward needs a positive dy, hence the negation.
  const dyFromPitch = -local.z * sinPitch * speed * deltaSeconds;

  let verticalInput = 0;
  if (input.jumpOrAscend) verticalInput += 1;
  if (input.run) verticalInput -= 1; // Fly: Shift = descend (see MovementInput's doc comment).
  const dyFromKeys = verticalInput * verticalSpeed * deltaSeconds;

  const nextX = clamp(state.x + dx, bounds.minX - margin, bounds.maxX + margin);
  const nextZ = clamp(state.z + dz, bounds.minZ - margin, bounds.maxZ + margin);
  const nextY = clamp(state.y + dyFromPitch + dyFromKeys, minAltitude, maxAltitude);

  return { ...state, x: nextX, y: nextY, z: nextZ, velocityY: 0, grounded: false };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Mouse-look accumulation, clamped so the camera can never flip past straight up/down.
 * `sensitivity` is radians per input-device pixel; both movement functions above read the
 * resulting `yaw`/`pitch` off `PlayerBodyState`, not from here directly. */
export function updateLookAngles(
  yaw: number,
  pitch: number,
  deltaX: number,
  deltaY: number,
  sensitivity: number,
): { yaw: number; pitch: number } {
  const nextYaw = yaw - deltaX * sensitivity;
  const nextPitch = clamp(pitch - deltaY * sensitivity, -Math.PI / 2 + 0.01, Math.PI / 2 - 0.01);
  return { yaw: wrapAngle(nextYaw), pitch: nextPitch };
}

function wrapAngle(angle: number): number {
  const twoPi = Math.PI * 2;
  let wrapped = angle % twoPi;
  if (wrapped > Math.PI) wrapped -= twoPi;
  if (wrapped < -Math.PI) wrapped += twoPi;
  return wrapped;
}
