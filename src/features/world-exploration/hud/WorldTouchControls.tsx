import { useRef } from 'react';
import { useTranslation } from '../../../i18n/useTranslation';
import {
  pushTouchLookDelta,
  requestTouchInteract,
  resetTouchMovementVector,
  setTouchAscendHeld,
  setTouchMovementVector,
} from '../player/input/touchInputBridge';
import { useWorldExplorationStore } from '../state/worldExplorationStore';

/** Half the joystick base's on-screen radius in CSS pixels — must match `.world-hud__joystick`'s
 * `width`/2 in `global.css`; kept as one constant here rather than reading layout at drag time
 * (`getBoundingClientRect` on every `pointermove` would be needless render-loop-adjacent work). */
const JOYSTICK_RADIUS_PX = 44;
/** CSS pixels of drag == one `updateLookAngles` "mouse movementX/Y pixel" — touch has no native
 * `movementX/Y`, so this is derived from consecutive pointer positions instead; tuned so a
 * comfortable thumb swipe covers roughly a quarter turn. */
const LOOK_PX_TO_DELTA = 1;

/**
 * Minimal mobile controls (task section 10): a drag joystick for movement, a drag-anywhere-else
 * area for look, one Interact button. Mode-switch/teleport/exit are already real `<button>`s in
 * the rest of the HUD (`WorldModeSwitch.tsx`, `WorldHud.tsx`'s back-to-overview link) — already
 * touch-usable without a mobile-specific duplicate. Hidden on fine-pointer (mouse) devices via
 * `@media (pointer: coarse)` in `global.css`, not by a JS device-detection heuristic — the CSS
 * media feature is the more reliable signal.
 */
export function WorldTouchControls() {
  const { t } = useTranslation();
  const mode = useWorldExplorationStore((state) => state.mode);
  const poiListOpen = useWorldExplorationStore((state) => state.poiListOpen);
  const teleportMenuOpen = useWorldExplorationStore((state) => state.teleportMenuOpen);
  const onboardingOpen = useWorldExplorationStore((state) => state.onboardingOpen);

  const joystickOrigin = useRef<{ x: number; y: number } | null>(null);
  const joystickPointerId = useRef<number | null>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const lookPointerId = useRef<number | null>(null);
  const lookLastPosition = useRef<{ x: number; y: number } | null>(null);

  const active =
    (mode === 'walk' || mode === 'fly') && !poiListOpen && !teleportMenuOpen && !onboardingOpen;
  if (!active) return null;

  const handleJoystickPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    joystickPointerId.current = event.pointerId;
    joystickOrigin.current = { x: event.clientX, y: event.clientY };
  };

  const handleJoystickPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (joystickPointerId.current !== event.pointerId || !joystickOrigin.current) return;
    const dx = event.clientX - joystickOrigin.current.x;
    const dy = event.clientY - joystickOrigin.current.y;
    const clampedX = Math.max(-JOYSTICK_RADIUS_PX, Math.min(JOYSTICK_RADIUS_PX, dx));
    const clampedY = Math.max(-JOYSTICK_RADIUS_PX, Math.min(JOYSTICK_RADIUS_PX, dy));
    setTouchMovementVector({
      x: clampedX / JOYSTICK_RADIUS_PX,
      z: clampedY / JOYSTICK_RADIUS_PX,
      run: false,
    });
    if (knobRef.current) {
      knobRef.current.style.transform = `translate(${clampedX}px, ${clampedY}px)`;
    }
  };

  const endJoystick = (event: React.PointerEvent<HTMLDivElement>) => {
    if (joystickPointerId.current !== event.pointerId) return;
    joystickPointerId.current = null;
    joystickOrigin.current = null;
    resetTouchMovementVector();
    if (knobRef.current) knobRef.current.style.transform = 'translate(0, 0)';
  };

  const handleLookPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    lookPointerId.current = event.pointerId;
    lookLastPosition.current = { x: event.clientX, y: event.clientY };
  };

  const handleLookPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (lookPointerId.current !== event.pointerId || !lookLastPosition.current) return;
    const dx = event.clientX - lookLastPosition.current.x;
    const dy = event.clientY - lookLastPosition.current.y;
    lookLastPosition.current = { x: event.clientX, y: event.clientY };
    pushTouchLookDelta(dx * LOOK_PX_TO_DELTA, dy * LOOK_PX_TO_DELTA);
  };

  const endLook = (event: React.PointerEvent<HTMLDivElement>) => {
    if (lookPointerId.current !== event.pointerId) return;
    lookPointerId.current = null;
    lookLastPosition.current = null;
  };

  return (
    <div className="world-hud__touch-controls">
      <div
        className="world-hud__touch-look"
        aria-hidden="true"
        onPointerDown={handleLookPointerDown}
        onPointerMove={handleLookPointerMove}
        onPointerUp={endLook}
        onPointerCancel={endLook}
      />
      <div
        className="world-hud__joystick"
        role="slider"
        aria-label={t('worldExploration.touch.moveAria')}
        aria-valuemin={-1}
        aria-valuemax={1}
        aria-valuenow={0}
        onPointerDown={handleJoystickPointerDown}
        onPointerMove={handleJoystickPointerMove}
        onPointerUp={endJoystick}
        onPointerCancel={endJoystick}
      >
        <div ref={knobRef} className="world-hud__joystick-knob" />
      </div>
      {mode === 'fly' && (
        <button
          type="button"
          className="world-hud__touch-ascend"
          onPointerDown={() => setTouchAscendHeld(true)}
          onPointerUp={() => setTouchAscendHeld(false)}
          onPointerCancel={() => setTouchAscendHeld(false)}
        >
          ↑
        </button>
      )}
      <button
        type="button"
        className="world-hud__touch-interact"
        aria-label={t('worldExploration.touch.interactButtonAria')}
        onClick={() => requestTouchInteract()}
      >
        {t('worldExploration.touch.interactButton')}
      </button>
    </div>
  );
}
