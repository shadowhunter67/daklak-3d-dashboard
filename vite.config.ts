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
