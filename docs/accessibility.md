# Accessibility

Switching between 3D and 2D moves focus to the newly mounted viewport or directory heading and announces the active view. Browser Back/Forward restoration uses the same focus behavior; hover is intentionally excluded from URL state.

The dashboard provides a searchable keyboard-navigable 2D directory that shares selection state with the 3D experience. It supports reduced motion, visible focus, semantic toggle state, selected rows, useful chart text alternatives, status/live announcements, and a WebGL-unavailable recovery path.

Camera shortcuts (arrow keys and WASD) apply only when focus is outside interactive HTML controls. Buttons, links, search inputs, text fields, selects, and editable content retain their native keyboard behavior.

Playwright runs axe against 3D, 2D, and Executive Overview on Chromium desktop/mobile and WebKit, failing serious or critical violations. Automated checks do not prove WCAG conformance. Before release, manually verify keyboard order, screen-reader names/state, 200% zoom and reflow, contrast, reduced motion, and that every map-only fact has a nonvisual equivalent.

Executive Overview (Phase 2A, the default landing) adds: a skip link (`#executive-overview`, or the current view's own landmark on other views) as the very first focusable element; a heading hierarchy nested under the app's single `<h1>` (brand); KPI cards with an accessible name/value pair and explicit "Chưa đủ dữ liệu" text for an unavailable KPI (never a color- or icon-only cue); alert severity conveyed as text (`Nghiêm trọng`/`Cảnh báo`/`Chất lượng dữ liệu`), never color alone; a project-summary dialog with the same focus-trap/Escape/focus-restore pattern as `DataProvenancePanel`, with the trigger captured at click time (not inferred from `document.activeElement` post-open, which would capture the dialog's own `autoFocus` close button instead — see the code comment in `ProjectSummaryPanel.tsx`); and no auto-focus/auto-opening dialog on first load of the landing page itself.

Known boundary: spatial exploration itself is visual. The directory, details, source status, and metrics provide the equivalent operable path; decorative canvas content is not exposed as a giant inaccessible object tree.

**Data Readiness (Phase 5, `#/data-readiness`):** same conventions as Project Portfolio/Detail — a focused, tabindex-managed `<h2>` on load, `<dl>`/`<dt>`/`<dd>` structure for metadata/counts (not a table, since there's no row-level interaction), and three separately-headed `<section>`s for validation errors / data-quality issues / business alerts so a screen reader user gets the same three-way distinction sighted users get from separate headings, not color alone. Playwright runs the same axe check (serious/critical violations fail) across desktop Chromium/WebKit and mobile Chromium — see `e2e/data-readiness.spec.ts`. Phase 6 adds a "view related project" `<button>` per issue (only rendered when a real project id resolves — never a dead link) and, in Project Detail, an authoritative-snapshot explanation section using a native `<details>/<summary>` disclosure (keyboard-operable by default, no custom focus-trap code needed) — reviewed visually by an independent Codex CLI pass (`reports/ui-review/phase-6/`, `docs/project-data-import/ui-review-process.md`), not just by axe.

## Accessibility-first typography and the "A- / A / A+" control

A pass targeting the app's highest-traffic reading surfaces (header primary
navigation, KPI cards, Executive Overview copy) for the stated audience
(older/low-vision/non-technical users): `:root` in `global.css` defines
`--font-size-label`/`--font-size-body`/`--font-size-control` tokens plus a
`--user-font-scale` multiplier (default `1`); `FontScaleControl.tsx` is a
three-step "A- / A / A+" toggle (0.9/1/1.25 — deliberately discrete, not a
slider, for simple keyboard/screen-reader operation) in the header, persisted
via `localStorage` the same way the language switch persists locale
(`src/a11y/fontScale.ts` mirrors `src/i18n/locale.ts`'s convention). The
tokens are applied to KPI cards, Executive Overview status/badges/error text,
and primary-nav/mode-tabs/header-meta base sizes were raised directly
(11–12px → 13–14px) without wiring them to the scale control.

**Known limitation, not yet done:** the scale control and larger base sizes
do NOT yet reach the ~90 other small-text (`font-size: 8–12px`) declarations
across the map tool panels (distance/radius measurement, layer panel),
Project Portfolio/Detail body copy, or the data-sources/provenance panels —
this was a deliberate first increment (bounded scope, fully verified for
overlap at 6 viewport widths) rather than a blind pass over every selector in
a ~3,300-line stylesheet. A second pass extending the same tokens to those
surfaces is the natural next step. Also not done: a light theme or a
high-contrast visual mode (`data-theme`) — the current single dark theme
already has high contrast (`#e9f2ed` on `#071918`, comfortably past WCAG
AAA's 7:1 for body text), and a rushed, partially-retrofitted light theme
across every hardcoded color literal in the stylesheet was judged a worse
outcome than shipping none this pass; the font-scale control was prioritized
instead since it addresses the same "người mắt kém" need without that
stylesheet-wide blast radius.

## 102-label accessibility layout engine (detail map)

Hard product requirement: all 102 xã/phường names must always be visible on
the MapLibre detail map (`?view=map`) — never hidden by zoom-level thinning
or collision culling. Previously the ward-name symbol layer had neither
`text-allow-overlap` nor `text-ignore-placement` set, so MapLibre's own
collision detection silently thinned overlapping labels at low zoom.

`src/components/detail-map/wardLabelPlacement.ts` is a pure, MapLibre-free
greedy label-displacement engine: labels are sorted by priority (ward/urban
centres first), each tries its true geographic anchor first, then 8 compass
directions at 3 increasing radii, picking the first collision-free placement
or the one with least overlap — a label is always placed, never dropped. The
base symbol layer also sets `text-allow-overlap`/`text-ignore-placement` as
a correctness floor independent of the displacement pass. A thin leader line
(`WARD_LABEL_LEADER_LAYER_ID`) draws back to a label's true point when the
displacement is large enough to need one. `MapLibreProvider.
recomputeWardLabelPlacement()` re-runs this on every `moveend` (pan/zoom
settle). 17 unit tests, including one exercising all 102 real ward labels at
once. Live-verified: at province-wide zoom, the previously-dense Phú Yên
coastal cluster now shows every name, nudged apart instead of thinned.

**Known limitation:** this only covers the 2D MapLibre detail map. The React
Three Fiber 3D overview (`?view=3d`) still bakes administrative labels as a
texture on the terrain mesh (`MapAnnotations.tsx`/`administrativeLabelLayout.
ts`) with no collision handling — out of scope for this pass since 3D is
explicitly a secondary visualization capability, not the product's GIS/
operational surface (see the product-direction note this pass was scoped
against). The non-map accessible directory (`AccessibleDirectory`) already
lists all 102 units as plain text regardless, so no information is
inaccessible — the limitation is a 3D-view readability/polish gap, not a
data-access gap.

## Automated overlap/overflow regression tests

`e2e/layoutAssertions.ts` (`expectNoOverlap`/`expectNoHorizontalOverflow`)
and `e2e/layout-regression.spec.ts` (16 tests across 320/390/768/1024/1280/
1920px) turn "does this card visually collide with that one" into a
machine-checkable assertion, covering the header/brand/nav/KPI cards, the
detail map's floating header/sidebar-toggle/layer-panel buttons (a direct
regression test for two previously-live overlap bugs), and the font-scale
control at its largest step. Not a substitute for manual verification at the
full 10-viewport acceptance matrix, but catches the class of bug that has
recurred most on this project.
