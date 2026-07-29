# Phase 6 UI review — iteration 01

## Commit under review

`eede3a966008fc5129124e1f01c65a4dec1a1a4e` (branch `feature/phase6-public-projection-ui-review`)

## Phase goal

Phase 6 adds a public data projection engine, hardens the portfolio-data-mode leakage guard, and
(this UI-facing slice) adds a "which progress snapshot backs the current KPIs, and why" explanation
to Project Detail, plus a "view related project" drill-down from Data Readiness issues.

## UI changes in this diff

1. **Project Detail** (`src/features/project-detail/ProjectDetailView.tsx`): new section "Snapshot
   dùng để tính KPI" / "Snapshot used for KPIs", inserted between "Progress history" and "Issues".
   Shows: observation date, verification status, confidence (if present), selection reason,
   affected KPI list, other observation dates, and — when more than one competing record exists for
   the same observation — an expandable native `<details>` list of every competing record with a
   "✓ Selected" badge or an exclusion reason.
2. **Data Readiness** (`src/features/data-readiness/DataReadinessView.tsx`): each data-quality/
   business-alert issue now shows a "Xem dự án liên quan" / "View related project" button when a
   real project id can be resolved for that issue (never rendered for unresolvable issues — no dead
   links).

## User goal

An operator looking at a project's KPIs should be able to tell, without reading source code,
_which_ progress observation those numbers came from, why that one and not a competing
verification-stage record, and whether anything is stale/rejected/superseded. An operator scanning
Data Readiness alerts should be able to jump straight to the affected project.

## Acceptance criteria for this slice

- No new field is shown when the underlying data is absent (no "0" standing in for missing data).
- Bilingual (vi/en) — static labels are translated via the existing i18n dictionary.
- Keyboard-operable disclosure (native `<details>`/`<summary>`), no custom JS focus trap needed.
- No console errors on any of the routes below.
- Data Readiness never renders a drill-down button for an issue with no resolvable project.

## Routes reviewed

- `#/projects/prj-013` (Education project, two progress-snapshot records for the same observation —
  `raw` losing to `reviewed` — exercises the expandable competing-records list)
- `#/projects/prj-015` (Energy project, most recent observation has ONLY a `rejected` record —
  exercises the "no snapshot selected" branch)
- `#/data-readiness` (three business alerts, all three now show a working drill-down button)

## Viewports

- 1440×900 (desktop) — primary
- 390×844 (mobile) — spot-checked on the new section only (full-page screenshot capture was
  unreliable in this environment for the map-heavy pages; see "Known limitations")

## Languages

- Vietnamese (default)
- English (`?lang=en`)

## States captured

- Selected snapshot with reason + affected KPIs + collapsed competing-records disclosure
  (prj-013, vi, desktop) — `project-detail-prj013-desktop-vi-expanded.png` (after clicking to expand)
- No snapshot selected for the latest observation, single competing record shown inline, no
  disclosure toggle (only 1 record ⇒ nothing to disclose) (prj-015, vi, desktop) —
  `project-detail-prj015-desktop-vi.png`
- Same selected-snapshot case in English (prj-013, en, desktop) —
  `project-detail-prj013-desktop-en-snapshot-section.png`
- Expanded competing-records disclosure, mobile viewport, element-scoped capture (prj-013, vi,
  390×844) — `project-detail-prj013-mobile-vi-snapshot-section.png`
- Data Readiness with three business alerts + drill-down buttons (vi, desktop) —
  `data-readiness-desktop-vi.png`

## Code files for this slice

- `src/entities/project/validation/authoritativeSnapshotExplanation.ts` (+ test) — pure view-model,
  reuses `selectAuthoritativeSnapshot`/`groupSnapshotsByIdentity` unchanged.
- `src/features/project-detail/ProjectDetailView.tsx`, `model/buildProjectDetailViewModel.ts`,
  `model/projectDetailTypes.ts`.
- `src/features/data-readiness/DataReadinessView.tsx`,
  `model/buildDataReadinessViewModel.ts` (`resolveIssueProjectId`), `model/dataReadinessTypes.ts`.
- `src/i18n/messages/{vi,en}.ts` — new `detail.snapshotExplanation.*`, `progressVerificationStatus.*`,
  `dataReadiness.issue.openProject` keys.
- `src/App.tsx` — wires `onOpenProject` into `DataReadinessView`.

## Known limitations of this review round

- Only 2 of the 5 spec-requested viewports were exercised (1440×900 and 390×844); 1280×800,
  768×1024, and 320×700 were not captured in this round.
- Only the changed section/route was screenshotted at mobile width (element-scoped, not full-page)
  because full-page capture of the WebGL/map-bearing pages timed out repeatedly in this headless
  environment.
- Loading/error/degraded states of the new UI were not screenshotted (verified only by reading the
  component code and existing unit tests, not visually).
- This is a single review round, not the full 3-round loop the process ideally uses.

## Design decisions worth a second opinion

- The dynamic "selection reason" / exclusion-reason sentences shown in the snapshot-explanation
  section are always Vietnamese, even when the UI locale is English — only the static label
  ("Selection reason:" / "Lý do chọn:") is translated. This matches the existing repo convention for
  `DataQualityIssue.message` (shown raw, untranslated, in Data Readiness) but is visible for the
  first time inside a bilingual detail page rather than a diagnostics list.
- `affectedKpis` names raw domain field identifiers (`overallProgress`, `disbursementRate`, ...) —
  not translated KPI labels — since it's meant to name a `KpiResult`-adjacent list corroborated by
  the snapshot, not a fully polished sentence.

## Previous findings

None — this is iteration 01.
