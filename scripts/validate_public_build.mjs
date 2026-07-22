// Public-data leakage boundary for the GitHub Pages (public) deployment profile. Two modes:
//
//   --mode=source  Static-analyzes src/ import statements before build (fast, catches mistakes
//                  early): forbidden path segments, JSON imports outside the public allowlist,
//                  imports from data-templates/, production files importing test fixtures, and
//                  whether ProtectedApiAdapter is reachable from the real app entry point.
//   --mode=dist    Scans the built dist/ output (after `npm run build`) for the same kind of
//                  leakage that could only show up in the final bundle: private hostnames,
//                  credential-shaped query params, JWTs/bearer tokens, non-public dataset ids
//                  (from reports/public-dataset-manifest.json, written by `npm test` — see
//                  src/data-platform/validation/publicManifest.test.ts), and data-template/
//                  protected-role content that must never ship publicly.
//
// This complements (does not replace) catalogValidation.ts's in-catalog checks (spec §3): that
// Vitest suite only ever sees datasets that were actually *registered*; this script is the one
// that would catch a developer bypassing the catalog entirely with a raw import.
import { readFileSync, existsSync } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mode = (process.argv.find((arg) => arg.startsWith('--mode=')) ?? '--mode=source').split(
  '=',
)[1];

async function walk(directory, predicate) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(path, predicate)));
    } else if (predicate(path)) {
      files.push(path);
    }
  }
  return files;
}

// ---------------------------------------------------------------------------------------------
// --mode=source
// ---------------------------------------------------------------------------------------------

const IMPORT_SPECIFIER_PATTERN = /(?:from|import)\s*\(?['"]([^'"]+)['"]/g;

function extractImportSpecifiers(content) {
  const specifiers = [];
  let match;
  while ((match = IMPORT_SPECIFIER_PATTERN.exec(content))) specifiers.push(match[1]);
  return specifiers;
}

// Directory-name segments that must never appear in an import path from production source. If a
// legitimate future feature needs one of these (e.g. a real `internal/` folder for a secure
// deployment profile that is genuinely never bundled publicly), add an explicit, commented
// allowlist entry below rather than loosening this list.
const FORBIDDEN_PATH_SEGMENTS = ['/internal/', '/confidential/', '/restricted/', '/protected/'];

// Public JSON data this app is allowed to import directly, relative to src/. Extend this (with a
// comment) when a new public dataset's backing JSON is added — see docs/dataset-onboarding.md.
const ALLOWED_JSON_PREFIXES = ['assets/data/', 'assets/maps/daklak/'];

// Source-scan exceptions, each with the reason it's safe. Keyed by the repo-relative file path.
const SOURCE_SCAN_ALLOWLIST = {
  // ProtectedApiAdapter.ts's own filename contains "Protected" but is not a `/protected/` path
  // segment, and it only ever appears in its own test file — no allowlist entry is actually
  // needed today; kept here as the documented place to add one if that ever changes.
};

function isTestFile(path) {
  return /\.test\.tsx?$/.test(path);
}

function repoRelative(path) {
  return relative(root, path).replaceAll('\\', '/');
}

async function sourceScan(srcDir = join(root, 'src')) {
  const entry = join(srcDir, 'main.tsx');
  const files = await walk(srcDir, (path) => /\.(ts|tsx)$/.test(path));
  const findings = [];

  /** @type {Map<string, string[]>} resolved file path -> import specifiers (for the reachability graph) */
  const importsByFile = new Map();

  for (const file of files) {
    const relPath = repoRelative(file);
    if (SOURCE_SCAN_ALLOWLIST[relPath]) continue;
    const content = await readFile(file, 'utf8');
    const specifiers = extractImportSpecifiers(content);
    importsByFile.set(file, specifiers);
    const isTest = isTestFile(file);

    for (const specifier of specifiers) {
      if (FORBIDDEN_PATH_SEGMENTS.some((segment) => specifier.includes(segment))) {
        findings.push(`${relPath}: import từ path bị cấm: '${specifier}'`);
      }
      if (specifier.includes('data-templates')) {
        findings.push(
          `${relPath}: import trực tiếp từ data-templates/ — đó là template cho con người, không phải nguồn cho app: '${specifier}'`,
        );
      }
      if (!isTest && (specifier.includes('/fixtures/') || /\.test$/.test(specifier))) {
        findings.push(
          `${relPath}: file production import fixture/test: '${specifier}' — fixture chỉ được import từ file *.test.ts(x)`,
        );
      }
      if (!isTest && specifier.endsWith('.json') && specifier.startsWith('.')) {
        const resolvedAbsolute = resolve(dirname(file), specifier);
        const resolved = relative(srcDir, resolvedAbsolute).replaceAll('\\', '/');
        const allowed = ALLOWED_JSON_PREFIXES.some((prefix) => resolved.startsWith(prefix));
        if (!allowed) {
          findings.push(
            `${relPath}: import JSON ngoài allowlist công khai: '${specifier}' (resolved so với src/: ${resolved}). Thêm vào ALLOWED_JSON_PREFIXES nếu đây là dataset public thật.`,
          );
        }
      }
    }
  }

  // Reachability: does ProtectedApiAdapter show up anywhere reachable from the real app entry
  // point (main.tsx), following both static and dynamic imports? Today nothing imports it outside
  // its own test, so this should find nothing — it exists to catch a future accidental wiring
  // into the public app shell.
  const reachable = new Set();
  const queue = [entry];
  while (queue.length) {
    const current = queue.shift();
    if (reachable.has(current)) continue;
    reachable.add(current);
    const specifiers = importsByFile.get(current) ?? [];
    for (const specifier of specifiers) {
      if (!specifier.startsWith('.')) continue; // skip bare/node_modules specifiers
      const candidates = [
        resolve(dirname(current), specifier),
        resolve(dirname(current), `${specifier}.ts`),
        resolve(dirname(current), `${specifier}.tsx`),
        resolve(dirname(current), specifier, 'index.ts'),
      ];
      const resolved = candidates.find((candidate) => importsByFile.has(candidate));
      if (resolved && !reachable.has(resolved)) queue.push(resolved);
    }
  }
  const protectedAdapterFile = join(srcDir, 'data-platform', 'adapters', 'ProtectedApiAdapter.ts');
  if (reachable.has(protectedAdapterFile)) {
    findings.push(
      `ProtectedApiAdapter.ts có thể truy cập được từ src/main.tsx (app shell công khai) — xác nhận đây là chủ đích trước khi merge, hoặc thêm vào SOURCE_SCAN_ALLOWLIST kèm lý do.`,
    );
  }

  return findings;
}

// ---------------------------------------------------------------------------------------------
// --mode=dist
// ---------------------------------------------------------------------------------------------

// Schema/XML-namespace *identifiers* that look like URLs but are never fetched — every
// React/SVG/MathML-using bundle embeds the standard `http://www.w3.org/...` namespace URIs
// (xlink, svg, MathML, xml:base, xmlns) as plain string literals, and this repo's own JSON Schema
// `$id`/`$schema` fields use `http://json-schema.org` the same way (though those files aren't
// actually bundled today — kept allowlisted so this scan stays correct if that ever changes).
const HTTP_SCHEME_ALLOWLIST_PREFIXES = ['http://json-schema.org', 'http://www.w3.org/'];

// Hostname-shaped checks require a `://` immediately before the match — without it, minified
// library code is full of incidental lookalikes (React Three Fiber's own `.internal.interaction`
// property access matches a naive `internal\.` pattern; a version string or SVG coordinate can
// match a naive private-IP pattern). Requiring the scheme separator is what actually distinguishes
// "this is a URL" from "this is a property name/number that happens to contain these characters."
const DIST_FORBIDDEN_PATTERNS = [
  { name: 'localhost hostname', pattern: /:\/\/localhost\b/ },
  { name: '.local hostname', pattern: /:\/\/[a-z0-9-]+\.local\b/i },
  { name: 'internal. hostname', pattern: /:\/\/[a-z0-9.-]*internal\.[a-z0-9-]+/i },
  { name: 'intranet. hostname', pattern: /:\/\/[a-z0-9.-]*intranet\.[a-z0-9-]+/i },
  { name: 'RFC1918 private IP (10.x)', pattern: /:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/ },
  {
    name: 'RFC1918 private IP (172.16-31.x)',
    pattern: /:\/\/172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}\b/,
  },
  { name: 'RFC1918 private IP (192.168.x)', pattern: /:\/\/192\.168\.\d{1,3}\.\d{1,3}\b/ },
  { name: 'loopback IP (127.x)', pattern: /:\/\/127\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/ },
  {
    name: 'JWT-shaped token',
    pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
  },
  { name: 'Bearer token value', pattern: /\bBearer [A-Za-z0-9._~+/-]{20,}={0,2}\b/ },
  {
    name: 'credential-shaped query parameter',
    pattern: /[?&](?:token|credential|secret|api[_-]?key|signature)=/i,
  },
  {
    name: 'data-template placeholder content',
    pattern: /REPLACE_WITH_(?:REAL_DATASET_ID|UNIQUE_ID)/,
  },
  {
    name: 'protected/restricted role name',
    pattern: /\b(?:confidential|restricted)-data-viewer\b/,
  },
];

function findHttpViolations(content) {
  // Stop at the delimiters minified code actually uses around string literals — backtick
  // (template literals) and comma/semicolon are common right after a bundled namespace URI and
  // were previously swallowed into the "URL," producing garbled, meaningless matches.
  const matches = content.match(/http:\/\/[^\s"'`,;<>)]+/g) ?? [];
  return matches.filter(
    (url) => !HTTP_SCHEME_ALLOWLIST_PREFIXES.some((allowed) => url.startsWith(allowed)),
  );
}

async function distScan(
  distDir = join(root, 'dist'),
  manifestPath = join(root, 'reports', 'public-dataset-manifest.json'),
) {
  if (!existsSync(distDir)) {
    return ['dist/ không tồn tại — chạy `npm run build` trước khi validate:public-build:dist.'];
  }
  if (!existsSync(manifestPath)) {
    return [
      'Thiếu reports/public-dataset-manifest.json — chạy `npm test` trước (ghi manifest qua publicManifest.test.ts).',
    ];
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

  const files = await walk(distDir, (path) => /\.(js|css|html|json)$/.test(path));
  const findings = [];

  for (const file of files) {
    const relPath = repoRelative(file);
    const content = await readFile(file, 'utf8');

    for (const { name, pattern } of DIST_FORBIDDEN_PATTERNS) {
      if (pattern.test(content)) findings.push(`${relPath}: phát hiện ${name}`);
    }
    for (const violation of findHttpViolations(content)) {
      findings.push(`${relPath}: URL http:// không được phép (trừ allowlist schema): ${violation}`);
    }
    for (const datasetId of manifest.nonPublicDatasetIds) {
      if (content.includes(datasetId)) {
        findings.push(
          `${relPath}: chứa dataset id KHÔNG public '${datasetId}' — RÒ RỈ DỮ LIỆU vào bundle công khai.`,
        );
      }
    }
  }

  // Sanity check the manifest itself isn't stale/empty in a way that would make this scan a no-op.
  if (!Array.isArray(manifest.allDatasetIds) || manifest.allDatasetIds.length === 0) {
    findings.push('reports/public-dataset-manifest.json không có allDatasetIds hợp lệ.');
  }

  return findings;
}

async function main() {
  const findings = mode === 'dist' ? await distScan() : await sourceScan();
  if (findings.length) {
    console.error(`validate_public_build.mjs (--mode=${mode}) THẤT BẠI:\n`);
    for (const finding of findings) console.error(`  - ${finding}`);
    process.exitCode = 1;
    return;
  }
  console.log(`validate_public_build.mjs (--mode=${mode}) passed.`);
}

// Also usable as a library from tests, in addition to the CLI entry point below.
export { sourceScan, distScan };

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  await main();
}
