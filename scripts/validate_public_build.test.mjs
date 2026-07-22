import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { sourceScan, distScan } from './validate_public_build.mjs';

const tempDirs = [];

function makeTempDir() {
  const dir = mkdtempSync(join(tmpdir(), 'validate-public-build-'));
  tempDirs.push(dir);
  return dir;
}

function writeFile(root, relativePath, content) {
  const path = join(root, relativePath);
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, content, 'utf8');
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('sourceScan', () => {
  it('passes a production file that only imports an allowlisted public JSON asset', async () => {
    const src = makeTempDir();
    writeFile(src, 'main.tsx', `import data from './assets/data/thing.json';\n`);
    writeFile(src, 'assets/data/thing.json', '{}');
    const findings = await sourceScan(src);
    expect(findings).toEqual([]);
  });

  it('blocks an import from a forbidden /internal/ path segment', async () => {
    const src = makeTempDir();
    writeFile(src, 'main.tsx', `import secret from './internal/secret';\n`);
    writeFile(src, 'internal/secret.ts', 'export default 1;\n');
    const findings = await sourceScan(src);
    expect(findings.some((finding) => finding.includes('import từ path bị cấm'))).toBe(true);
  });

  it('blocks a JSON import outside the public allowlist', async () => {
    const src = makeTempDir();
    writeFile(src, 'main.tsx', `import secret from '../not-allowlisted/secret.json';\n`);
    const findings = await sourceScan(src);
    expect(findings.some((finding) => finding.includes('ngoài allowlist công khai'))).toBe(true);
  });

  it('blocks a production file importing a test fixture', async () => {
    const src = makeTempDir();
    writeFile(src, 'main.tsx', `import fixture from './fixtures/example.json';\n`);
    const findings = await sourceScan(src);
    expect(findings.some((finding) => finding.includes('fixture/test'))).toBe(true);
  });

  it('allows a *.test.ts file to import a fixture', async () => {
    const src = makeTempDir();
    writeFile(src, 'main.tsx', '');
    writeFile(src, 'thing.test.ts', `import fixture from './fixtures/example.json';\n`);
    const findings = await sourceScan(src);
    expect(findings).toEqual([]);
  });

  it('blocks an import from data-templates/', async () => {
    const src = makeTempDir();
    writeFile(src, 'main.tsx', `import tmpl from '../../data-templates/dataset-catalog.json';\n`);
    const findings = await sourceScan(src);
    expect(findings.some((finding) => finding.includes('data-templates'))).toBe(true);
  });

  it('flags ProtectedApiAdapter if it becomes reachable from main.tsx', async () => {
    const src = makeTempDir();
    writeFile(src, 'main.tsx', `import x from './data-platform/adapters/ProtectedApiAdapter';\n`);
    writeFile(src, 'data-platform/adapters/ProtectedApiAdapter.ts', 'export class X {}\n');
    const findings = await sourceScan(src);
    expect(
      findings.some((finding) => finding.includes('ProtectedApiAdapter.ts có thể truy cập')),
    ).toBe(true);
  });
});

describe('distScan', () => {
  function makeManifest(root, overrides = {}) {
    const manifestPath = join(root, 'public-dataset-manifest.json');
    writeFileSync(
      manifestPath,
      JSON.stringify({
        allDatasetIds: ['public-one'],
        nonPublicDatasetIds: [],
        expectedBundledDatasetIds: ['public-one'],
        ...overrides,
      }),
      'utf8',
    );
    return manifestPath;
  }

  it('fails clearly when dist/ does not exist', async () => {
    const root = makeTempDir();
    const findings = await distScan(join(root, 'dist'), makeManifest(root));
    expect(findings.some((finding) => finding.includes('chạy `npm run build`'))).toBe(true);
  });

  it('fails clearly when the public dataset manifest is missing', async () => {
    const root = makeTempDir();
    const dist = join(root, 'dist');
    writeFile(dist, 'app.js', 'console.log(1)');
    const findings = await distScan(dist, join(root, 'missing-manifest.json'));
    expect(findings.some((finding) => finding.includes('npm test'))).toBe(true);
  });

  it('passes clean output with no leakage', async () => {
    const root = makeTempDir();
    const dist = join(root, 'dist');
    writeFile(dist, 'app.js', 'console.log("hello world")');
    const findings = await distScan(dist, makeManifest(root));
    expect(findings).toEqual([]);
  });

  it('blocks a private-hostname URL embedded in a built chunk', async () => {
    const root = makeTempDir();
    const dist = join(root, 'dist');
    writeFile(dist, 'app.js', `fetch("https://10.0.0.5/api")`);
    const findings = await distScan(dist, makeManifest(root));
    expect(findings.some((finding) => finding.includes('RFC1918 private IP'))).toBe(true);
  });

  it('does not flag the standard http://www.w3.org/... XML namespace or http://json-schema.org identifiers', async () => {
    const root = makeTempDir();
    const dist = join(root, 'dist');
    writeFile(
      dist,
      'app.js',
      '`http://www.w3.org/2000/svg`,`svg`;`http://json-schema.org/draft-07/schema#`',
    );
    const findings = await distScan(dist, makeManifest(root));
    expect(findings).toEqual([]);
  });

  it('blocks a real-shaped JWT but does not misfire on an unrelated dotted string', async () => {
    const root = makeTempDir();
    const dist = join(root, 'dist');
    writeFile(
      dist,
      'app.js',
      'const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U";',
    );
    const findings = await distScan(dist, makeManifest(root));
    expect(findings.some((finding) => finding.includes('JWT-shaped token'))).toBe(true);

    const root2 = makeTempDir();
    const dist2 = join(root2, 'dist');
    writeFile(dist2, 'app.js', 'const version = "react-dom.production.min";');
    const findings2 = await distScan(dist2, makeManifest(root2));
    expect(findings2.some((finding) => finding.includes('JWT-shaped token'))).toBe(false);
  });

  it('blocks a non-public dataset id leaking into the bundle', async () => {
    const root = makeTempDir();
    const dist = join(root, 'dist');
    writeFile(dist, 'app.js', 'const catalog = ["secret-internal-dataset"];');
    const manifestPath = makeManifest(root, { nonPublicDatasetIds: ['secret-internal-dataset'] });
    const findings = await distScan(dist, manifestPath);
    expect(findings.some((finding) => finding.includes('RÒ RỈ DỮ LIỆU'))).toBe(true);
  });
});
