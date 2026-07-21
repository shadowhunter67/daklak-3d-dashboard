# Testing strategy

CI splits work into five jobs. `static-analysis`, `unit-and-data`, `build-and-budget`, and `security` start independently; `e2e` waits only for `build-and-budget`, downloads its `production-dist` artifact, and never rebuilds the application. Validation/build reports are uploaded even when their owning job fails where possible, and Playwright traces/screenshots are uploaded on E2E failure. GitHub Pages downloads the exact `dist` artifact produced by a successful `main` quality run instead of rebuilding it.

The required gate is `npm run quality`. It runs lint, formatting, strict TypeScript, Vitest, GIS validation, production build/budget, and production-preview Playwright.

Vitest covers manifest guards, build metadata, stores (including the reset-camera/help/insets-change signal counters that replaced a window-event bus), search normalization, geometry projection/hit testing, terrain uv-to-ward hit testing, 2D/3D road label building, administrative label layout, canvas geometry-path drawing, all generated label points, interaction performance, and WebGL lifecycle cleanup. Playwright smoke coverage runs on desktop Chromium (`Desktop Chrome`), mobile Chromium (`Pixel 7`), and desktop WebKit (`Desktop Safari`). Functional, accessibility, URL-state, and WebGL recovery tests run on all three profiles. Pixel baselines run only on desktop and mobile Chromium to avoid cross-engine rasterization noise. Production-only assertions verify hashed assets, lazy loading, and `build-info.json` once on desktop Chromium.

Failed E2E traces and screenshots are uploaded by CI. The `quality` workflow never bootstraps or auto-generates a missing visual baseline: a pull request with no committed Linux baseline for a `toHaveScreenshot` assertion fails the same way a real visual regression would. CI failures must be fixed; tests and budgets must not be weakened to make a change pass.

### Updating a visual baseline on purpose

Baselines are only ever updated by a human after intentional review. Run the **Visual baseline (manual)** workflow (`workflow_dispatch` on `.github/workflows/visual-baseline.yml`) from the Actions tab, optionally scoping it with a `--grep` pattern. It builds production, runs the affected visual tests with `--update-snapshots` against `playwright.prod.config.ts`, and uploads the regenerated Linux `*.png` files as a downloadable artifact — it never commits, pushes, or merges anything. Download the artifact, replace the corresponding files under `e2e/dashboard.spec.ts-snapshots/`, review the diff as you would any other change (confirm the difference is the intended UI change, not a regression), and commit it through the normal PR flow. Locally, `npm run test:e2e:update` remains available for the same purpose against a dev build, but Windows/macOS baselines are never used for the Linux CI comparison — only the workflow (or a Linux machine) produces a baseline CI will actually match.

Manual release checks: latest Chrome/Safari hardware, keyboard-only traversal, 200% zoom, forced WebGL loss, low-power mobile responsiveness, external source links, and the deployed GitHub Pages URL.

Dependabot Three.js/R3F/Drei and Playwright/testing groups receive the same full quality workflow, including Chromium visual baselines. Major dependency changes are never auto-merged and require explicit review.
