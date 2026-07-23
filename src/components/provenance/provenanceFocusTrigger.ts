/**
 * `DataProvenancePanel` is a dialog that autoFocuses its own close button on mount (see that
 * file). React applies `autoFocus` synchronously during the commit/layout phase, before any
 * passive `useEffect` runs — so by the time a `useEffect` inside the dialog itself runs,
 * `document.activeElement` is already the dialog's own close button, not whatever the user
 * clicked to open it. Reading `document.activeElement` inside the dialog's own mount effect is
 * the same root-cause bug that was fixed in `ProjectSummaryPanel` (see that file's comment).
 *
 * The dialog has two independent trigger sites (`DashboardHeader` and `DataHealthPanel`), so a
 * single hardcoded fallback id isn't enough to restore focus to the right place. Each trigger
 * calls `captureProvenanceFocusTrigger(event.currentTarget)` synchronously in its own click
 * handler — before the store update that mounts the dialog — and `DataProvenancePanel` reads it
 * once on mount instead of inspecting `document.activeElement`.
 */
let lastTrigger: HTMLElement | null = null;

export function captureProvenanceFocusTrigger(element: HTMLElement | null): void {
  lastTrigger = element;
}

export function consumeProvenanceFocusTrigger(): HTMLElement | null {
  const trigger = lastTrigger;
  lastTrigger = null;
  return trigger;
}
