# Phase 6 UI review — final summary

**Final commit:** `e10bd12da174af571b48b356a696740bf52fa2d0` (branch
`feature/phase6-public-projection-ui-review`)

**Result: PASS** (Codex CLI, iteration 03 — see `../iteration-03/codex-review.md`)

## Rounds

1. **Iteration 01** — initial review, 5 screenshots (1440×900 + 390×844, vi/en), routes
   `#/projects/prj-013`, `#/projects/prj-015`, `#/data-readiness`. Result: **FAIL** — 3 HIGH
   (UX-001 KPI provenance unclear, UX-002 mobile horizontal overflow, UX-003 hardcoded
   Vietnamese reason text breaking the English locale) + 3 MEDIUM (UX-004 missing card
   styling, UX-005 raw camelCase KPI identifiers, UX-006 no visual distinction between
   selected/excluded competing records).
2. **Iteration 02** — re-screenshotted (via fresh browser tabs, working around a headless-Chrome
   capture bug identified this round — see below) after fixing all 6 findings. Result: **FAIL** —
   UX-002 through UX-005 confirmed fixed; UX-006 accepted as non-blocking; UX-001's fix was an
   improvement but didn't yet meet the original acceptance check (didn't state KPI _source_ and
   _verification status_ explicitly).
3. **Iteration 03** — focused re-check of UX-001 only, after strengthening the warning copy.
   Result: **PASS**.

## Findings, final status

| ID     | Severity | Status                                         |
| ------ | -------- | ---------------------------------------------- |
| UX-001 | HIGH     | Fixed (iteration 03)                           |
| UX-002 | HIGH     | Fixed (iteration 02)                           |
| UX-003 | HIGH     | Fixed (iteration 02)                           |
| UX-004 | MEDIUM   | Fixed (iteration 02)                           |
| UX-005 | MEDIUM   | Fixed (iteration 02)                           |
| UX-006 | MEDIUM   | Deferred, accepted as non-blocking by reviewer |

0 BLOCKER, 0 unresolved HIGH, all MEDIUM fixed or explicitly accepted with reason — meets the
UI pass bar.

## A genuine tooling limitation found and worked around

`take_screenshot` (chrome-devtools MCP) intermittently returned a solid-black frame for
full-page and even element-scoped captures on this WebGL-heavy app, reproduced across multiple
routes mid-session. Opening a **fresh browser tab** per screenshot reliably avoided it. This
explains iteration 01's blank `data-readiness-desktop-vi.png` — the re-capture in iteration 02
(`data-readiness-desktop-vi-freshtab.png`) confirms the page itself always rendered correctly
(the accessibility-tree snapshot taken at the same time as the blank screenshot already showed
correct content). This is a capture-tooling issue, not an application defect — recorded here so
future rounds don't waste time re-diagnosing it.

## What this review round did NOT cover (honest scope limits)

- Only 2 of the 5 spec-requested viewports were exercised (1440×900, 390×844) — 1280×800,
  768×1024, and 320×700 were not captured.
- Loading/error/degraded states of the new UI were not screenshotted, only verified by reading
  code and existing unit tests.
- No automated contrast measurement — contrast observations are qualitative (CSS + screenshot
  reading), not tool-measured.
- Executive Overview, `#/projects` list, `DataHealthPanel`, and public-static UI were not part of
  this review (no UI changes were made to them in Phase 6).
- Keyboard-focus-visibility screenshots (`:focus-visible` states) were not captured, only
  confirmed to exist in global CSS by reading the stylesheet.

## Codex CLI invocation record

- Version: `codex-cli 0.144.1` / model `gpt-5.6-sol` (as reported by `codex exec` banner).
- Real command shape used: `codex exec -s read-only -C <repo-root> -i <path.png> [-i <path.png> ...] - < prompt.txt`
  (prompt piped via stdin — passing a multi-line prompt as a positional CLI argument failed
  silently in this shell in one earlier attempt, hence the stdin form).
- 3 invocations total (one per iteration above), each read the relevant review-brief/prior-review
  files and the changed source files itself via its own sandboxed shell access (read-only), then
  produced a structured findings report.
