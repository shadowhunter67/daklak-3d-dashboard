#!/usr/bin/env node
// Static audit for hard-coded, visible Vietnamese UI strings outside src/i18n/messages/** — an AST
// walk (TypeScript compiler API), not a broad regex over raw source, so it only flags what is
// actually rendered (JSX text nodes and a small allowlist of user-visible JSX attributes), never
// string literals used as identifiers/classNames/data driven from props (see docs/adr/
// 0003-internationalization.md). Usage: node scripts/check_i18n_hardcoded_strings.mjs
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');

/** @param {string} dir @returns {string[]} absolute paths of every .ts/.tsx file under `dir`. */
function listSourceFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...listSourceFiles(full));
    } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
      results.push(full);
    }
  }
  return results;
}

const VIETNAMESE_DIACRITIC = /[àáâãèéêìíòóôõùúăđĩũơưạảấầẩẫậắằẳẵặẹẻẽềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;

// JSX attributes whose string-literal value is user-visible text (aria-label/title/alt/
// placeholder) — deliberately NOT className/data-*/id/htmlFor/aria-labelledby (a reference to
// another element's id, not text itself) or aria-hidden/role (not free text).
const VISIBLE_TEXT_ATTRIBUTES = new Set(['aria-label', 'title', 'alt', 'placeholder']);

// A small, reasoned allowlist — proper nouns, source-only content, or files this audit
// deliberately does not police (fixtures/tests/generated artifacts). Each entry needs a reason;
// do not widen this list to silence a real gap.
const ALLOWLIST_FILES = new Set([
  // Domain enum label tables — legitimate content of the i18n dictionary system itself, or
  // Vietnamese-only source data intentionally exempt (see docs/adr/0003-internationalization.md
  // section on resolveLocalizedText for source-only content).
  'src/entities/project/labels.ts',
  'src/entities/project/attentionReason.ts',
  // Brand mark/wordmark ("ĐL" logo initials, "ĐẮK LẮK" province name in the <h1>) — a proper noun
  // and visual brand identity, not translatable UI copy (see docs/adr/0003-internationalization.md).
  'src/components/layout/DashboardHeader.tsx',
]);

function isTestOrTypeFile(relPath) {
  return (
    relPath.endsWith('.test.ts') ||
    relPath.endsWith('.test.tsx') ||
    relPath.endsWith('.d.ts') ||
    relPath.includes('/tests/') ||
    relPath.includes('__fixtures__')
  );
}

/** @param {string} filePath @returns {{ line: number; text: string }[]} */
function findHardcodedStrings(filePath, relPath) {
  const sourceText = readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const findings = [];

  function report(node, text) {
    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    findings.push({ line: line + 1, text: text.trim() });
  }

  function visit(node) {
    if (ts.isJsxText(node)) {
      const text = node.getText(sourceFile);
      if (text.trim() && VIETNAMESE_DIACRITIC.test(text)) report(node, text);
    } else if (ts.isJsxAttribute(node) && ts.isIdentifier(node.name)) {
      const attrName = node.name.text;
      if (
        VISIBLE_TEXT_ATTRIBUTES.has(attrName) &&
        node.initializer &&
        ts.isStringLiteral(node.initializer) &&
        VIETNAMESE_DIACRITIC.test(node.initializer.text)
      ) {
        report(node.initializer, node.initializer.text);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return findings.filter(() => !ALLOWLIST_FILES.has(relPath));
}

export async function auditHardcodedStrings() {
  const files = listSourceFiles(join(rootDir, 'src'));
  /** @type {{ file: string; line: number; text: string }[]} */
  const allFindings = [];
  for (const file of files) {
    const relPath = relative(rootDir, file).replace(/\\/g, '/');
    if (isTestOrTypeFile(relPath)) continue;
    if (relPath.startsWith('src/i18n/messages/')) continue; // the dictionary itself
    if (ALLOWLIST_FILES.has(relPath)) continue;
    for (const finding of findHardcodedStrings(file, relPath)) {
      allFindings.push({ file: relPath, ...finding });
    }
  }
  return allFindings;
}

const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMainModule) {
  const findings = await auditHardcodedStrings();
  if (findings.length === 0) {
    console.log('No hard-coded visible Vietnamese strings found outside src/i18n/messages/**.');
  } else {
    console.error(`Found ${findings.length} hard-coded visible Vietnamese string(s):`);
    for (const f of findings) console.error(`  ${f.file}:${f.line}  ${JSON.stringify(f.text)}`);
    process.exit(1);
  }
}
