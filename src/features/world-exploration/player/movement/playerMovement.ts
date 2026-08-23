/**
 * Pure player-movement math — no Three.js objects, no DOM, no `useFrame`. `PlayerRig.tsx` calls
 * these every frame with real `delta` (frame-rate independent by construction: every quantity
 * here is speed * deltaSeconds, never a fixed per-frame step) and applies the result to the
 * actual camera/group. Kept pure specifically so movement, gravity, ground-snapping, and mouse
 * -look math can be unit tested without a WebGL context.
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

export const WALK_SPEED = 1.1; // world units/second
export const RUN_MULTIPLIER = 2.1;
export const FLY_SPEED = 3.2;
export const FLY_VERTICAL_SPEED = 2.0;
export const JUMP_VELOCITY = 1.7;
export const GRAVITY = 5.6;
/** A world-unit fallback ground height used only when the terrain sampler has no data at all yet
 * (still loading) or the player is briefly outside the sampled bbox — never left `undefined`, so
 * movement code never has to special-case "no ground exists". */
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
 */
export function computeFlyMovement(
  state: PlayerBodyState,
  input: MovementInput,
  deltaSeconds: number,
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number },
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

  const speed = FLY_SPEED;
  const dx = (forwardWorld.x * cosPitch + strafeWorld.x) * speed * deltaSeconds;
  const dz = (forwardWorld.z * cosPitch + strafeWorld.z) * speed * deltaSeconds;
  // `local.z` is -1 when moving forward, +1 backward (see `horizontalInputVector`); climbing
  // while looking up and moving forward needs a positive dy, hence the negation.
  const dyFromPitch = -local.z * sinPitch * speed * deltaSeconds;

  let verticalInput = 0;
  if (input.jumpOrAscend) verticalInput += 1;
  if (input.run) verticalInput -= 1; // Fly: Shift = descend (see MovementInput's doc comment).
  const dyFromKeys = verticalInput * FLY_VERTICAL_SPEED * deltaSeconds;

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
