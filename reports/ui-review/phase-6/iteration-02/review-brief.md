# Phase 6 UI review — iteration 02 (re-review after fixes)

## Commit under review

Working tree on top of `eede3a966008fc5129124e1f01c65a4dec1a1a4e` (branch
`feature/phase6-public-projection-ui-review`) — fixes for iteration-01 findings applied, not yet
committed at the time of this review.

## What changed since iteration 01

Addressing `reports/ui-review/phase-6/iteration-01/codex-review.md` (UX-001..UX-006):

- **UX-001 (HIGH)** — `ProjectDetailView.tsx` now shows a `role="note"` warning directly inside the
  "Budget and progress summary" section when the most recent observation has no selected snapshot,
  naming the observation date and pointing at the snapshot-explanation section below. No longer
  possible to read the top KPIs without seeing this caveat.
- **UX-002 (HIGH)** — `global.css`: `.project-detail__card` gets `min-width: 0`, `.project-detail__card p`
  gets `overflow-wrap: anywhere`. Long `sourceRecordId`/identity strings now wrap inside their card
  instead of overflowing horizontally at mobile widths.
- **UX-003 (HIGH)** — `authoritativeSnapshotExplanation.ts` no longer returns hardcoded Vietnamese
  sentences. `selectedReason`/`exclusionReason` are now `{ code, ...params }` structured objects;
  `ProjectDetailView.tsx` translates them via new i18n keys
  (`detail.snapshotExplanation.selectionReasonCode.*`, `...exclusionReasonCode.*`). Verified in
  English: the whole sentence is now English.
- **UX-004 (MEDIUM)** — `.project-detail__snapshot-explanation` added to the shared section-card
  selector list in `global.css`, so it now gets the same margin/padding/border/radius/background as
  every other Project Detail section.
- **UX-005 (MEDIUM)** — `affectedKpis` are now translated via new `affectedKpiLabel.*` keys
  ("Physical progress", "Disbursement rate", ...) instead of raw camelCase identifiers.
- **UX-006 (MEDIUM, not addressed this round)** — visual distinction between selected/excluded
  competing records (badge/status styling beyond the ✓ text prefix) was NOT changed. Decision
  recorded in `claude-resolution.md`.

## Known capture-tooling issue (not an app defect) worth noting again

In iteration 01, `data-readiness-desktop-vi.png` was blank/dark. Root cause identified: `take_screenshot`
without a fresh browser tab intermittently returns an all-black frame on this WebGL-heavy app in this
headless environment (reproduced identically for Project Detail routes too, mid-session, after
several navigations). Opening a **new tab** per screenshot reliably fixed it — all iteration-02
screenshots were taken this way. Iteration-01's blank image was very likely this same capture bug,
not a rendering defect in the Data Readiness page (confirmed by the accessibility-tree snapshot taken
at the same time, which showed correct content).

## Screenshots (all via fresh tab, 1440×900 unless noted)

- `project-detail-prj015-desktop-vi-freshtab.png` — UX-001 fix, top of page.
- `project-detail-prj015-desktop-vi-scrolled.png` — UX-004 fix (snapshot-explanation section now
  has the same card chrome as its neighbors).
- `project-detail-prj013-desktop-en-expanded.png` — UX-003 + UX-005 fix, English, disclosure
  expanded.
- `project-detail-prj013-mobile-en-expanded.png` — 390×844, UX-002 fix (no horizontal overflow).
- `data-readiness-desktop-vi-freshtab.png` — full page, 3 business alerts with working drill-down
  buttons (re-capture of iteration-01's blank image).

## Ask

Confirm each of UX-001 through UX-005 is resolved per its acceptance check from iteration 01.
UX-006 was deliberately deferred — say whether that's acceptable to ship without, or whether it
should block.
