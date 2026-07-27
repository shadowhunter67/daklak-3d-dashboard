// Canonical project-portfolio data contract validation — Phase 3
// (docs/project-data-import/, ADR 0006). Deterministic, offline, Node-only tooling — Ajv/JSON
// Schema NEVER ships in the browser production bundle (see
// src/data/generatedJsonProjectPortfolioSource.ts "Option A" — build-time validated bundle).
//
// What this script does (all Layer 1 — transport/structural only, see
// data-templates/examples/README.md for the three-layer split):
//   1. Compiles every schema under data-templates/schemas/ (definitions + top-level bundle),
//      proving $ref resolution and catching any schema that fails to compile.
//   2. Validates data-templates/examples/minimal-valid/ and representative-valid/ — must PASS.
//   3. Validates the REAL fixture consumed by GeneratedJsonProjectPortfolioSource
//      (src/assets/data/project-portfolio.generated-fixture-demo.json) — must PASS, proving the
//      actual runtime fixture is schema-valid, not just the standalone examples.
//   4. Validates every file under data-templates/examples/invalid/ against an explicit expectation
//      table (some are expected to FAIL Layer 1; three are expected to PASS Layer 1 on purpose,
//      because their defect only exists at Layer 3 cross-record level — see
//      data-templates/examples/README.md for why).
//
// Exit code 0 only if every expectation above holds. Any mismatch prints a readable diagnostic and
// exits non-zero — this script is meant to run in CI (npm run quality) and fail loudly on drift.
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const schemasDir = join(repoRoot, 'data-templates', 'schemas');
const definitionsDir = join(schemasDir, 'definitions');
const examplesDir = join(repoRoot, 'data-templates', 'examples');
const realFixturePath = join(
  repoRoot,
  'src',
  'assets',
  'data',
  'project-portfolio.generated-fixture-demo.json',
);

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);

const failures = [];
const passes = [];

function record(ok, label, detail) {
  if (ok) passes.push(label);
  else failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
}

// --- 1. Compile every schema -------------------------------------------------------------------
const definitionFileNames = readdirSync(definitionsDir).filter((f) => f.endsWith('.schema.json'));
for (const fileName of definitionFileNames) {
  const doc = readJson(join(definitionsDir, fileName));
  try {
    ajv.addSchema(doc);
    record(true, `compile definitions/${fileName}`);
  } catch (error) {
    record(false, `compile definitions/${fileName}`, error.message);
  }
}

const bundleSchemaDoc = readJson(join(schemasDir, 'project-portfolio-bundle.schema.json'));
let validateBundle;
try {
  validateBundle = ajv.compile(bundleSchemaDoc);
  record(true, 'compile project-portfolio-bundle.schema.json (proves cross-file $ref resolution)');
} catch (error) {
  record(false, 'compile project-portfolio-bundle.schema.json', error.message);
}

// --- 2 & 3. Valid examples + the real runtime fixture must PASS -------------------------------
if (validateBundle) {
  const mustPass = [
    join(examplesDir, 'minimal-valid', 'project-portfolio-bundle.json'),
    join(examplesDir, 'representative-valid', 'project-portfolio-bundle.json'),
    realFixturePath,
  ];
  for (const path of mustPass) {
    const doc = readJson(path);
    const ok = validateBundle(doc);
    record(
      ok,
      `valid bundle passes schema: ${path.slice(repoRoot.length + 1)}`,
      ok ? undefined : JSON.stringify(validateBundle.errors),
    );
  }
}

// --- 4. Invalid examples — explicit expectation table ------------------------------------------
// 'reject' = must FAIL Layer 1 (JSON Schema). 'pass' = must PASS Layer 1 on purpose (the defect is
// Layer 3 cross-record, which JSON Schema structurally cannot see) — see
// data-templates/examples/README.md for the full explanation of each case.
const INVALID_EXAMPLE_EXPECTATIONS = {
  'unknown-schema-version.json': 'pass', // valid semver shape; unsupported-ness is a runtime concern
  'missing-required-field.json': 'reject',
  'invalid-enum.json': 'reject',
  'invalid-vnd.json': 'reject',
  'invalid-date.json': 'reject',
  'broken-foreign-key.json': 'pass',
  'duplicate-id.json': 'pass',
  'invalid-administrative-code.json': 'pass',
  'invalid-geometry.json': 'reject',
  'empty-required-string.json': 'reject',
  'additional-property.json': 'reject',
};

if (validateBundle) {
  const invalidDir = join(examplesDir, 'invalid');
  const invalidFileNames = readdirSync(invalidDir).filter((f) => f.endsWith('.json'));

  for (const fileName of invalidFileNames) {
    const expectation = INVALID_EXAMPLE_EXPECTATIONS[fileName];
    if (!expectation) {
      record(
        false,
        `invalid/${fileName}`,
        'no expectation registered in INVALID_EXAMPLE_EXPECTATIONS — add one',
      );
      continue;
    }
    const doc = readJson(join(invalidDir, fileName));
    const ok = validateBundle(doc);
    if (expectation === 'reject') {
      record(
        !ok,
        `invalid/${fileName} rejected by Layer 1 (as expected)`,
        ok ? 'Ajv accepted a fixture expected to fail' : undefined,
      );
    } else {
      record(
        ok,
        `invalid/${fileName} passes Layer 1 on purpose (defect is Layer 3)`,
        ok ? undefined : JSON.stringify(validateBundle.errors),
      );
    }
  }

  for (const fileName of Object.keys(INVALID_EXAMPLE_EXPECTATIONS)) {
    if (!invalidFileNames.includes(fileName)) {
      record(
        false,
        `invalid/${fileName}`,
        'expectation registered but file does not exist — remove or add the file',
      );
    }
  }
}

// --- Report --------------------------------------------------------------------------------
console.log(
  `validate_project_data_contract.mjs: ${passes.length} passed, ${failures.length} failed.`,
);
if (failures.length > 0) {
  console.error('\nFailures:');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log('All canonical project-portfolio data contract checks passed.');
