/**
 * Architecture/boundary test (Phase 2 — docs/project-data-import/01-target-architecture.md §3,
 * 06-implementation-backlog item "boundary tests"). Same static-scan style as
 * `src/entities/project/importBoundary.test.ts` and `scripts/validate_public_build.mjs` — a
 * deliberately simple text scan, not a full parser (a computed/templated specifier is invisible to
 * it, same documented limitation as those other scanners).
 *
 * Invariant: a concrete `ProjectPortfolioSource` implementation (`IllustrativeProjectPortfolioSource`
 * / `BundledProjectPortfolioSource` alias / `GeneratedJsonProjectPortfolioSource`) and the raw
 * illustrative/generated-fixture data files behind them must only ever be imported from the
 * composition root (`src/app/`) or the adapter files themselves (`src/data/`) or test files — never
 * directly from a feature/component, which must go through `defaultProjectPortfolioSource` (or an
 * injected `source` prop) instead.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const currentDir = dirname(fileURLToPath(import.meta.url));
const srcDir = dirname(currentDir); // src/app -> src

const SCAN_ROOTS = ['features', 'components'].map((dir) => join(srcDir, dir));

const FORBIDDEN_IMPORT_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  {
    pattern: /illustrativeProjectPortfolio['"]/,
    reason:
      'raw illustrative fixture — go through defaultProjectPortfolioSource (src/app/createProjectPortfolioSource.ts) or an injected source prop instead',
  },
  {
    pattern: /data\/projectPortfolioSource['"]/,
    reason:
      'concrete IllustrativeProjectPortfolioSource/BundledProjectPortfolioSource — only the composition root (src/app/) may choose a concrete source',
  },
  {
    pattern: /data\/generatedJsonProjectPortfolioSource['"]/,
    reason:
      'concrete GeneratedJsonProjectPortfolioSource — only the composition root (src/app/) may choose a concrete source',
  },
  {
    pattern: /project-portfolio\.generated-fixture-demo\.json/,
    reason: 'raw generated-json fixture file — go through a ProjectPortfolioSource instead',
  },
];

function listProductionSourceFiles(dir: string): string[] {
  const files: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return files;
  }
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      files.push(...listProductionSourceFiles(fullPath));
      continue;
    }
    if (
      (entry.endsWith('.ts') || entry.endsWith('.tsx')) &&
      !entry.endsWith('.test.ts') &&
      !entry.endsWith('.test.tsx')
    ) {
      files.push(fullPath);
    }
  }
  return files;
}

describe('src/features and src/components portfolio-source import boundary', () => {
  const productionFiles = SCAN_ROOTS.flatMap((root) => listProductionSourceFiles(root));

  it('found production source files to scan (guards against an accidentally-empty scan)', () => {
    expect(productionFiles.length).toBeGreaterThan(0);
  });

  for (const file of productionFiles) {
    const relative = file.slice(srcDir.length + 1);
    it(`${relative} does not import a concrete portfolio source or raw fixture directly`, () => {
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
