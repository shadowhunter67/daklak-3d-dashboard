import { gzipSync } from 'node:zlib';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
// Raised once (2026-07) to admit the detail-map feature's maplibre-gl + pmtiles dependency.
// maplibre-gl is its own code-split chunk (~1.03MB raw / ~271KB gzip, a normal size for that
// library) that a user who never opens the detail map never downloads — see the "does not load
// 3D or chart chunks" / "detail map chunk only loads when opened" E2E tests, which are the real
// guarantee that matters, not this aggregate ceiling. This is a deliberate, explained increase
// for a genuinely new optional feature, not a cover for unexplained bloat in the shared/eager
// chunks — those are still expected to stay flat run to run.
//
// totalBuildBytes raised again ("hiệu ứng bản đồ động" PR, 2026-09) to admit two more
// maplibre-gl files: `maplibre-gl-worker.mjs` (~19KB) and `maplibre-gl-shared.mjs` (~471KB,
// unminified — it's copied byte-for-byte from the npm package, see vite.config.ts's
// `maplibre-gl-worker-assets` plugin doc comment for why it can't be minified/hashed like a
// normal chunk). Same "only downloaded by a user who actually opens the detail map" reasoning as
// the maplibre-gl chunk above — these two files are the worker maplibre-gl's GeoJSON
// sources/layers now genuinely need at runtime (added in the same PR); without them the detail
// map silently never finishes loading in production. Not counted in totalJavaScriptBytes/gzip
// (extension is `.mjs`, not `.js`) since they're never part of the eagerly-executed JS the
// gzip-over-the-wire budgets are meant to bound.
//
// totalBuildBytes/largestAssetBytes raised again (real OSM roads/buildings PMTiles source, 2026-09)
// to admit `public/maps/daklak.pmtiles` (~13.4MB, real OpenStreetMap data for the whole province —
// pipeline documented in docs/detail-map-integration.md). This was deliberately measured, not
// guessed: an earlier draft of this feature assumed 35-90MB and planned to host it as a GitHub
// Release asset instead (cross-origin, needs a CSP change) specifically to avoid this budget; once
// the real pipeline ran, the actual province-wide roads+buildings archive came out to 13.4MB — real
// OSM building-footprint coverage outside city centers in this province is sparse (~2.8k buildings
// province-wide), so the file is far smaller than a fully-mapped-area estimate would suggest.
// Same-origin (committed to the repo, served by GitHub Pages like every other static asset) is
// simpler than a Release asset at this size — no CSP `connect-src` addition, no cross-origin range
// requests. Same "only downloaded by a user who actually opens the detail map" download-cost
// reasoning as the maplibre-gl chunk above (it's not part of the eager entry bundle).
//
// totalBuildBytes raised again (27 destination dioramas + 27-destination dataset, 2026-10) from
// 21.0MB to 21.15MB. Measured, not guessed: the build went 21,000,000 -> 21,078,257 bytes (+78KB):
// the dioramas are 5 lazy chunks (waterfalls/waters/landmarks/structures ~3-10KB each + the shared
// kit), the rest is the 22 new sourced destinations. None of it is in the eager entry bundle —
// totalJavaScriptBytes/gzip budgets above still pass unchanged — and a diorama chunk is only fetched
// when a user opens `#/diorama/:id`. The ceiling keeps ~70KB headroom, not an open-ended bump.
//
// totalBuildBytes raised again (24 reference photos next to the dioramas, 2026-10) from 21.15MB to
// 22.6MB. Measured, not guessed: the build went 21,099,642 -> 22,517,476 bytes (+1.42MB), and the 24
// JPEGs in public/images/destinations/ (<= 640 px, progressive, ~35-100KB each, ~1.38MB total) are
// essentially all of it. They exist so a visitor can compare the procedural scene with the real photo
// (CC BY-SA/CC BY from Wikimedia Commons, attribution shown beside each one) — same-origin copies
// because the CSP only allows `img-src 'self'`. They are plain static files fetched lazily when a
// diorama is opened (`<img loading="lazy">`), never part of any JS chunk, so the JavaScript and gzip
// budgets above are unchanged. dioramaPhotos.test.ts caps each file at 130KB so this can't creep.
// totalBuildBytes raised again (sidebar shell + overview workspace, PR #201, 2026-10) from
// 22.6MB to 22.8MB. Measured, not guessed: origin/main was 22,602,328 bytes and this branch is
// 22,625,270 bytes (+22,942 bytes; mainly the new shell CSS and UI modules). The 200KB rounded
// headroom is intentionally small and keeps the existing JS/gzip/asset budgets unchanged.
// totalJavaScriptBytes raised 3,400,000 -> 3,422,000 (investment-attraction catalog view + rebuilt
// project detail page, 2026-10). Measured with node_modules synced to the lockfile (`npm ci`; an
// earlier local figure was wrong because maplibre-gl 6.11.2 was installed instead of 6.14.0, which
// is 12,225 bytes larger): origin/main = 3,398,958 (1,042 under the cap, so no new route could fit),
// this branch = 3,419,091 (+20,133). That is the lazy catalog chunk (~8.8KB), the vi/en strings and
// the project-detail rebuild, AFTER removing 40 dead i18n keys (-6.5KB) and reusing the existing
// sector labels. Gzip 939,366 / 950,000 is untouched. The raise leaves ~2.9KB of headroom.
// totalJavaScriptBytes raised 3,422,000 -> 3,428,000 (new-user UX pass, 2026-10): measured 3,424,049
// (+2.8KB over the previous 3,421,287 after dead-key scan found nothing left to drop) for the
// planning-layer legend, the Overview-specific help, the "Tình trạng danh mục" label, locale-aware
// data-quality details and the auto-opened settings in the phone drawer. Gzip is untouched.
// totalJavaScriptBytes raised 3,428,000 -> 3,446,000 (V3 PR-A: administrative-unit profile page + image
// coverage KPI, 2026-10). Measured 3,442,101 (+14.4KB over 3,427,726): lazy UnitProfileView chunk
// ~7.8KB, vi/en strings, the Overview/Data-readiness hooks, and `daklak-wards-render` becoming its own
// chunk. The ward geometry (463KB) and tourism destinations were already in the bundle; no new
// dependency. Gzip budget untouched. Each later V3 module (tourism, planning) is measured separately.
// V3 PR-B/C (tourism hub + planning hub, 2026-10): totalJavaScriptBytes 3,446,000 -> 3,476,000 and
// totalBuildBytes 22,800,000 -> 22,822,000. Measured 3,472,676 JS (+30.6KB over 3,442,101) and
// 22,817,673 build bytes. Breakdown: lazy PlanningHubView chunk ~16.5KB (of which ~11KB is the 116
// planning-document citations extracted from QĐ 1985's own planning column, stored compactly and
// decoded at runtime), lazy TourismHubView ~5.4KB, `verifiedTourismDestinations` now a shared lazy
// chunk ~20KB (it was previously folded into another chunk), plus vi/en strings. No new
// dependency. totalJavaScriptGzipBytes 950,000 -> 958,000 (measured 954,368; the sum counts every
// lazy chunk's own gzip). largest-chunk gzip budget untouched. Eager entry unchanged apart from routes.
// V3 overview briefing + planning search group: totalJavaScriptBytes 3,476,000 -> 3,484,000 and
// totalBuildBytes 22,822,000 -> 22,830,000 (measured 3,480,249 / 22,826,381; +4.2KB: ProvinceBriefing
// card, provinceBriefing model, sectorLabels split, planning search kind and strings).
// V3 map lens + tourism map layer + unit photos from verified destinations (2026-10): JS 3,484,000 ->
// 3,490,000, gzip 958,000 -> 960,000, build 22,830,000 -> 22,838,000 (measured 3,487,478 / 957,684 /
// 22,834,007; +3.5KB: tourism layer + popup, lens module, layer panel group, unit photo hero, strings).
// The unit photos reuse files already in public/images/destinations, so they add no image bytes.
// Dependabot production-dependencies group (2026-10-26: maplibre-gl 6.14.0->6.15.0, react/react-dom
// 19.3.0->19.3.1, @react-three/fiber 9.8.1->9.8.2, zustand 5.0.15->5.0.16): no code of ours changed, the
// shipped libraries grew. Measured 3,508,126 JS / 964,703 gzip / 22,853,551 build bytes (+20.6KB JS
// over 3,487,478). Limits raised to JS 3,512,000, gzip 968,000, build 22,858,000.
// V4 P1 (decision queue on Overview + Data & sources Simple/Technical mode, 2026-10-27): JS 3,512,000 ->
// 3,524,000, gzip 968,000 -> 972,000, build 22,858,000 -> 22,874,000 (measured 3,518,750 / 968,481 /
// 22,866,456; +~9KB over the 3,509,980 measured after P0). DecisionQueue + model, the simple status
// panel (it statically imports the planning citations into the lazy data-readiness chunk), strings.
// V4 media pipeline (2026-10-27): totalBuildBytes 22,874,000 -> 23,210,000 (measured 23,197,499 on top of the P1 budget; re-measured below after merging Reports V2). 25 WebP
// thumbnails (320px, <= 25KB each, ~330KB total) in public/images/destinations/thumb/ so cards download ~12KB
// instead of the ~60KB JPEG; the JPEGs stay for wide hero use. JS/gzip budgets unchanged (+<1KB JS).
// V4 P1 Reports V2 (2026-10-27): JS 3,524,000 -> 3,534,000, build 22,874,000 -> 22,884,000 (measured
// 3,528,868 / 22,877,067; +~10KB: InvestmentReports + benchmark/bottleneck/exposure model, strings).
// Combined V4 state (P0 + P1 + Reports V2 + media pipeline, 2026-10-27): measured JS 3,532,728, gzip 972,196,
// build 23,207,593 -> gzip limit 972,000 -> 976,000, build limit 23,225,000 (JS limit 3,534,000 unchanged). After merging the P2 tourism/planning work the final measured state is
// 3,539,381 JS / 973,620 gzip / 23,214,711 build, inside JS 3,540,000, gzip 976,000, build 23,225,000.
// V4 P2 tourism links + planning terms (2026-10-27): JS 3,534,000 -> 3,540,000, build 22,884,000 ->
// 22,892,000 (measured 3,535,521 / 22,884,185 on top of the Reports V2 limits; +~7KB: destination link
// model, chain list in the tourism cards, planning terms/boundary cards, strings).
const limits = {
  totalJavaScriptBytes: 3_540_000,
  totalJavaScriptGzipBytes: 976_000,
  largestJavaScriptGzipBytes: 300_000,
  totalTextureBytes: 3_000_000,
  largestAssetBytes: 14_000_000,
  totalBuildBytes: 23_225_000,
};

async function filesAt(directory) {
  const entries = await readdir(directory);
  const nested = await Promise.all(
    entries.map(async (name) => {
      const path = join(directory, name);
      return (await stat(path)).isDirectory() ? filesAt(path) : [path];
    }),
  );
  return nested.flat();
}

const files = await filesAt(dist);
const assets = await Promise.all(
  files.map(async (path) => {
    const content = await readFile(path);
    return {
      file: relative(dist, path).replaceAll('\\', '/'),
      bytes: content.byteLength,
      gzipBytes: path.endsWith('.js') ? gzipSync(content).byteLength : undefined,
    };
  }),
);
const scripts = assets.filter(({ file }) => file.endsWith('.js'));
const textures = assets.filter(({ file }) => /terrain-.+\.png$/.test(file));
const actual = {
  totalJavaScriptBytes: scripts.reduce((sum, file) => sum + file.bytes, 0),
  totalJavaScriptGzipBytes: scripts.reduce((sum, file) => sum + (file.gzipBytes ?? 0), 0),
  largestJavaScriptGzipBytes: scripts.length
    ? Math.max(...scripts.map((file) => file.gzipBytes ?? 0))
    : 0,
  totalTextureBytes: textures.reduce((sum, file) => sum + file.bytes, 0),
  largestAssetBytes: assets.length ? Math.max(...assets.map((file) => file.bytes)) : 0,
  totalBuildBytes: assets.reduce((sum, file) => sum + file.bytes, 0),
};
const failures = Object.entries(limits)
  .filter(([key, limit]) => actual[key] > limit)
  .map(([key, limit]) => `${key}: ${actual[key]} > ${limit}`);
if (!scripts.length) failures.push('Build did not produce any JavaScript files');
if (!assets.length) failures.push('Build did not produce any assets');
const report = {
  status: failures.length ? 'failed' : 'passed',
  generatedAt: new Date().toISOString(),
  limits,
  actual,
  assets,
  failures,
};
await writeFile(
  join(root, 'reports', 'performance-budget.json'),
  `${JSON.stringify(report, null, 2)}\n`,
);
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
