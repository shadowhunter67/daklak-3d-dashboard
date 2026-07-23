/**
 * Architecture/import-boundary test (Phase 1.5 — see docs/adr/0001-project-centric-domain.md).
 * Production domain code under `src/entities/project/` must stay independent of GIS assets, UI
 * components, the map store and CSS — a validator that needs to know which administrative codes
 * are valid takes a `ReadonlySet<string>` (`ProjectValidationContext`/`DataQualityContext`), it
 * never imports `daklak-labels.json` itself. Only *test* files are allowed to build that set from
 * real data (see `fixtures/projects.mock.test.ts`, `dataQualitySummary.test.ts`).
 *
 * This is a plain-text static scan over source, in the same spirit as
 * `scripts/validate_public_build.mjs` — deliberately not a full parser (same documented scope
 * limit: a computed/templated specifier is invisible to it), but stable and cheap enough to run
 * under `npm test` on every change to this directory.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const currentDir = dirname(fileURLToPath(import.meta.url));

const FORBIDDEN_IMPORT_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  {
    pattern: /daklak-labels\.json/,
    reason: 'GIS ward-label asset — inject validAdministrativeCodes instead',
  },
  { pattern: /assets\/maps\//, reason: 'GIS map asset directory' },
  {
    pattern: /assets\/data\//,
    reason:
      'bundled data asset directory (belongs to data-platform catalog, not domain validators)',
  },
  { pattern: /\bcomponents\//, reason: 'UI component' },
  { pattern: /\bstores\/mapStore/, reason: 'ward/map Zustand store' },
  { pattern: /\.css['"]/, reason: 'stylesheet' },
  { pattern: /\bApp(\.tsx)?['"]/, reason: 'application composition root' },
];

function listProductionSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      files.push(...listProductionSourceFiles(fullPath));
      continue;
    }
    if (entry.endsWith('.ts') && !entry.endsWith('.test.ts')) files.push(fullPath);
  }
  return files;
}

describe('src/entities/project import boundary', () => {
  const productionFiles = listProductionSourceFiles(currentDir);

  it('found production source files to scan (guards against an accidentally-empty scan)', () => {
    expect(productionFiles.length).toBeGreaterThan(0);
  });

  for (const file of productionFiles) {
    const relative = file.slice(currentDir.length + 1);
    it(`${relative} does not import GIS assets, UI components, the map store, or CSS`, () => {
      const content = readFileSync(file, 'utf8');
      const importLines = content
        .split('\n')
        .filter((line) => /^\s*import\b/.test(line) || /^\s*export\s+.*\bfrom\b/.test(line));
      for (const { pattern, reason } of FORBIDDEN_IMPORT_PATTERNS) {
        const offendingLine = importLines.find((line) => pattern.test(line));
        expect(
          offendingLine,
          `${relative} imports something matching "${pattern}" (${reason}): ${offendingLine}`,
        ).toBeUndefined();
      }
    });
  }
});
