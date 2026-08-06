# Phase status — Đắk Lắk Tourism Digital Twin

- Current phase: **T0 (assessment) + T1 (world-exploration route foundation)** — complete, per the
  task's explicit stop-after-this-milestone instruction. T2+ not started.
- Baseline SHA reviewed: `1741ed0cdee017b9eeee896ac651cc9800af8e39` (main)
- Actual base SHA this branch forked from: `1741ed0cdee017b9eeee896ac651cc9800af8e39` (identical —
  confirmed via `git log -5 --oneline` at session start, no drift on `main` during this session)
- Branch: `feat/tourism-world-foundation` (merged into `main`)
- Final pre-merge head SHA (all CI green): `699053ba0ca8b590b0d0d70835825c1657f3aa67` (PR body/CI
  discussion also references `88e1e71`, a docs-only follow-up on top of it finalizing this same
  report — also all-green before merge)
- **Merge commit on `main`: `2c8ebc08f751fed1a0cfecfdbb13ebd69c0f681c`**
- PR: https://github.com/shadowhunter67/daklak-3d-dashboard/pull/76 (state: MERGED)

## What's verified, and how

### Verified from source (read the actual files, cited by path)

- `reports/tourism-digital-twin/architecture-assessment.md` — full inventory of the existing
  routing, `3d` view, camera, GIS pipeline, entities boundary, and accessibility conventions.
- `reports/tourism-digital-twin/world-engine-adr.md` — the Option A (extend R3F) vs. Option B
  (Cesium) decision, with every claim tied to a specific file/line/constant found in the repo.

### Verified by command (actually run on this branch, exit codes checked)

| Command                                                       | Result                                                                                                                           |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `git status --short` / `git log -5 --oneline` (session start) | clean, baseline confirmed                                                                                                        |
| `npm ci`                                                      | 338 packages installed, 0 vulnerabilities                                                                                        |
| `npm run typecheck`                                           | pass                                                                                                                             |
| `npm run lint`                                                | pass                                                                                                                             |
| `npm run format:check`                                        | pass (after a follow-up commit fixing 3 files CI's format:check caught that a stale local run had missed — see commit `b3527f3`) |
| `npm test` (vitest)                                           | **113 test files / 1155 tests passed**, 0 failed                                                                                 |
| `node scripts/check_i18n_hardcoded_strings.mjs`               | "No hard-coded visible Vietnamese strings found outside src/i18n/messages/\*\*."                                                 |
| `npm run build`                                               | pass — `dist/assets/WorldExplorationView-*.js` emitted as its own chunk, **4.09 KB raw / 1.91 KB gzip**                          |
| `npm run check:budget`                                        | pass, **0 failures** (all 6 budget dimensions under limit)                                                                       |
| `npm run build:metrics`                                       | Budget: passed; JS gzip 0.73 MiB total (limit 0.93 MiB)                                                                          |

### Verified by this agent's own runtime check (real browser, not just source reading)

- `npx playwright install --with-deps chromium` then `npx playwright test
--config=playwright.prod.config.ts --project=desktop-chromium` against the real production build
  (`npm run preview`), full existing suite plus the new `e2e/world-exploration.spec.ts`:
  **96 passed, 2 pre-existing skipped (visual-baseline tests unrelated to this change), 0 failed.**
- Confirmed via real network-response interception in Chromium: `?view=overview`, `?view=3d`,
  `?view=2d`, `?view=map` never request `WorldExplorationView-*.js`; `?view=world` does, and only
  then.
- Confirmed the illustrative scene actually renders in a real WebGL context (Chromium/SwiftShader):
  canvas becomes visible inside `#world-viewport`, the `"ILLUSTRATIVE — KỊCH BẢN MINH HỌA"` badge
  and title/tagline are visible, zero `pageerror` events, zero unexpected `console.error` (the one
  excluded category — blocked Google Analytics/GTM beacons — is the same pre-existing sandbox
  network artifact already excluded in `dashboard.spec.ts`).

### CI status (GitHub Actions, PR #76)

All jobs pass on head SHA `699053ba0ca8b590b0d0d70835825c1657f3aa67`, confirmed via `gh pr checks
76`: `static-analysis`, `security`, `build-and-budget`, `contract-and-modes`, `unit-and-data`,
`analyze (javascript-typescript)`, `analyze (python)`, `review`, and both `e2e` matrix runs (13m8s
and 33m30s — the longer of the two runs all three Playwright projects: desktop-chromium,
mobile-chromium, desktop-webkit).

## Open blockers

None. Two CI-only issues surfaced and were fixed during this session (both are process/test fixes,
not design blockers):

1. `format:check` failed on the first CI run (commit `38f5237`) because 3 files (the new e2e spec
   and the two T0 report `.md` files) were added after the last local Prettier run. Fixed in commit
   `b3527f3`.
2. The `e2e` job failed on `mobile-chromium` (commit `b3527f3`): `e2e/world-exploration.spec.ts`
   asserted the route's title/tagline caption was unconditionally visible, but that caption reuses
   the existing `.map-caption` CSS class, which `global.css` already hides at `max-width: 767px` —
   the same rule the pre-existing `3d` view's caption is already subject to. This was a test bug
   (asserting behavior the app never actually had at that viewport), not a product regression.
   Fixed in commit `699053b` by making that one assertion viewport-width-aware; re-verified locally
   against all three CI browser projects (desktop-chromium, mobile-chromium, desktop-webkit — all
   pass) before pushing, then confirmed green in CI itself.

## Merge status

**Merged.** All conditions in the task's auto-merge authorization (rule #9) were met: PR taken out
of draft, all CI checks green on the exact pushed SHA (first `699053b`, then re-confirmed green
again on the docs-only follow-up `88e1e71` before merging), this agent's own Playwright runtime
verification passed both locally and in CI, `check:budget` passed without any threshold changes
(`check_build_budget.mjs`'s existing limits were not touched), and the change is additive/scoped
exactly as described (diff limited to `src/utils/dashboardUrl.ts`, `src/App.tsx`,
`src/components/layout/DashboardPanels.tsx`, `src/i18n/messages/{vi,en}.ts`, new files under
`src/features/world-exploration/`, `e2e/world-exploration.spec.ts`, and `reports/`).

PR #76 was merged via `gh pr merge 76 --merge` (regular merge commit, matching this repo's existing
convention — see `git log`'s prior "Merge pull request #NN" commits), producing merge commit
`2c8ebc08f751fed1a0cfecfdbb13ebd69c0f681c` on `main`. Confirmed via `git fetch origin main && git
log origin/main` that `main` advanced from `1741ed0` to `2c8ebc0` with exactly this branch's 4
commits behind the merge commit.

### Post-merge deployment (verified, not assumed)

- The push to `main` triggered the `quality` workflow (`push` trigger,
  run [30928847674](https://github.com/shadowhunter67/daklak-3d-dashboard/actions/runs/30928847674),
  13m47s, **success**) and `CodeQL` (**success**) on the merge commit.
- `Deploy GitHub Pages` (`workflow_run` trigger, fires after `quality` succeeds on `main`) then ran
  as run [30929971320](https://github.com/shadowhunter67/daklak-3d-dashboard/actions/runs/30929971320)
  and **succeeded** (22s).
- Fetched `https://shadowhunter67.github.io/daklak-3d-dashboard/` directly (this agent's own
  `WebFetch`, not assumed from CI success alone): the page loads and its title resolves to **"Đắk
  Lắk 3D · Nhịp đất đại ngàn"** — the real app shell, not a 404/blank page. This confirms the
  deployment is live, though it does **not** by itself prove `?view=world` renders correctly on the
  live GitHub Pages origin (base-path `/daklak-3d-dashboard/`) — that was verified pre-merge against
  a local production preview server (`npm run preview`) with the same build output, per the
  Playwright evidence above, not against the live Pages URL itself. A follow-up manual check of
  `https://shadowhunter67.github.io/daklak-3d-dashboard/?view=world` on the live origin is
  reasonable due diligence but was not additionally performed in this session.

## Next action — recommendation for Phase T2

1. Confirm PR #76 CI is green on the final pushed SHA, take it out of draft, and merge (or merge it
   directly if this session's runtime already confirmed it — see the top-of-report timestamp vs.
   the CI section above).
2. **The real blocker for T2 (tourism data contract) is data, not code**: there is no sourced list
   of real Đắk Lắk tourism destinations (names, coordinates, descriptions) anywhere in this repo.
   T2 cannot honestly start with fabricated destinations — get a real, licensed/provincial-source
   dataset first (same standard this repo already holds project-portfolio data to — see
   `docs/adr/0001-project-centric-domain.md`).
3. Once real destination data exists, T2 should define it in a new, separate module (e.g.
   `src/entities/tourism/`, per the task's explicit instruction not to touch
   `src/entities/project/*`) with its own contract/validation, following the existing
   `src/entities/project/` pattern for how a domain contract + adapters are structured in this repo.
4. "Stand Here" (viewshed-lite) elevation sampling remains genuinely unimplemented — it needs an
   honest CPU-side (or GPU-readback) elevation query against the terrain height map, which does not
   exist yet anywhere in the codebase. This is real, scoped engineering work for T2 or later, not a
   copy/paste of existing code.
5. Guided tours, panoramas, and provincial scale-out are unstarted and, per the ADR, don't currently
   require Cesium — revisit `world-engine-adr.md` only if a later phase's actual scale/capability
   need contradicts that.
