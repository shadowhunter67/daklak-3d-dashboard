/**
 * `WorldTouchControls.tsx` (a plain DOM overlay, siblings with — not inside — the R3F `<Canvas>`)
 * needs to feed movement/look/interact into `PlayerRig.tsx` (inside the Canvas). A Zustand store
 * would work but re-renders every subscriber on every touch-move event; this is the same
 * "continuous 60fps-relevant data lives in a plain mutable ref/module, not React state" choice
 * `usePointerLook.ts`'s accumulator already makes, just crossing the Canvas boundary instead of a
 * component boundary. Nothing here is React-specific — both sides just read/write plain module
 * state each frame/event.
 */

export interface TouchMovementVector {
  /** -1..1, left/right stick deflection. */
  x: number;
  /** -1..1, forward/back stick deflection (negative = forward, matching `MovementInput.forward`
   * mapping to `z = -1` in `playerMovement.ts`). */
  z: number;
  run: boolean;
}

const DEAD_ZONE = 0.15;

let movementVector: TouchMovementVector = { x: 0, z: 0, run: false };
let lookAccumulator = { dx: 0, dy: 0 };
let ascendHeld = false;
let interactRequested = false;

export function setTouchMovementVector(next: TouchMovementVector): void {
  movementVector = next;
}

export function resetTouchMovementVector(): void {
  movementVector = { x: 0, z: 0, run: false };
}

/** Converts the raw analog stick into the same discrete-direction shape `useKeyboardControls.ts`
 * produces, so `PlayerRig.tsx` can merge both input sources without `playerMovement.ts`'s
 * well-tested boolean-based `MovementInput` API needing an analog variant. */
export function getTouchMovementAsDirections(): {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  run: boolean;
} {
  const { x, z, run } = movementVector;
  return {
    forward: z < -DEAD_ZONE,
    backward: z > DEAD_ZONE,
    left: x < -DEAD_ZONE,
    right: x > DEAD_ZONE,
    run,
  };
}

export function setTouchAscendHeld(held: boolean): void {
  ascendHeld = held;
}

export function isTouchAscendHeld(): boolean {
  return ascendHeld;
}

export function pushTouchLookDelta(dx: number, dy: number): void {
  lookAccumulator.dx += dx;
  lookAccumulator.dy += dy;
}

export function consumeTouchLookDelta(): { dx: number; dy: number } {
  const delta = lookAccumulator;
  lookAccumulator = { dx: 0, dy: 0 };
  return delta;
}

export function requestTouchInteract(): void {
  interactRequested = true;
}

/** Drains the one-shot interact flag — call exactly once per frame. */
export function consumeTouchInteractRequest(): boolean {
  const requested = interactRequested;
  interactRequested = false;
  return requested;
}

/** Test-only reset — module-level state would otherwise leak between test cases. */
export function __resetTouchInputBridgeForTests(): void {
  movementVector = { x: 0, z: 0, run: false };
  lookAccumulator = { dx: 0, dy: 0 };
  ascendHeld = false;
  interactRequested = false;
}
