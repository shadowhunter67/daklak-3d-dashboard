import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createBuildInfo } from './src/build/buildInfo';

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

export default defineConfig({
  base: '/daklak-3d-dashboard/',
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
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
