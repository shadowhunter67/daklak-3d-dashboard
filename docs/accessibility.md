# Accessibility

Switching between 3D and 2D moves focus to the newly mounted viewport or directory heading and announces the active view. Browser Back/Forward restoration uses the same focus behavior; hover is intentionally excluded from URL state.

The dashboard provides a searchable keyboard-navigable 2D directory that shares selection state with the 3D experience. It supports reduced motion, visible focus, semantic toggle state, selected rows, useful chart text alternatives, status/live announcements, and a WebGL-unavailable recovery path.

Camera shortcuts (arrow keys and WASD) apply only when focus is outside interactive HTML controls. Buttons, links, search inputs, text fields, selects, and editable content retain their native keyboard behavior.

Playwright runs axe against both 3D and 2D views on Chromium desktop/mobile and WebKit, failing serious or critical violations. Automated checks do not prove WCAG conformance. Before release, manually verify keyboard order, screen-reader names/state, 200% zoom and reflow, contrast, reduced motion, and that every map-only fact has a nonvisual equivalent.

Known boundary: spatial exploration itself is visual. The directory, details, source status, and metrics provide the equivalent operable path; decorative canvas content is not exposed as a giant inaccessible object tree.
