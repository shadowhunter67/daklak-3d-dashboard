// Public-data leakage boundary for the GitHub Pages (public) deployment profile. Two modes:
//
//   --mode=source  Static-analyzes src/ import statements and the public/ directory before build
//                  (fast, catches mistakes early): forbidden path segments, JSON/GeoJSON/CSV/... data
//                  file imports that aren't registered under their EXACT path in
//                  config/public-data-files.json, imports from data-templates/, production files
//                  importing test fixtures, unregistered data files sitting in public/ (which Vite
//                  copies verbatim into dist/ with no import at all), and whether
//                  ProtectedApiAdapter is reachable from the real app entry point.
//   --mode=dist    Scans the built dist/ output (after `npm run build`) for the same kind of
//                  leakage that could only show up in the final bundle: private hostnames,
//                  credential-shaped query params, JWTs/bearer tokens, non-public dataset ids,
//                  missing/unregistered public data files (from
//                  reports/public-dataset-manifest.json, written by `npm run generate:public-manifest`
//                  — see scripts/generate_public_manifest.mjs), and data-template/protected-role
//                  content that must never ship publicly.
//
// This complements (does not replace) catalogValidation.ts's in-catalog checks (spec §3): that
// Vitest suite only ever sees datasets that were actually *registered*; this script is the one
// that would catch a developer bypassing the catalog entirely with a raw import, OR a data file
// dropped into src/assets/**/ or public/**/ without ever being registered anywhere.
//
// Registry vs. catalog — two different layers, deliberately not merged:
//   - `src/data-platform/catalog/datasets.ts` (DatasetDescriptor) describes a *logical dataset*:
//     its provenance, classification, freshness, quality.
//   - `config/public-data-files.json` (this file's registry) describes *physical payloads* allowed
//     to ship in the public build: an exact repo-relative path, which dataset(s) it backs, and how
//     it's delivered (bundled into a JS chunk, or copied verbatim from public/). A dataset can
//     exist without any registered file (e.g. a document-only citation); a registered file always
//     names the dataset(s) it belongs to so its classification/access can be cross-checked.
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mode = (process.argv.find((arg) => arg.startsWith('--mode=')) ?? '--mode=source').split(
  '=',
)[1];

const DEFAULT_REGISTRY_PATH = join(root, 'config', 'public-data-files.json');
const DEFAULT_MANIFEST_PATH = join(root, 'reports', 'public-dataset-manifest.json');

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

function repoRelativeTo(repoRoot, path) {
  return relative(repoRoot, path).replaceAll('\\', '/');
}

// ---------------------------------------------------------------------------------------------
// Public data file registry (config/public-data-files.json)
// ---------------------------------------------------------------------------------------------

// Extensions treated as "data" regardless of how innocuous their content looks — absence of a
// sensitive pattern is never evidence a file is safe to ship unregistered (spec §4). A trailing
// `.gz` is stripped before matching so `daklak-roads.json.gz` is still recognized as JSON data.
const DATA_FILE_EXTENSIONS = [
  '.json',
  '.geojson',
  '.csv',
  '.tsv',
  '.pmtiles',
  '.pbf',
  '.mvt',
  '.topojson',
  '.parquet',
  '.arrow',
  '.feather',
];

function withoutGzSuffix(path) {
  return path.toLowerCase().endsWith('.gz') ? path.slice(0, -3) : path;
}

function isDataFilePath(path) {
  const base = withoutGzSuffix(path.split(/[?#]/)[0]);
  return DATA_FILE_EXTENSIONS.some((ext) => base.toLowerCase().endsWith(ext));
}

// Non-data static assets Vite copies from public/ verbatim — favicon, images, fonts, plain-text
// files. Extension-based, not path-based: any file of these kinds passes regardless of location,
// but anything data-shaped never does, no matter how deep an "assets" folder it sits in.
const STATIC_ASSET_EXTENSIONS = [
  '.svg',
  '.ico',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.avif',
  '.woff',
  '.woff2',
  '.txt',
  '.webmanifest',
];

function isKnownStaticAsset(path) {
  return STATIC_ASSET_EXTENSIONS.some((ext) => path.toLowerCase().endsWith(ext));
}

// Build artifacts emitted directly by the Vite build (vite.config.ts's `build-info` plugin), never
// present in public/ or src/, so they can never be "registered" the same way a source data file is
// — allowlisted by exact dist-relative path instead.
const DIST_GENERATED_FILE_ALLOWLIST = new Set(['build-info.json']);

function loadRegistry(path = DEFAULT_REGISTRY_PATH) {
  if (!existsSync(path)) return { version: 1, files: [], __missing: path };
  return JSON.parse(readFileSync(path, 'utf8'));
}

function isPathTraversal(path) {
  if (path.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(path)) return true;
  return path.split(/[\\/]/).includes('..');
}

function sha256OfFile(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

/**
 * Validates the registry's *internal* consistency: shape, path safety, duplicates, checksum
 * format/match, and (when `datasetInfoById` is available) that every referenced dataset really
 * exists in the catalog, is `classification: 'public'`, and isn't `requiresAuthentication`/
 * `protected-api`. Independent of whether any of these files are actually imported anywhere —
 * a registered-but-unimported entry with a bad dataset reference must still fail.
 *
 * @param {{version?: number, files?: unknown[]}} registry
 * @param {Record<string, {classification: string, delivery: string, requiresAuthentication: boolean}> | null} datasetInfoById
 * @param {string | undefined} repoRoot when provided, verifies each file exists and checksums match
 */
function validateRegistry(registry, datasetInfoById, repoRoot) {
  const issues = [];
  if (registry?.__missing) {
    issues.push(
      `Không tìm thấy public data file registry tại ${registry.__missing} — xem docs/dataset-onboarding.md.`,
    );
    return issues;
  }
  if (!registry || !Array.isArray(registry.files)) {
    issues.push('Registry không hợp lệ: thiếu mảng "files".');
    return issues;
  }

  const seenPaths = new Set();
  for (const entry of registry.files) {
    const label = typeof entry?.path === 'string' && entry.path ? entry.path : '(thiếu path)';

    if (typeof entry?.path !== 'string' || !entry.path || entry.path.includes('*')) {
      issues.push(
        `Registry entry '${label}': path phải là một chuỗi đường dẫn chính xác, không wildcard/prefix.`,
      );
      continue;
    }
    if (isPathTraversal(entry.path)) {
      issues.push(`Registry entry '${entry.path}': path không hợp lệ (tuyệt đối hoặc chứa '..').`);
    }
    if (seenPaths.has(entry.path)) {
      issues.push(`Registry entry '${entry.path}': trùng path trong registry.`);
    }
    seenPaths.add(entry.path);

    if (entry.classification !== 'public') {
      issues.push(
        `Registry entry '${entry.path}': classification phải là 'public' (đang là '${entry.classification}').`,
      );
    }
    if (!['bundled-static', 'public-static-asset'].includes(entry.delivery)) {
      issues.push(
        `Registry entry '${entry.path}': delivery phải là 'bundled-static' hoặc 'public-static-asset' (đang là '${entry.delivery}').`,
      );
    }

    if (!Array.isArray(entry.datasetIds) || entry.datasetIds.length === 0) {
      issues.push(`Registry entry '${entry.path}': phải khai ít nhất một datasetIds.`);
    } else if (datasetInfoById) {
      for (const datasetId of entry.datasetIds) {
        const info = datasetInfoById[datasetId];
        if (!info) {
          issues.push(
            `Registry entry '${entry.path}': tham chiếu dataset id không tồn tại trong catalog: '${datasetId}'.`,
          );
          continue;
        }
        if (info.classification !== 'public') {
          issues.push(
            `Registry entry '${entry.path}': dataset '${datasetId}' có classification='${info.classification}', không phải public — không được đăng ký làm public data file.`,
          );
        }
        if (info.requiresAuthentication) {
          issues.push(
            `Registry entry '${entry.path}': dataset '${datasetId}' có requiresAuthentication=true — mâu thuẫn với việc đăng ký làm public data file.`,
          );
        }
        if (info.delivery === 'protected-api') {
          issues.push(
            `Registry entry '${entry.path}': dataset '${datasetId}' có access.delivery='protected-api'.`,
          );
        }
      }
    }

    if (!entry.checksum && !entry.note) {
      issues.push(
        `Registry entry '${entry.path}': thiếu cả checksum lẫn note — file nhỏ không cần checksum vẫn phải có note giải thích lý do.`,
      );
    }
    if (entry.checksum && !/^[a-f0-9]{64}$/i.test(entry.checksum)) {
      issues.push(
        `Registry entry '${entry.path}': checksum không đúng định dạng SHA-256 (64 hex).`,
      );
    }

    if (repoRoot) {
      const absolutePath = join(repoRoot, entry.path);
      if (!existsSync(absolutePath)) {
        issues.push(`Registry entry '${entry.path}': file không tồn tại (so với repo root).`);
      } else if (entry.checksum && /^[a-f0-9]{64}$/i.test(entry.checksum)) {
        const actual = sha256OfFile(absolutePath);
        if (actual !== entry.checksum.toLowerCase()) {
          issues.push(
            `Registry entry '${entry.path}': checksum không khớp (khai báo ${entry.checksum}, thực tế ${actual}).`,
          );
        }
      }
    }
  }
  return issues;
}

function findRegistryEntry(registry, repoRelativePath) {
  return registry.files?.find((entry) => entry.path === repoRelativePath);
}

function loadDatasetInfoFromManifest(manifestPath = DEFAULT_MANIFEST_PATH) {
  if (!existsSync(manifestPath)) return null;
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const map = {};
  for (const dataset of manifest.datasets ?? []) map[dataset.id] = dataset;
  return map;
}

// ---------------------------------------------------------------------------------------------
// --mode=source
// ---------------------------------------------------------------------------------------------

const IMPORT_SPECIFIER_PATTERN = /(?:from|import)\s*\(?['"]([^'"]+)['"]/g;
const REQUIRE_PATTERN = /\brequire\(\s*['"]([^'"]+)['"]\s*\)/g;
const NEW_URL_IMPORT_META_PATTERN = /new\s+URL\(\s*['"]([^'"]+)['"]\s*,\s*import\.meta\.url\s*\)/g;
const IMPORT_META_GLOB_PATTERN = /import\.meta\.glob(?:Eager)?\s*\(\s*['"]([^'"]+)['"]/g;

function extractGroup1(pattern, content) {
  pattern.lastIndex = 0;
  const results = [];
  let match;
  while ((match = pattern.exec(content))) results.push(match[1]);
  return results;
}

// Directory-name segments that must never appear in an import path from production source. If a
// legitimate future feature needs one of these (e.g. a real `internal/` folder for a secure
// deployment profile that is genuinely never bundled publicly), add an explicit, commented
// allowlist entry below rather than loosening this list.
const FORBIDDEN_PATH_SEGMENTS = ['/internal/', '/confidential/', '/restricted/', '/protected/'];

// Source-scan exceptions, each with the reason it's safe. Keyed by the repo-relative file path.
const SOURCE_SCAN_ALLOWLIST = {
  // ProtectedApiAdapter.ts's own filename contains "Protected" but is not a `/protected/` path
  // segment, and it only ever appears in its own test file — no allowlist entry is actually
  // needed today; kept here as the documented place to add one if that ever changes.
};

function isTestFile(path) {
  return /\.test\.tsx?$/.test(path);
}

/**
 * @param {string} srcDir defaults to <repo>/src; the registry/manifest default paths and the
 *   repo-relative path resolution used for registry lookups are both derived from its parent
 *   directory, so tests can pass a temp `<tempRoot>/src` and get realistic `src/...` paths back.
 * @param {{registry?: object, registryPath?: string, datasetInfoById?: object|null, manifestPath?: string}} options
 */
async function sourceScan(srcDir = join(root, 'src'), options = {}) {
  const repoRoot = dirname(srcDir);
  const registry =
    options.registry ??
    loadRegistry(options.registryPath ?? join(repoRoot, 'config', 'public-data-files.json'));
  const datasetInfoById =
    'datasetInfoById' in options
      ? options.datasetInfoById
      : loadDatasetInfoFromManifest(
          options.manifestPath ?? join(repoRoot, 'reports', 'public-dataset-manifest.json'),
        );

  const findings = [];

  if (datasetInfoById === null) {
    findings.push(
      'Thiếu reports/public-dataset-manifest.json — chạy `npm run generate:public-manifest` trước khi validate:public-build.',
    );
  } else {
    findings.push(...validateRegistry(registry, datasetInfoById, repoRoot));
  }

  const entry = join(srcDir, 'main.tsx');
  const files = await walk(srcDir, (path) => /\.(ts|tsx)$/.test(path));

  /** @type {Map<string, string[]>} resolved file path -> import specifiers (for the reachability graph) */
  const importsByFile = new Map();

  for (const file of files) {
    const relPath = repoRelativeTo(repoRoot, file);
    if (SOURCE_SCAN_ALLOWLIST[relPath]) continue;
    const content = await readFile(file, 'utf8');
    const isTest = isTestFile(file);

    const moduleSpecifiers = [
      ...extractGroup1(IMPORT_SPECIFIER_PATTERN, content),
      ...extractGroup1(REQUIRE_PATTERN, content),
    ];
    importsByFile.set(file, moduleSpecifiers);

    const dataOnlySpecifiers = extractGroup1(NEW_URL_IMPORT_META_PATTERN, content);
    const globSpecifiers = extractGroup1(IMPORT_META_GLOB_PATTERN, content);

    for (const globPattern of globSpecifiers) {
      if (
        isDataFilePath(globPattern) ||
        DATA_FILE_EXTENSIONS.some((ext) => globPattern.includes(ext))
      ) {
        findings.push(
          `${relPath}: import.meta.glob nhắm tới file dữ liệu ('${globPattern}') — scanner không xác thực được glob theo registry, hãy import từng file dữ liệu tường minh để được kiểm tra chính xác theo path.`,
        );
      }
    }

    for (const specifier of [...moduleSpecifiers, ...dataOnlySpecifiers]) {
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
      if (!isTest && isDataFilePath(specifier) && specifier.startsWith('.')) {
        const resolvedAbsolute = resolve(dirname(file), specifier);
        const resolvedRepoRelative = repoRelativeTo(repoRoot, resolvedAbsolute);
        const registryEntry = findRegistryEntry(registry, resolvedRepoRelative);
        if (!registryEntry) {
          findings.push(
            `${relPath}: import file dữ liệu chưa đăng ký trong registry: '${specifier}' (resolved: ${resolvedRepoRelative}). Thêm entry vào config/public-data-files.json nếu đây là dataset public thật — xem docs/dataset-onboarding.md.`,
          );
        } else if (registryEntry.delivery !== 'bundled-static') {
          findings.push(
            `${relPath}: '${resolvedRepoRelative}' được import trực tiếp vào JS nhưng registry khai delivery='${registryEntry.delivery}' — phải là 'bundled-static'.`,
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

  // public/ scan — Vite copies this directory's contents verbatim into dist/ with no import
  // statement anywhere, so the import-based checks above cannot see these files at all (spec §4).
  const publicDir = join(repoRoot, 'public');
  if (existsSync(publicDir)) {
    const publicFiles = await walk(publicDir, () => true);
    for (const file of publicFiles) {
      const relPath = repoRelativeTo(repoRoot, file);
      if (isDataFilePath(relPath)) {
        const registryEntry = findRegistryEntry(registry, relPath);
        if (!registryEntry) {
          findings.push(
            `${relPath}: file dữ liệu trong public/ chưa đăng ký trong registry — Vite sẽ copy nguyên file này vào dist/ dù không có import nào. Đăng ký vào config/public-data-files.json hoặc gỡ file này.`,
          );
        } else if (registryEntry.delivery !== 'public-static-asset') {
          findings.push(
            `${relPath}: đã đăng ký nhưng delivery phải là 'public-static-asset' (đang là '${registryEntry.delivery}') vì file nằm trong public/.`,
          );
        }
      } else if (!isKnownStaticAsset(relPath)) {
        findings.push(
          `${relPath}: file tĩnh trong public/ không thuộc STATIC_ASSET_EXTENSIONS đã biết — xác nhận đây không phải dữ liệu trước khi thêm, hoặc mở rộng allowlist trong validate_public_build.mjs kèm lý do.`,
        );
      }
    }
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
  manifestPath = DEFAULT_MANIFEST_PATH,
  options = {},
) {
  if (!existsSync(distDir)) {
    return ['dist/ không tồn tại — chạy `npm run build` trước khi validate:public-build:dist.'];
  }
  if (!existsSync(manifestPath)) {
    return [
      'Thiếu reports/public-dataset-manifest.json — chạy `npm run generate:public-manifest` trước.',
    ];
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const registeredFiles =
    options.registeredPublicDataFiles ?? manifest.registeredPublicDataFiles ?? [];

  const files = await walk(distDir, () => true);
  const findings = [];

  for (const file of files) {
    const relPath = repoRelativeTo(root, file);
    const distRelative = repoRelativeTo(distDir, file);
    const isScannableText = /\.(js|css|html|json)$/.test(file);

    if (isScannableText) {
      const content = await readFile(file, 'utf8');
      for (const { name, pattern } of DIST_FORBIDDEN_PATTERNS) {
        if (pattern.test(content)) findings.push(`${relPath}: phát hiện ${name}`);
      }
      for (const violation of findHttpViolations(content)) {
        findings.push(
          `${relPath}: URL http:// không được phép (trừ allowlist schema): ${violation}`,
        );
      }
      for (const datasetId of manifest.nonPublicDatasetIds ?? []) {
        if (content.includes(datasetId)) {
          findings.push(
            `${relPath}: chứa dataset id KHÔNG public '${datasetId}' — RÒ RỈ DỮ LIỆU vào bundle công khai.`,
          );
        }
      }
    }

    // Unregistered data file present in the built output — whether it arrived via public/ being
    // copied verbatim or some other Vite asset-handling path, every *.json/*.geojson/*.csv/...
    // artifact in dist/ must trace back to a registered entry. Absence of a sensitive pattern
    // above is never evidence this file is fine to ship (spec §4/§7).
    if (isDataFilePath(distRelative) && !DIST_GENERATED_FILE_ALLOWLIST.has(distRelative)) {
      const matches = registeredFiles.some(
        (entry) =>
          entry.delivery === 'public-static-asset' &&
          entry.path.replace(/^public\//, '') === distRelative,
      );
      if (!matches) {
        findings.push(
          `dist/${distRelative}: file dữ liệu KHÔNG có trong registry public data file (registeredPublicDataFiles) — có thể là rò rỉ hoặc file thừa không nên ship.`,
        );
      }
    }
  }

  // Every registered public-static-asset file must actually appear at its expected dist path —
  // catches the file being removed from public/ (or renamed) without updating the registry.
  for (const entry of registeredFiles) {
    if (entry.delivery !== 'public-static-asset') continue;
    const distRelative = entry.path.replace(/^public\//, '');
    if (!existsSync(join(distDir, distRelative))) {
      findings.push(
        `dist/${distRelative}: file public-static-asset đã đăng ký ('${entry.path}') nhưng KHÔNG xuất hiện trong dist/ sau build.`,
      );
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

// Also usable as a library from tests and from generate_public_manifest.mjs, in addition to the
// CLI entry point below.
export {
  sourceScan,
  distScan,
  loadRegistry,
  validateRegistry,
  isDataFilePath,
  DATA_FILE_EXTENSIONS,
};

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  await main();
}
