# Production readiness final report

Date: 2026-07-16  
Baseline: `reports/production-readiness-baseline.md`

## Outcome

The release candidate passes all mandatory local gates. The work closes the confirmed accent-insensitive search defect, defensive data joins and root fallback, repeatable WebGL context recovery, production base-path testing, 2D-first lazy loading, cross-browser/a11y coverage, GIS provenance/label containment/hash evidence, expanded build budgets, and supply-chain/CI documentation.

## Verified evidence

| Gate                           | Result                                                                                             |
| ------------------------------ | -------------------------------------------------------------------------------------------------- |
| ESLint / Prettier / TypeScript | Passed                                                                                             |
| Unit tests                     | 25 passed across 6 files                                                                           |
| GIS validation                 | 102 features; 88 communes; 14 wards; 0 invalid; 0 overlaps; 0 outside labels; 5 provenance records |
| Production E2E                 | 25 passed, 2 intentionally scoped skips across desktop Chromium, mobile Chromium, desktop WebKit   |
| Accessibility automation       | No serious/critical axe findings in 3D or 2D on all three projects                                 |
| Runtime smoke                  | No page errors or failed requests in browser smoke coverage                                        |
| Dependency audit               | 0 vulnerabilities                                                                                  |
| Build budget                   | Passed all six limits                                                                              |

The two Playwright skips are deliberate: pixel comparison and duplicate asset-request verification are Chromium-scoped. WebKit still runs smoke, modes, keyboard directory, reduced motion, WebGL recovery, axe, and 2D lazy-loading coverage.

## Performance delta

The original main entry eagerly imported manually split vendor/Three chunks. The final build produces a 702,238-byte initial chunk (191,819 gzip), a lazy 898,474-byte map chunk (243,561 gzip), and a lazy 503,152-byte chart chunk (173,646 gzip). Direct `?view=2d` is verified not to request the map or chart chunks.

Final totals: JavaScript 2,103,864 raw / 609,026 gzip; textures 2,813,884; largest asset 1,829,459; complete build 4,927,788 bytes. The terrain mesh is 61,440 triangles. A 1,000-query representative hit-test gate passes within the one-second CI ceiling (31 ms for the complete five-test file in the recorded run).

## Scores

| Area                  | Baseline | Final |
| --------------------- | -------: | ----: |
| Product clarity       |      8.8 |   9.2 |
| Frontend architecture |      8.5 |   9.2 |
| GIS/data integrity    |      8.6 |   9.4 |
| Code quality          |      8.7 |   9.3 |
| Testing               |      8.3 |   9.4 |
| Accessibility         |      8.0 |   9.2 |
| Performance           |      8.0 |   9.0 |
| Production readiness  |      8.0 |   9.3 |
| Documentation         |      8.2 |   9.3 |
| Security/supply chain |      7.5 |   9.1 |

## Remaining external checks

Physical Safari/iOS and low-end GPU profiling cannot be proven by headless CI. GitHub Pages cannot emit configurable HTTP response headers, so the repository supplies a CSP meta policy; host-level headers would be stronger on a configurable CDN. Deployment, CodeQL, Dependabot, and pinned-action workflows become authoritative only after GitHub runs them on the pushed commit. Official operational commune metrics remain unavailable and are therefore explicitly marked illustrative rather than inferred.
