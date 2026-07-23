# Accessibility

Switching between 3D and 2D moves focus to the newly mounted viewport or directory heading and announces the active view. Browser Back/Forward restoration uses the same focus behavior; hover is intentionally excluded from URL state.

The dashboard provides a searchable keyboard-navigable 2D directory that shares selection state with the 3D experience. It supports reduced motion, visible focus, semantic toggle state, selected rows, useful chart text alternatives, status/live announcements, and a WebGL-unavailable recovery path.

Camera shortcuts (arrow keys and WASD) apply only when focus is outside interactive HTML controls. Buttons, links, search inputs, text fields, selects, and editable content retain their native keyboard behavior.

Playwright runs axe against 3D, 2D, and Executive Overview on Chromium desktop/mobile and WebKit, failing serious or critical violations. Automated checks do not prove WCAG conformance. Before release, manually verify keyboard order, screen-reader names/state, 200% zoom and reflow, contrast, reduced motion, and that every map-only fact has a nonvisual equivalent.

Executive Overview (Phase 2A, the default landing) adds: a skip link (`#executive-overview`, or the current view's own landmark on other views) as the very first focusable element; a heading hierarchy nested under the app's single `<h1>` (brand); KPI cards with an accessible name/value pair and explicit "Chưa đủ dữ liệu" text for an unavailable KPI (never a color- or icon-only cue); alert severity conveyed as text (`Nghiêm trọng`/`Cảnh báo`/`Chất lượng dữ liệu`), never color alone; a project-summary dialog with the same focus-trap/Escape/focus-restore pattern as `DataProvenancePanel`, with the trigger captured at click time (not inferred from `document.activeElement` post-open, which would capture the dialog's own `autoFocus` close button instead — see the code comment in `ProjectSummaryPanel.tsx`); and no auto-focus/auto-opening dialog on first load of the landing page itself.

Known boundary: spatial exploration itself is visual. The directory, details, source status, and metrics provide the equivalent operable path; decorative canvas content is not exposed as a giant inaccessible object tree.
