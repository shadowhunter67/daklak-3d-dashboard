import { useEffect, useRef } from 'react';

export interface KeyboardControlsState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  /** Walk: run. Fly: descend — see `playerMovement.ts`'s `MovementInput` doc comment. */
  run: boolean;
  /** Walk: jump (held Space keeps auto-hopping on landing — a deliberate simplification, not
   * edge-triggered; see this hook's own doc comment). Fly: ascend (held). */
  jumpOrAscend: boolean;
}

function createEmptyState(): KeyboardControlsState {
  return {
    forward: false,
    backward: false,
    left: false,
    right: false,
    run: false,
    jumpOrAscend: false,
  };
}

const MOVEMENT_KEYS: Record<string, keyof KeyboardControlsState> = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyS: 'backward',
  ArrowDown: 'backward',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  ShiftLeft: 'run',
  ShiftRight: 'run',
  Space: 'jumpOrAscend',
};

/**
 * Tracks WASD/arrow-key/Shift/Space movement state in a plain ref, not React state — this is
 * read once per `useFrame` tick (up to 60x/second) by `PlayerRig.tsx`, and re-rendering a React
 * component on every keydown/keyup would be wasted work for state nothing in the render tree
 * actually displays. `onInteract` (E) and `onEscape` (Esc) are one-shot key events, so they stay
 * as plain callbacks instead of polled state — the task calls both out as discrete actions, not
 * continuous input, and jump's "held = auto-hop on landing" behavior (see `KeyboardControlsState`)
 * is an intentional simplification: it is not applied to `E`/`Esc`, which must fire exactly once
 * per press regardless of how long the key is held.
 *
 * Deliberately does not call `preventDefault()` on Tab or other browser-navigation keys — only
 * the specific keys this scene actually uses are intercepted (see `MOVEMENT_KEYS`/the `KeyE`/
 * `Escape` checks below), so keyboard-only navigation of the surrounding HUD (buttons, POI list)
 * is never blocked by this hook.
 */
export function useKeyboardControls(
  enabled: boolean,
  onInteract: () => void,
  onEscape: () => void,
) {
  const stateRef = useRef<KeyboardControlsState>(createEmptyState());

  useEffect(() => {
    if (!enabled) {
      stateRef.current = createEmptyState();
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const field = MOVEMENT_KEYS[event.code];
      if (field) {
        stateRef.current[field] = true;
        event.preventDefault();
        return;
      }
      if (event.code === 'KeyE') {
        onInteract();
        event.preventDefault();
        return;
      }
      if (event.code === 'Escape') {
        onEscape();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const field = MOVEMENT_KEYS[event.code];
      if (field) {
        stateRef.current[field] = false;
        event.preventDefault();
      }
    };

    // Held keys must not "stick" if focus leaves the window mid-press (e.g. alt-tab) — otherwise
    // the player would keep walking forever with no way to release the key.
    const handleBlur = () => {
      stateRef.current = createEmptyState();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      stateRef.current = createEmptyState();
    };
  }, [enabled, onInteract, onEscape]);

  return stateRef;
}
