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

/**
 * Review finding F-012: `element.isConnected` alone is not enough to decide whether
 * `element.focus()` will actually move focus — an element can stay connected to the DOM while a
 * responsive breakpoint sets `display: none` on it (e.g. `.header-secondary-control` at narrow
 * viewports, see `src/styles/global.css`). Calling `.focus()` on such an element silently no-ops,
 * so focus falls through to `<body>` instead of returning anywhere a keyboard user can see —
 * reproduced by opening this dialog via a still-visible trigger, then closing after the viewport
 * narrows past the breakpoint that hides the original trigger.
 *
 * Deliberately checks computed `display`/`visibility` rather than layout geometry (e.g.
 * `getClientRects()`/`offsetParent`, which jsdom never populates because it does not run a layout
 * engine) so this stays correct under both the real browser and the existing jsdom test suite.
 */
export function isFocusable(element: HTMLElement | null): element is HTMLElement {
  if (!element || !element.isConnected) return false;
  const style = getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden';
}
