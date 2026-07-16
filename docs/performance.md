# Performance

Heavy WebGL and chart code is split behind React lazy boundaries. Direct `?view=2d` startup avoids mounting and fetching both. Terrain uses four precomputed textures and a 192×160 mesh (61,440 triangles), while polygon hit testing first filters by bounding boxes and is throttled to animation frames.

`npm run check:budget` fails on total JavaScript raw/gzip, largest JavaScript gzip, total texture bytes, largest asset, total build size, or a build containing no JavaScript/assets. Exact results live in `reports/performance-budget.json`; thresholds are regression ceilings, not targets.

Vitest performs 1,000 representative hit tests with a deliberately broad one-second CI ceiling. Real FPS, GPU memory, and thermal behavior depend on hardware and must be checked on representative physical devices before a high-traffic release.
