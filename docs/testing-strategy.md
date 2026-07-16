# Testing strategy

CI splits work into five jobs. `static-analysis`, `unit-and-data`, `build-and-budget`, and `security` start independently; `e2e` waits only for `build-and-budget`, downloads its `production-dist` artifact, and never rebuilds the application. Validation/build reports are uploaded even when their owning job fails where possible, and Playwright traces/screenshots are uploaded on E2E failure. GitHub Pages downloads the exact `dist` artifact produced by a successful `main` quality run instead of rebuilding it.

The required gate is `npm run quality`. It runs lint, formatting, strict TypeScript, Vitest, GIS validation, production build/budget, and production-preview Playwright.

Vitest covers manifest guards, build metadata, stores, search normalization, geometry projection/hit testing, all generated label points, interaction performance, and WebGL lifecycle cleanup. Playwright smoke coverage runs on desktop Chromium (`Desktop Chrome`), mobile Chromium (`Pixel 7`), and desktop WebKit (`Desktop Safari`). Functional, accessibility, URL-state, and WebGL recovery tests run on all three profiles. Pixel baselines run only on desktop and mobile Chromium to avoid cross-engine rasterization noise. Production-only assertions verify hashed assets, lazy loading, and `build-info.json` once on desktop Chromium.

Failed E2E traces and screenshots are uploaded by CI. A baseline may only be updated with `npm run test:e2e:update` after intentional visual review. CI failures must be fixed; tests and budgets must not be weakened to make a change pass.

Manual release checks: latest Chrome/Safari hardware, keyboard-only traversal, 200% zoom, forced WebGL loss, low-power mobile responsiveness, external source links, and the deployed GitHub Pages URL.

Dependabot Three.js/R3F/Drei and Playwright/testing groups receive the same full quality workflow, including Chromium visual baselines. Major dependency changes are never auto-merged and require explicit review.
