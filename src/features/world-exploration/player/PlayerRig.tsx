import { useThree, useFrame } from '@react-three/fiber';
import { useCallback, useEffect, useRef } from 'react';
import { useKeyboardControls } from './input/useKeyboardControls';
import { usePointerLook } from './input/usePointerLook';
import {
  consumeTouchInteractRequest,
  consumeTouchLookDelta,
  getTouchMovementAsDirections,
  isTouchAscendHeld,
} from './input/touchInputBridge';
import {
  computeFlyMovement,
  computeWalkMovement,
  FALLBACK_GROUND_HEIGHT,
  updateLookAngles,
  type MovementInput,
  type PlayerBodyState,
} from './movement/playerMovement';
import { getWorldBounds } from '../coordinates/worldCoordinates';
import { findNearestPoi, POI_PROXIMITY_RADIUS } from '../poi/worldPoi';
import { useTerrainSampler } from '../terrain/useTerrainSampler';
import { useWorldExplorationStore } from '../state/worldExplorationStore';

/** Camera height above the terrain surface while standing (Walk mode) — folded into the ground
 * -height function passed to `computeWalkMovement` so the player's `PlayerBodyState.y` already
 * represents eye height throughout (jump/gravity math then just works relative to that shifted
 * baseline, no separate offset to keep in sync elsewhere). */
const EYE_HEIGHT = 0.16;
/** Look sensitivity, radians per raw pointer-movement pixel — tuned by feel (a full 360 turn is
 * roughly one and a half mouse-pad sweeps at typical OS pointer speed), not derived from anything
 * else. */
const LOOK_SENSITIVITY = 0.0022;
/** HUD-facing pose/nearest-POI updates are throttled to this interval — see
 * `worldExplorationStore.ts`'s doc comment on why `pose` must not be written every frame. */
const HUD_COMMIT_INTERVAL_SECONDS = 0.15;
/** Clamp a single frame's delta so tab-switching back after being backgrounded (a huge real
 * `delta`) can't teleport the player or send them falling through the floor in one jump. */
const MAX_FRAME_DELTA_SECONDS = 0.1;

export function PlayerRig() {
  const { camera, gl } = useThree();
  const mode = useWorldExplorationStore((state) => state.mode);
  const pose = useWorldExplorationStore((state) => state.pose);
  const setPose = useWorldExplorationStore((state) => state.setPose);
  const sampler = useTerrainSampler();
  const setNearestPoi = useWorldExplorationStore((state) => state.setNearestPoi);
  const selectPoi = useWorldExplorationStore((state) => state.selectPoi);
  const poiListOpen = useWorldExplorationStore((state) => state.poiListOpen);
  const teleportRequest = useWorldExplorationStore((state) => state.teleportRequest);

  // Starting pose exactly matches `WorldFlyInCamera.tsx`'s settled intro framing (`position.set
  // (END_RADIUS * sin(0), END_HEIGHT, END_RADIUS * cos(0))` = `(0, 2.4, 5.2)`, `lookAt(0, 0.3,
  // 0)`), not just an approximation — an earlier version of this used rough guessed numbers,
  // which was close enough to *look* right but measurably shifted marker screen positions versus
  // the intro's exact camera in `reducedMotion` mode (where `WorldScene.tsx` skips the intro
  // component entirely and this pose is the very first frame rendered), breaking
  // `world-exploration.spec.ts`'s Phase T2 marker-position assertions. `yaw`/`pitch` here are the
  // exact values a real `THREE.PerspectiveCamera` at that position decomposes to for
  // `lookAt(0, 0.3, 0)` with Euler order `'YXZ'` (verified with `three` directly, not hand
  // -derived trig) — see `docs/world-exploration.md` for the derivation.
  const bodyRef = useRef<PlayerBodyState>({
    x: 0,
    y: 2.4,
    z: 5.2,
    velocityY: 0,
    yaw: 0,
    pitch: -0.3838176232885688,
    grounded: false,
  });
  const hudCommitAccumulator = useRef(0);
  const lastHandledTeleportId = useRef(0);
  const previousModeRef = useRef(mode);

  // Re-entering Walk/Fly right after a guided tour picks up from wherever the tour camera ended
  // (`TourRig.tsx` throttle-commits `pose` during playback) instead of snapping back to whatever
  // stale position the player was standing at before the tour started — a mode switch is not
  // supposed to "teleport" the player (task requirement), and resuming at the pre-tour spot would
  // read as exactly that.
  useEffect(() => {
    if (previousModeRef.current === 'tour' && mode !== 'tour') {
      bodyRef.current = {
        x: pose.x,
        y: pose.y,
        z: pose.z,
        yaw: pose.yaw,
        pitch: bodyRef.current.pitch,
        velocityY: 0,
        grounded: mode === 'walk',
      };
    }
    previousModeRef.current = mode;
    // `pose` is intentionally excluded: this effect should only react to a *mode* transition
    // (reading whatever `pose` value is current at that moment), not re-run on every throttled
    // pose commit while a tour is playing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const handleInteract = useCallback(() => {
    const nearest = findNearestPoi({ x: bodyRef.current.x, z: bodyRef.current.z });
    if (nearest && nearest.distance <= POI_PROXIMITY_RADIUS) selectPoi(nearest.poi.id);
  }, [selectPoi]);

  const handleEscape = useCallback(() => {
    if (document.pointerLockElement) document.exitPointerLock?.();
  }, []);

  const active = (mode === 'walk' || mode === 'fly') && !poiListOpen;
  const keyboardRef = useKeyboardControls(active, handleInteract, handleEscape);
  const look = usePointerLook(active, gl.domElement);

  // Teleport requests (from the HUD's destination picker) are handled here, not in a separate
  // effect keyed only on the target — `requestId` (see `worldExplorationStore.ts`) makes a
  // second teleport to the *same* POI still fire, which a target-only dependency would miss.
  useEffect(() => {
    if (!teleportRequest || teleportRequest.requestId === lastHandledTeleportId.current) return;
    lastHandledTeleportId.current = teleportRequest.requestId;
    const body = bodyRef.current;
    body.x = teleportRequest.x;
    body.z = teleportRequest.z;
    if (teleportRequest.yaw !== undefined) body.yaw = teleportRequest.yaw;
    const ground =
      (sampler?.getHeight(body.x, body.z) ?? FALLBACK_GROUND_HEIGHT) +
      (mode === 'fly' ? 1.1 : EYE_HEIGHT);
    body.y = ground;
    body.velocityY = 0;
    body.grounded = mode !== 'fly';
  }, [teleportRequest, mode, sampler]);

  useFrame((_, rawDelta) => {
    if (mode === 'tour') return; // TourRig.tsx owns the camera while a tour is playing.
    const delta = Math.min(rawDelta, MAX_FRAME_DELTA_SECONDS);

    // Mouse-look (Pointer Lock) and touch drag-to-look (`WorldTouchControls.tsx`, outside the
    // Canvas — see `touchInputBridge.ts`) are two independent input sources that both just
    // accumulate a delta; merging them here means a user could even use mouse+touch together
    // without either interfering, though in practice only one is ever active on a given device.
    const mouseLookDelta = look.consume();
    const touchLookDelta = consumeTouchLookDelta();
    const totalDx = mouseLookDelta.dx + touchLookDelta.dx;
    const totalDy = mouseLookDelta.dy + touchLookDelta.dy;
    if (totalDx !== 0 || totalDy !== 0) {
      const { yaw, pitch } = updateLookAngles(
        bodyRef.current.yaw,
        bodyRef.current.pitch,
        totalDx,
        totalDy,
        LOOK_SENSITIVITY,
      );
      bodyRef.current.yaw = yaw;
      bodyRef.current.pitch = pitch;
    }

    if (consumeTouchInteractRequest()) handleInteract();

    const keys = keyboardRef.current;
    const touch = getTouchMovementAsDirections();
    const input: MovementInput = {
      forward: keys.forward || touch.forward,
      backward: keys.backward || touch.backward,
      left: keys.left || touch.left,
      right: keys.right || touch.right,
      run: keys.run || touch.run,
      jumpOrAscend: keys.jumpOrAscend || isTouchAscendHeld(),
    };

    if (mode === 'walk') {
      const groundHeightAt = (x: number, z: number) =>
        (sampler?.getHeight(x, z) ?? FALLBACK_GROUND_HEIGHT) + EYE_HEIGHT;
      bodyRef.current = computeWalkMovement(bodyRef.current, input, delta, groundHeightAt);
    } else if (mode === 'fly') {
      bodyRef.current = computeFlyMovement(bodyRef.current, input, delta, getWorldBounds());
    }

    camera.position.set(bodyRef.current.x, bodyRef.current.y, bodyRef.current.z);
    camera.rotation.set(bodyRef.current.pitch, bodyRef.current.yaw, 0, 'YXZ');

    hudCommitAccumulator.current += rawDelta;
    if (hudCommitAccumulator.current >= HUD_COMMIT_INTERVAL_SECONDS) {
      hudCommitAccumulator.current = 0;
      setPose({
        x: bodyRef.current.x,
        y: bodyRef.current.y,
        z: bodyRef.current.z,
        yaw: bodyRef.current.yaw,
      });
      const nearest = findNearestPoi({ x: bodyRef.current.x, z: bodyRef.current.z });
      setNearestPoi(nearest?.poi.id ?? null, nearest?.distance ?? null);
    }
  });

  return null;
}
