# Resolution — iteration 01 findings

| Finding | Decision | Reason | Files changed |
|---|---|---|---|
| UX-001 (HIGH) | accepted | KPI summary gave no indication that the most recent observation had no valid snapshot. Added a `role="note"` warning inside the summary section. | `ProjectDetailView.tsx`, `vi.ts`, `en.ts` (further strengthened in iteration 02 after a second FAIL) |
| UX-002 (HIGH) | accepted | Long `sourceRecordId`/identity strings overflowed the card horizontally at 390px width — a real mobile-usability defect, not a design nitpick. | `global.css` (`min-width: 0`, `overflow-wrap: anywhere`) |
| UX-003 (HIGH) | accepted | `authoritativeSnapshotExplanation.ts` hardcoded Vietnamese sentences for `selectedReason`/`exclusionReason`, unusable in the `en` locale. Reworked to return `{code, ...params}` and moved sentence construction into the i18n-aware UI layer. | `authoritativeSnapshotExplanation.ts` (+ test), `ProjectDetailView.tsx`, `vi.ts`, `en.ts` |
| UX-004 (MEDIUM) | accepted | `.project-detail__snapshot-explanation` was missing from the shared section-card CSS selector list, so the new section didn't match its siblings' outer chrome. | `global.css` |
| UX-005 (MEDIUM) | accepted | `affectedKpis` rendered raw camelCase identifiers (`overallProgress`, ...) instead of human labels. Added `affectedKpiLabel.*` dictionary entries. | `ProjectDetailView.tsx`, `vi.ts`, `en.ts` |
| UX-006 (MEDIUM) | rejected (deferred) | Visual badge/status-hierarchy distinction between selected and excluded competing records is a real polish item, but Codex's own iteration-02 assessment confirmed it's "acceptable to ship without" — status is still readable as text, no data is lost, no interaction is broken. Deferred to a future iteration rather than expanding this round's scope further. | none this round |

Verification: all fixes re-screenshotted (fresh browser tab, see iteration-02/) and re-reviewed by
Codex CLI in iteration 02; UX-002 through UX-005 confirmed fixed there. UX-001 required a second
pass (iteration 03) before Codex confirmed it satisfied the original acceptance check.
