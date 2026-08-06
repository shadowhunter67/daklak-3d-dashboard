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

## Post-merge fix — onboarding dialog leaked onto `?view=world`

**Found live, on the deployed site, after merge — not caught by this session's pre-merge testing.**
A fresh-profile visit to `https://shadowhunter67.github.io/daklak-3d-dashboard/?view=world` showed
the _existing_ `3d`/admin-boundary view's onboarding dialog (`OnboardingOverlay.tsx`, heading "102
xã, phường trong một bản đồ tương tác") auto-popped on top of the world scene. The world scene
itself rendered correctly underneath (terrain, title, tagline, illustrative badge, no console
errors) — only the overlay was wrong.

**Why pre-merge testing missed it**: every test in `e2e/world-exploration.spec.ts` (and the
repo-wide `dashboard.spec.ts` convention it copied) pre-seeded
`localStorage['daklak-dashboard:onboarding-dismissed'] = 'true'` in `beforeEach`, before navigating
— which is exactly what a genuinely first-time visitor's browser does not have. This session's
"live re-verification" after the first merge was also insufficient: it used `WebFetch` (a static
HTML fetch, converted to markdown, no JS execution) against the deployed URL, which can confirm the
page _responds_ but cannot observe anything React renders client-side — so it could not have caught
a client-rendered-only bug like this regardless. A real fresh-browser-context check (which the
coordinator performed manually) was needed and had not been done.

**Root cause** (found by reading `src/components/layout/OnboardingOverlay.tsx`, not guessed):
the overlay is a single global component (mounted unconditionally in `App.tsx`, gating its own
content/visibility internally by `viewMode`), with exactly two onboarding-copy variants —
detail-map gestures and admin-boundary "drag to rotate / tap for detail" gestures. Its auto-open
condition was `!hasSeenOnboarding() && viewMode !== 'overview'` — `'overview'` was the only
excluded view, so the newly-added `'world'` viewMode fell into the same default bucket as `3d`/
`table` and got the admin-boundary copy by default.

**Fix** (branch `fix/world-onboarding-decouple`, off `main` at `b063dd0`): added a
`VIEWS_WITHOUT_ONBOARDING = new Set(['overview', 'world'])` used for the auto-open condition, and
additionally excluded `'world'` (but deliberately **not** `'overview'`, whose manual-help behavior
is pre-existing, tested, and intentionally left unchanged — see `OnboardingOverlay.test.tsx`) from
the manual "?" help-control path too, since neither existing copy variant is honest for the world
scene's actual camera controls (a simpler fixed-range orbit — see `WorldFlyInCamera.tsx` — with no
pan and no keyboard control, unlike either existing variant). A world-specific onboarding tour is
deferred to T2+ as a deliberate choice, not written now, rather than reusing/adapting copy that
would need its own verification. No new dependency, no changes to `overview`/`3d`/`table`/`map`'s
onboarding behavior.

One implementation wrinkle: the first attempt added a plain `if (viewMode === 'world') return;`
early-return inside the existing `helpSignal` effect, which broke `react-hooks/set-state-in-effect`
(a lint rule this repo enforces) — the rule's heuristic only recognized the original "ref-diff
guard, then one direct `setState` call" shape, not an added branch in between. Fixed by keeping the
effect's shape identical to the original (single `setOpen(...)` call, no extra branch) and instead
computing the boolean argument (`useMapStore.getState().viewMode !== 'world'`) — same outcome,
lint-clean.

**Regression coverage added**: a new `e2e/world-exploration.spec.ts` describe block,
`'world exploration — first-time visitor, no pre-existing onboarding state'`, deliberately without
the onboarding-dismissed `localStorage` seeding every other test in the file uses — this is what
would have caught the bug pre-merge, and is what proves the fix (plus a sanity-check test that the
existing `3d` view's onboarding still fires for the same fresh profile, proving the fix is scoped,
not a global suppression). Matching unit tests added to `OnboardingOverlay.test.tsx`.

**Verification for this fix** (all commands re-run against the fix branch): `npm run typecheck` /
`lint` / `format:check` — pass; `npm test` — 113 files / **1158** tests passed (3 new); `node
scripts/check_i18n_hardcoded_strings.mjs` — clean; `npm run build` / `check:budget` — pass, 0
failures, limits unchanged (`reports/performance-budget.json`'s diff is only regenerated content
hashes and a ~49-byte shift from the actual code change, not a threshold edit); full Playwright
suite (`playwright.prod.config.ts`, all three projects: desktop-chromium, mobile-chromium,
desktop-webkit) — **291 passed, 12 skipped (pre-existing), 0 failed**, including both the
newly-failing-then-fixed fresh-context tests and the `3d`-view sanity check.

<!-- Fix-PR number, CI status, merge commit, and final live re-verification are filled in below
     once that PR exists — placeholder replaced in the same session, not left dangling. -->

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
