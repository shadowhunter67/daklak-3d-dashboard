import { useEffect, useRef } from 'react';
import { useWorldExplorationStore } from '../../state/worldExplorationStore';

export interface LookDelta {
  dx: number;
  dy: number;
}

/**
 * Desktop mouse-look via the Pointer Lock API: click the canvas to lock the pointer (task's
 * "mouse/touch look"), accumulate raw `movementX`/`movementY` into a ref `PlayerRig.tsx` drains
 * once per frame (`consume()` — matches this hook's own "accumulate between reads" contract, kept
 * as a ref rather than React state for the same 60fps-polling reason `useKeyboardControls.ts`
 * documents). `Esc` releasing the lock is handled by the browser itself (native Pointer Lock
 * behavior) and mirrored into `useKeyboardControls`' `onEscape` -> `document.exitPointerLock()`
 * for the explicit "Esc giải phóng pointer lock" requirement even when the browser's own
 * auto-release doesn't fire it as a keydown in every engine.
 *
 * Mobile has no pointer lock; `WorldTouchControls.tsx` drives look via a separate drag-based
 * gesture that writes into the same ref through `pushDelta`.
 */
export function usePointerLook(enabled: boolean, canvasElement: HTMLElement | null) {
  const accumulated = useRef<LookDelta>({ dx: 0, dy: 0 });
  const setPointerLocked = useWorldExplorationStore((state) => state.setPointerLocked);

  useEffect(() => {
    if (!enabled || !canvasElement) return;

    const handleClick = () => {
      if (document.pointerLockElement !== canvasElement) {
        canvasElement.requestPointerLock?.();
      }
    };
    const handleLockChange = () => {
      setPointerLocked(document.pointerLockElement === canvasElement);
    };
    const handleMouseMove = (event: MouseEvent) => {
      if (document.pointerLockElement !== canvasElement) return;
      accumulated.current.dx += event.movementX;
      accumulated.current.dy += event.movementY;
    };

    canvasElement.addEventListener('click', handleClick);
    document.addEventListener('pointerlockchange', handleLockChange);
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      canvasElement.removeEventListener('click', handleClick);
      document.removeEventListener('pointerlockchange', handleLockChange);
      window.removeEventListener('mousemove', handleMouseMove);
      if (document.pointerLockElement === canvasElement) document.exitPointerLock?.();
      setPointerLocked(false);
    };
  }, [enabled, canvasElement, setPointerLocked]);

  /** Drains and resets the accumulated delta — call exactly once per frame. */
  const consume = (): LookDelta => {
    const delta = accumulated.current;
    accumulated.current = { dx: 0, dy: 0 };
    return delta;
  };

  /** Lets `WorldTouchControls.tsx` feed drag-to-look deltas through the same consumption path. */
  const pushDelta = (dx: number, dy: number) => {
    accumulated.current.dx += dx;
    accumulated.current.dy += dy;
  };

  return { consume, pushDelta };
}
