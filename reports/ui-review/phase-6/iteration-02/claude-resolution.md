# Resolution — iteration 02 findings

Codex re-review (iteration 02) confirmed UX-002, UX-003, UX-004, UX-005 fixed and UX-006 acceptable
to ship without blocking. It kept UX-001 open:

| Finding | Decision | Reason |
|---|---|---|
| UX-001 (HIGH) | accepted, needed a second pass | The iteration-01 fix (a generic "may not reflect the latest data" note) improved discoverability but didn't satisfy the original acceptance check: a reader must be able to tell the KPIs' **source** and **verification status** from the summary alone. Strengthened the message to state explicitly that the KPIs are computed directly from the project's own summary fields (not from a progress snapshot) and that their verification status is unclear when no snapshot corroborates them. See `vi.ts`/`en.ts` `detail.summary.noAuthoritativeSnapshotWarning`, re-verified in iteration 03. |

No other findings were reopened. No regressions were found in this round's five screenshots.
