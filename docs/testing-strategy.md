# Testing strategy

CI exposes lint, format, typecheck, unit, GIS validation, build, budget, metrics, E2E, audit and secret scan as named steps. It uploads validation/build reports on every run and Playwright traces/screenshots on failure. GitHub Pages downloads the exact `dist` artifact produced by a successful `main` quality run instead of rebuilding it.

The required gate is `npm run quality`. It runs lint, formatting, strict TypeScript, Vitest, GIS validation, production build/budget, and production-preview Playwright.

Vitest covers manifest guards, stores, search normalization, geometry projection/hit testing, all generated label points, interaction performance, and WebGL lifecycle cleanup. Playwright covers desktop Chromium, mobile Chromium, and desktop WebKit; smoke, thematic modes, keyboard search/selection, reduced motion, context loss/restoration, serious/critical axe findings, GitHub Pages base paths, and 2D-first lazy loading. Pixel baselines remain Chromium-only to avoid engine rasterization noise.

Failed E2E traces and screenshots are uploaded by CI. A baseline may only be updated with `npm run test:e2e:update` after intentional visual review. CI failures must be fixed; tests and budgets must not be weakened to make a change pass.

Manual release checks: latest Chrome/Safari hardware, keyboard-only traversal, 200% zoom, forced WebGL loss, low-power mobile responsiveness, external source links, and the deployed GitHub Pages URL.
