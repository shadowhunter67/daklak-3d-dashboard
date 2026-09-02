import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createBuildInfo } from './src/build/buildInfo';
import { resolvePortfolioDataModeFromViteMode } from './src/app/portfolioDataModes';
import { resolveActivePortfolioSourceModule } from './src/app/resolveActivePortfolioSourceModule';

const packageMetadata = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as {
  version: string;
};
const datasetMetadata = JSON.parse(
  readFileSync(new URL('./src/assets/maps/daklak/daklak-metadata.json', import.meta.url), 'utf8'),
) as { generatedAt: string };
const sourceMetadata = JSON.parse(
  readFileSync(
    new URL('./src/assets/maps/daklak/daklak-source-summary.json', import.meta.url),
    'utf8',
  ),
) as { sourceSnapshot: string };

function resolveGitCommit(): string | undefined {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    return undefined;
  }
}

// resolvePortfolioDataModeFromViteMode (src/app/portfolioDataModes.ts) throws on an unrecognized
// explicit --mode — build/test fails loudly, never silently falls back to another mode.
export default defineConfig(({ mode }) => {
  const portfolioDataMode = resolvePortfolioDataModeFromViteMode(mode);
  const activePortfolioSourceModule = resolveActivePortfolioSourceModule(portfolioDataMode);

  return {
    // Hard-coded, not an oversight: the only shipping deployment target is GitHub Pages at
    // https://shadowhunter67.github.io/daklak-3d-dashboard/ (see README.md "Live demo"), which
    // serves every mode (demo/internal-static/public-static) from that same repo-name subpath.
    // There is no documented internal/custom-hosting-path use case this would break.
    base: '/daklak-3d-dashboard/',
    resolve: {
      alias: {
        // Buộc Rollup chỉ thấy MỘT trong ba module nguồn — xem JSDoc
        // src/app/resolveActivePortfolioSourceModule.ts về lý do không dùng switch runtime.
        '#active-portfolio-source': fileURLToPath(
          new URL(activePortfolioSourceModule, import.meta.url),
        ),
      },
    },
    plugins: [
      react(),
      {
        name: 'build-info',
        apply: 'build',
        generateBundle() {
          const buildInfo = createBuildInfo({
            applicationVersion: packageMetadata.version,
            gitCommit: resolveGitCommit(),
            buildTimestamp: process.env.BUILD_TIMESTAMP ?? new Date().toISOString(),
            datasetVersion: sourceMetadata.sourceSnapshot,
            datasetSnapshot: datasetMetadata.generatedAt,
            portfolioDataMode,
            activePortfolioSourceModule,
          });
          this.emitFile({
            type: 'asset',
            fileName: 'build-info.json',
            source: `${JSON.stringify(buildInfo, null, 2)}\n`,
          });
        },
      },
    ],
    // maplibre-gl bundles its own web worker as a separate entry point, loaded at runtime via
    // `new Worker(new URL(...))`. Vite's dev-server dependency pre-bundler doesn't follow that
    // dynamic worker reference, so it never emits `maplibre-gl-worker.mjs` into
    // `node_modules/.vite/deps/` — the main chunk's rewritten import then 404s the moment
    // MapLibre actually needs the worker (e.g. to process a GeoJSON source's features), which
    // silently stalls the map at "loading" forever (no `load`/`error` event ever fires). This
    // went unnoticed until PR "hiệu ứng bản đồ động" added the first real GeoJSON source/layers
    // to the detail map — with zero sources, MapLibre never spun up a worker at all. Excluding
    // maplibre-gl from pre-bundling makes Vite serve it as the real ESM package instead, whose
    // own worker `new URL(...)` resolves correctly. Production builds are unaffected (Rollup, not
    // this dev-only optimizer, bundles the worker there).
    optimizeDeps: {
      exclude: ['maplibre-gl'],
    },
    build: {
      target: 'es2022',
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('/node_modules/three/') || id.includes('\\node_modules\\three\\')) {
              return 'three-vendor';
            }
          },
        },
      },
    },
    test: {
      include: [
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
        'scripts/**/*.test.mjs',
        'scripts/**/*.test.ts',
      ],
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
    },
  };
});
