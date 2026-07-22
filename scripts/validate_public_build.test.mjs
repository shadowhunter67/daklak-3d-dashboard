import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  sourceScan,
  distScan,
  validateRegistry,
  isDataFilePath,
} from './validate_public_build.mjs';

const tempDirs = [];

function makeTempDir() {
  const dir = mkdtempSync(join(tmpdir(), 'validate-public-build-'));
  tempDirs.push(dir);
  return dir;
}

function makeTempRepo() {
  const root = makeTempDir();
  return { root, src: join(root, 'src') };
}

function writeFile(root, relativePath, content) {
  const path = join(root, relativePath);
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, content, 'utf8');
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const PUBLIC_DATASET_INFO = {
  'demo-dataset': {
    id: 'demo-dataset',
    classification: 'public',
    delivery: 'bundled-static',
    requiresAuthentication: false,
  },
};

describe('isDataFilePath', () => {
  it('recognizes every listed data extension, including a trailing .gz', () => {
    expect(isDataFilePath('./thing.json')).toBe(true);
    expect(isDataFilePath('./thing.geojson')).toBe(true);
    expect(isDataFilePath('./thing.csv')).toBe(true);
    expect(isDataFilePath('./thing.pmtiles')).toBe(true);
    expect(isDataFilePath('./roads.json.gz')).toBe(true);
    expect(isDataFilePath('./thing.ts')).toBe(false);
    expect(isDataFilePath('./thing.css')).toBe(false);
    expect(isDataFilePath('./favicon.svg')).toBe(false);
  });
});

describe('sourceScan', () => {
  it('passes a production file that imports a registered JSON file with a valid public dataset id', async () => {
    const { root, src } = makeTempRepo();
    writeFile(src, 'main.tsx', `import data from './assets/data/thing.json';\n`);
    writeFile(src, 'assets/data/thing.json', '{}');
    const registry = {
      version: 1,
      files: [
        {
          path: 'src/assets/data/thing.json',
          datasetIds: ['demo-dataset'],
          classification: 'public',
          delivery: 'bundled-static',
          note: 'test fixture, no payload worth hashing',
        },
      ],
    };
    const findings = await sourceScan(src, { registry, datasetInfoById: PUBLIC_DATASET_INFO });
    expect(findings).toEqual([]);
    void root;
  });

  it('blocks a JSON import under the legacy assets/data/ prefix that is not in the registry (internal-payroll.json)', async () => {
    const { src } = makeTempRepo();
    writeFile(src, 'main.tsx', `import payroll from './assets/data/internal-payroll.json';\n`);
    writeFile(src, 'assets/data/internal-payroll.json', '{}');
    const registry = { version: 1, files: [] };
    const findings = await sourceScan(src, { registry, datasetInfoById: PUBLIC_DATASET_INFO });
    expect(
      findings.some(
        (f) => f.includes('chưa đăng ký trong registry') && f.includes('internal-payroll.json'),
      ),
    ).toBe(true);
  });

  it('blocks a JSON import under assets/maps/daklak/ that has no registry entry', async () => {
    const { src } = makeTempRepo();
    writeFile(src, 'main.tsx', `import x from './assets/maps/daklak/unregistered.json';\n`);
    writeFile(src, 'assets/maps/daklak/unregistered.json', '{}');
    const registry = { version: 1, files: [] };
    const findings = await sourceScan(src, { registry, datasetInfoById: PUBLIC_DATASET_INFO });
    expect(findings.some((f) => f.includes('chưa đăng ký trong registry'))).toBe(true);
  });

  it('blocks re-exporting an unregistered JSON file (export { default } from ...)', async () => {
    const { src } = makeTempRepo();
    writeFile(src, 'main.tsx', '');
    writeFile(src, 'feature.ts', `export { default } from './assets/data/unregistered.json';\n`);
    writeFile(src, 'assets/data/unregistered.json', '{}');
    const registry = { version: 1, files: [] };
    const findings = await sourceScan(src, { registry, datasetInfoById: PUBLIC_DATASET_INFO });
    expect(findings.some((f) => f.includes('chưa đăng ký trong registry'))).toBe(true);
  });

  it('blocks a dynamic import() of an unregistered JSON file', async () => {
    const { src } = makeTempRepo();
    writeFile(src, 'main.tsx', '');
    writeFile(src, 'feature.ts', `const data = await import('./assets/data/unregistered.json');\n`);
    writeFile(src, 'assets/data/unregistered.json', '{}');
    const registry = { version: 1, files: [] };
    const findings = await sourceScan(src, { registry, datasetInfoById: PUBLIC_DATASET_INFO });
    expect(findings.some((f) => f.includes('chưa đăng ký trong registry'))).toBe(true);
  });

  it('blocks new URL(..., import.meta.url) pointing at an unregistered JSON file', async () => {
    const { src } = makeTempRepo();
    writeFile(src, 'main.tsx', '');
    writeFile(
      src,
      'feature.ts',
      `const url = new URL('./assets/data/unregistered.json', import.meta.url);\n`,
    );
    writeFile(src, 'assets/data/unregistered.json', '{}');
    const registry = { version: 1, files: [] };
    const findings = await sourceScan(src, { registry, datasetInfoById: PUBLIC_DATASET_INFO });
    expect(findings.some((f) => f.includes('chưa đăng ký trong registry'))).toBe(true);
  });

  it('flags import.meta.glob targeting a data extension as unsupported by the scanner', async () => {
    const { src } = makeTempRepo();
    writeFile(src, 'main.tsx', '');
    writeFile(src, 'feature.ts', `const modules = import.meta.glob('./assets/data/*.json');\n`);
    const registry = { version: 1, files: [] };
    const findings = await sourceScan(src, { registry, datasetInfoById: PUBLIC_DATASET_INFO });
    expect(findings.some((f) => f.includes('import.meta.glob'))).toBe(true);
  });

  it('blocks an import from a forbidden /internal/ path segment', async () => {
    const { src } = makeTempRepo();
    writeFile(src, 'main.tsx', `import secret from './internal/secret';\n`);
    writeFile(src, 'internal/secret.ts', 'export default 1;\n');
    const registry = { version: 1, files: [] };
    const findings = await sourceScan(src, { registry, datasetInfoById: PUBLIC_DATASET_INFO });
    expect(findings.some((finding) => finding.includes('import từ path bị cấm'))).toBe(true);
  });

  it('blocks a production file importing a test fixture', async () => {
    const { src } = makeTempRepo();
    writeFile(src, 'main.tsx', `import fixture from './fixtures/example.json';\n`);
    const registry = { version: 1, files: [] };
    const findings = await sourceScan(src, { registry, datasetInfoById: PUBLIC_DATASET_INFO });
    expect(findings.some((finding) => finding.includes('fixture/test'))).toBe(true);
  });

  it('allows a *.test.ts file to import a fixture', async () => {
    const { src } = makeTempRepo();
    writeFile(src, 'main.tsx', '');
    writeFile(src, 'thing.test.ts', `import fixture from './fixtures/example.json';\n`);
    const registry = { version: 1, files: [] };
    const findings = await sourceScan(src, { registry, datasetInfoById: PUBLIC_DATASET_INFO });
    expect(findings).toEqual([]);
  });

  it('allows importing a node module and a CSS file with no registry involved', async () => {
    const { src } = makeTempRepo();
    writeFile(src, 'main.tsx', `import x from 'zustand';\nimport './styles.css';\n`);
    writeFile(src, 'styles.css', 'body {}');
    const registry = { version: 1, files: [] };
    const findings = await sourceScan(src, { registry, datasetInfoById: PUBLIC_DATASET_INFO });
    expect(findings).toEqual([]);
  });

  it('blocks an import from data-templates/', async () => {
    const { src } = makeTempRepo();
    writeFile(src, 'main.tsx', `import tmpl from '../../data-templates/dataset-catalog.json';\n`);
    const registry = { version: 1, files: [] };
    const findings = await sourceScan(src, { registry, datasetInfoById: PUBLIC_DATASET_INFO });
    expect(findings.some((finding) => finding.includes('data-templates'))).toBe(true);
  });

  it('flags ProtectedApiAdapter if it becomes reachable from main.tsx', async () => {
    const { src } = makeTempRepo();
    writeFile(src, 'main.tsx', `import x from './data-platform/adapters/ProtectedApiAdapter';\n`);
    writeFile(src, 'data-platform/adapters/ProtectedApiAdapter.ts', 'export class X {}\n');
    const registry = { version: 1, files: [] };
    const findings = await sourceScan(src, { registry, datasetInfoById: PUBLIC_DATASET_INFO });
    expect(
      findings.some((finding) => finding.includes('ProtectedApiAdapter.ts có thể truy cập')),
    ).toBe(true);
  });

  it('reports a missing manifest as a finding instead of silently skipping registry cross-checks', async () => {
    const { src } = makeTempRepo();
    writeFile(src, 'main.tsx', '');
    const registry = { version: 1, files: [] };
    const findings = await sourceScan(src, { registry, datasetInfoById: null });
    expect(findings.some((f) => f.includes('generate:public-manifest'))).toBe(true);
  });

  describe('public/ scan', () => {
    it('blocks an unregistered public/internal-export.json', async () => {
      const { root, src } = makeTempRepo();
      writeFile(src, 'main.tsx', '');
      writeFile(root, 'public/internal-export.json', '{}');
      const registry = { version: 1, files: [] };
      const findings = await sourceScan(src, { registry, datasetInfoById: PUBLIC_DATASET_INFO });
      expect(
        findings.some(
          (f) => f.includes('public/internal-export.json') && f.includes('chưa đăng ký'),
        ),
      ).toBe(true);
    });

    it('blocks an unregistered public/data/unregistered.csv', async () => {
      const { root, src } = makeTempRepo();
      writeFile(src, 'main.tsx', '');
      writeFile(root, 'public/data/unregistered.csv', 'a,b\n1,2\n');
      const registry = { version: 1, files: [] };
      const findings = await sourceScan(src, { registry, datasetInfoById: PUBLIC_DATASET_INFO });
      expect(findings.some((f) => f.includes('public/data/unregistered.csv'))).toBe(true);
    });

    it('blocks an unregistered public/tiles/private.pmtiles', async () => {
      const { root, src } = makeTempRepo();
      writeFile(src, 'main.tsx', '');
      writeFile(root, 'public/tiles/private.pmtiles', 'binary-ish');
      const registry = { version: 1, files: [] };
      const findings = await sourceScan(src, { registry, datasetInfoById: PUBLIC_DATASET_INFO });
      expect(findings.some((f) => f.includes('public/tiles/private.pmtiles'))).toBe(true);
    });

    it('passes a registered exact public data file', async () => {
      const { root, src } = makeTempRepo();
      writeFile(src, 'main.tsx', '');
      writeFile(root, 'public/data/roads.json.gz', 'gzip-ish');
      const registry = {
        version: 1,
        files: [
          {
            path: 'public/data/roads.json.gz',
            datasetIds: ['demo-dataset'],
            classification: 'public',
            delivery: 'public-static-asset',
            note: 'test fixture',
          },
        ],
      };
      const findings = await sourceScan(src, { registry, datasetInfoById: PUBLIC_DATASET_INFO });
      expect(findings).toEqual([]);
    });

    it('passes favicon.svg and robots.txt without any registry entry', async () => {
      const { root, src } = makeTempRepo();
      writeFile(src, 'main.tsx', '');
      writeFile(root, 'public/favicon.svg', '<svg></svg>');
      writeFile(root, 'public/robots.txt', 'User-agent: *\n');
      const registry = { version: 1, files: [] };
      const findings = await sourceScan(src, { registry, datasetInfoById: PUBLIC_DATASET_INFO });
      expect(findings).toEqual([]);
    });
  });
});

describe('validateRegistry (manifest/registry validation)', () => {
  it('passes a well-formed registry', () => {
    const issues = validateRegistry(
      {
        version: 1,
        files: [
          {
            path: 'src/assets/data/thing.json',
            datasetIds: ['demo-dataset'],
            classification: 'public',
            delivery: 'bundled-static',
            note: 'small file',
          },
        ],
      },
      PUBLIC_DATASET_INFO,
    );
    expect(issues).toEqual([]);
  });

  it('fails on a duplicate registry path', () => {
    const entry = {
      path: 'src/assets/data/thing.json',
      datasetIds: ['demo-dataset'],
      classification: 'public',
      delivery: 'bundled-static',
      note: 'x',
    };
    const issues = validateRegistry(
      { version: 1, files: [entry, { ...entry }] },
      PUBLIC_DATASET_INFO,
    );
    expect(issues.some((i) => i.includes('Trùng path') || i.includes('trùng path'))).toBe(true);
  });

  it('fails on a path containing ../ traversal', () => {
    const issues = validateRegistry(
      {
        version: 1,
        files: [
          {
            path: '../outside/thing.json',
            datasetIds: ['demo-dataset'],
            classification: 'public',
            delivery: 'bundled-static',
            note: 'x',
          },
        ],
      },
      PUBLIC_DATASET_INFO,
    );
    expect(issues.some((i) => i.includes('không hợp lệ'))).toBe(true);
  });

  it('fails when a dataset id does not exist in the catalog', () => {
    const issues = validateRegistry(
      {
        version: 1,
        files: [
          {
            path: 'src/assets/data/thing.json',
            datasetIds: ['nonexistent'],
            classification: 'public',
            delivery: 'bundled-static',
            note: 'x',
          },
        ],
      },
      PUBLIC_DATASET_INFO,
    );
    expect(issues.some((i) => i.includes('không tồn tại trong catalog'))).toBe(true);
  });

  it('fails when the dataset classification is not public', () => {
    const issues = validateRegistry(
      {
        version: 1,
        files: [
          {
            path: 'src/assets/data/thing.json',
            datasetIds: ['internal-one'],
            classification: 'public',
            delivery: 'bundled-static',
            note: 'x',
          },
        ],
      },
      {
        'internal-one': {
          id: 'internal-one',
          classification: 'internal',
          delivery: 'bundled-static',
          requiresAuthentication: false,
        },
      },
    );
    expect(issues.some((i) => i.includes('không phải public'))).toBe(true);
  });

  it('fails when the dataset requires authentication', () => {
    const issues = validateRegistry(
      {
        version: 1,
        files: [
          {
            path: 'src/assets/data/thing.json',
            datasetIds: ['auth-one'],
            classification: 'public',
            delivery: 'bundled-static',
            note: 'x',
          },
        ],
      },
      {
        'auth-one': {
          id: 'auth-one',
          classification: 'public',
          delivery: 'bundled-static',
          requiresAuthentication: true,
        },
      },
    );
    expect(issues.some((i) => i.includes('requiresAuthentication'))).toBe(true);
  });

  it('fails when the dataset delivery is protected-api', () => {
    const issues = validateRegistry(
      {
        version: 1,
        files: [
          {
            path: 'src/assets/data/thing.json',
            datasetIds: ['protected-one'],
            classification: 'public',
            delivery: 'bundled-static',
            note: 'x',
          },
        ],
      },
      {
        'protected-one': {
          id: 'protected-one',
          classification: 'public',
          delivery: 'protected-api',
          requiresAuthentication: false,
        },
      },
    );
    expect(issues.some((i) => i.includes('protected-api'))).toBe(true);
  });

  it('fails when checksum does not match the real file content', () => {
    const { root } = makeTempRepo();
    writeFile(root, 'src/assets/data/thing.json', '{"a":1}');
    const issues = validateRegistry(
      {
        version: 1,
        files: [
          {
            path: 'src/assets/data/thing.json',
            datasetIds: ['demo-dataset'],
            classification: 'public',
            delivery: 'bundled-static',
            checksum: '0'.repeat(64),
          },
        ],
      },
      PUBLIC_DATASET_INFO,
      root,
    );
    expect(issues.some((i) => i.includes('checksum không khớp'))).toBe(true);
  });

  it('fails when the registered file does not exist on disk', () => {
    const { root } = makeTempRepo();
    const issues = validateRegistry(
      {
        version: 1,
        files: [
          {
            path: 'src/assets/data/missing.json',
            datasetIds: ['demo-dataset'],
            classification: 'public',
            delivery: 'bundled-static',
            note: 'x',
          },
        ],
      },
      PUBLIC_DATASET_INFO,
      root,
    );
    expect(issues.some((i) => i.includes('không tồn tại'))).toBe(true);
  });

  it('fails when the registry file itself is missing (__missing marker from loadRegistry)', () => {
    const issues = validateRegistry(
      { __missing: '/nonexistent/config/public-data-files.json' },
      PUBLIC_DATASET_INFO,
    );
    expect(issues.some((i) => i.includes('Không tìm thấy public data file registry'))).toBe(true);
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
        registeredPublicDataFiles: [],
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
    expect(findings.some((finding) => finding.includes('generate:public-manifest'))).toBe(true);
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

  it('blocks a credential-shaped query parameter', async () => {
    const root = makeTempDir();
    const dist = join(root, 'dist');
    writeFile(dist, 'app.js', `fetch("https://example.com/export?api_key=abc123")`);
    const findings = await distScan(dist, makeManifest(root));
    expect(findings.some((finding) => finding.includes('credential-shaped query parameter'))).toBe(
      true,
    );
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

  it('blocks an unregistered data file present in dist/ (.json)', async () => {
    const root = makeTempDir();
    const dist = join(root, 'dist');
    writeFile(dist, 'internal-export.json', '{"a":1}');
    const findings = await distScan(dist, makeManifest(root));
    expect(
      findings.some(
        (f) => f.includes('internal-export.json') && f.includes('KHÔNG có trong registry'),
      ),
    ).toBe(true);
  });

  it('blocks unregistered .geojson/.csv/.pmtiles files present in dist/', async () => {
    const root = makeTempDir();
    const dist = join(root, 'dist');
    writeFile(dist, 'maps/secret.geojson', '{}');
    writeFile(dist, 'data/unregistered.csv', 'a,b\n');
    writeFile(dist, 'tiles/private.pmtiles', 'bin');
    const findings = await distScan(dist, makeManifest(root));
    expect(findings.some((f) => f.includes('secret.geojson'))).toBe(true);
    expect(findings.some((f) => f.includes('unregistered.csv'))).toBe(true);
    expect(findings.some((f) => f.includes('private.pmtiles'))).toBe(true);
  });

  it('does not flag build-info.json, the Vite-plugin-generated build metadata file', async () => {
    const root = makeTempDir();
    const dist = join(root, 'dist');
    writeFile(dist, 'build-info.json', '{"applicationVersion":"1.0.0"}');
    const findings = await distScan(dist, makeManifest(root));
    expect(findings.some((f) => f.includes('build-info.json'))).toBe(false);
  });

  it('passes a registered public-static-asset data file that appears at its expected dist path', async () => {
    const root = makeTempDir();
    const dist = join(root, 'dist');
    writeFile(dist, 'data/roads.json.gz', 'gzip-ish');
    const findings = await distScan(
      dist,
      makeManifest(root, {
        registeredPublicDataFiles: [
          {
            path: 'public/data/roads.json.gz',
            datasetIds: ['public-one'],
            classification: 'public',
            delivery: 'public-static-asset',
          },
        ],
      }),
    );
    expect(findings).toEqual([]);
  });

  it('fails when a registered public-static-asset file is missing from dist/ after build', async () => {
    const root = makeTempDir();
    const dist = join(root, 'dist');
    writeFile(dist, 'app.js', 'console.log(1)');
    const findings = await distScan(
      dist,
      makeManifest(root, {
        registeredPublicDataFiles: [
          {
            path: 'public/data/roads.json.gz',
            datasetIds: ['public-one'],
            classification: 'public',
            delivery: 'public-static-asset',
          },
        ],
      }),
    );
    expect(findings.some((f) => f.includes('KHÔNG xuất hiện trong dist/'))).toBe(true);
  });
});
