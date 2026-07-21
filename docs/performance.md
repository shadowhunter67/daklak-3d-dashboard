# Performance

`npm run build:metrics` publishes exact JavaScript/CSS/image totals, chunk counts, Three/ECharts chunks, geometry sizes and budget comparison to `reports/build-metrics.json` and `.md`.

Heavy WebGL and chart code is split behind React lazy boundaries. Direct `?view=2d` startup avoids mounting and fetching both. Terrain uses four precomputed textures and a 192×160 mesh (61,440 triangles), while polygon hit testing first filters by bounding boxes and is throttled to animation frames.

`npm run check:budget` fails on total JavaScript raw/gzip, largest JavaScript gzip, total texture bytes, largest asset, total build size, or a build containing no JavaScript/assets. Exact results live in `reports/performance-budget.json`; thresholds are regression ceilings, not targets.

Vitest performs 1,000 representative hit tests with a deliberately broad one-second CI ceiling. Real FPS, GPU memory, and thermal behavior depend on hardware and must be checked on representative physical devices before a high-traffic release.

`src/utils/graphicsQuality.ts` derives a conservative `low`/`medium`/`high` tier once per Canvas mount from `devicePixelRatio` and `navigator.hardwareConcurrency` only — no benchmarking, no telemetry, no user-agent sniffing. A typical current desktop/laptop resolves to `high`, which matches today's hardcoded Canvas config exactly (antialias on, ContactShadows on, DPR up to 1.35), so nothing changes for the common case; only clearly constrained devices (very high DPR or 1–2 logical cores) drop `ContactShadows`, disable antialias, and cap DPR at 1. The tier is decided once and never recomputed reactively, so it cannot itself trigger a Canvas remount.

Use the repeatable manual protocol in [device-benchmark.md](device-benchmark.md) for desktop, Android, and iOS/Safari measurements. The repository intentionally stores an empty results template rather than invented hardware numbers.
