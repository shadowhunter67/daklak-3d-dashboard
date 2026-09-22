import { isFocusable } from '../provenance/provenanceFocusTrigger';

/**
 * Same focus-return mechanism as `provenanceFocusTrigger.ts` (see that file's doc comment for
 * why `document.activeElement` can't be read reliably inside the dialog's own mount effect), kept
 * as its own module-scope singleton because `AboutPanel` is an independent trigger site from
 * `DataProvenancePanel`. `isFocusable` itself is shared — it has no per-dialog state.
 */
let lastTrigger: HTMLElement | null = null;

export function captureAboutFocusTrigger(element: HTMLElement | null): void {
  lastTrigger = element;
}

export function consumeAboutFocusTrigger(): HTMLElement | null {
  const trigger = lastTrigger;
  lastTrigger = null;
  return trigger;
}

export { isFocusable };
