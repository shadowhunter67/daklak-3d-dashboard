// Real drift guard between data/source-registry.schema.json (AJV) and the hand-written validator
// in registry.mjs — not just "compile the schema and validate one object" (registry.test.mjs
// already does that single-fixture parity check; this file is the thing docs/adr/
// 0004-public-data-ingestion.md section 10 calls out as previously missing: a positive AND a
// negative fixture for every rule that matters, so the two implementations can't quietly drift
// apart without a test catching it).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { validateRegistryShape, loadRegistry, MATURITIES } from './registry.mjs';

const VALID_ENTRY = {
  datasetId: 'drift-guard-dataset',
  recordKind: 'investment-opportunity',
  publisher: 'Test Publisher',
  authority: 'illustrative',
  sourceUrls: ['https://example.invalid/test'],
  acquisitionType: 'recorded-fixture',
  adapter: 'recorded-fixture',
  schedule: 'weekly',
  schemaVersion: '1.0.0',
  classification: 'public',
  redistributionPolicy: 'allowed-with-attribution',
  attribution: 'Test attribution',
  owner: 'shadowhunter67',
  staleAfterDays: 90,
  reviewPolicy: 'auto-merge-if-low-risk',
  failurePolicy: 'keep-last-known-good',
  expectedContentType: 'application/json',
  maxResponseBytes: 2000000,
  maturity: 'experimental',
  compliance: {
    robotsCheckedAt: '2026-07-24T00:00:00.000Z',
    termsCheckedAt: '2026-07-24T00:00:00.000Z',
    redistributionPolicy: 'allowed-with-attribution',
    attributionRequired: true,
    personalDataExpected: false,
    automatedAccessApproved: true,
  },
};

const REQUIRED_ENTRY_FIELDS = Object.keys(VALID_ENTRY).filter((field) => field !== 'compliance');
const REQUIRED_COMPLIANCE_FIELDS = Object.keys(VALID_ENTRY.compliance);

const ENUM_FIELDS = {
  authority: ['official', 'authoritative-third-party', 'open-community', 'illustrative', 'unknown'],
  classification: ['public', 'internal', 'confidential', 'restricted'],
  redistributionPolicy: ['allowed', 'allowed-with-attribution', 'not-allowed', 'unknown'],
  maturity: [...MATURITIES],
};

async function loadAjvValidator() {
  const { default: Ajv } = await import('ajv');
  const ajv = new Ajv({ allErrors: true });
  const schema = JSON.parse(readFileSync('data/source-registry.schema.json', 'utf8'));
  return ajv.compile(schema);
}

/** Both validators must agree — that agreement (not either one alone) is the drift guard. */
function assertBothAccept(ajvValidate, entry, label) {
  const registry = { sources: [entry] };
  const shape = validateRegistryShape(registry);
  const ajvOk = ajvValidate(registry);
  expect(shape.valid, `hand-written validator rejected ${label}: ${shape.issues.join('; ')}`).toBe(
    true,
  );
  expect(ajvOk, `AJV rejected ${label}: ${JSON.stringify(ajvValidate.errors)}`).toBe(true);
}

function assertBothReject(ajvValidate, entry, label) {
  const registry = { sources: [entry] };
  const shape = validateRegistryShape(registry);
  const ajvOk = ajvValidate(registry);
  expect(shape.valid, `hand-written validator accepted invalid fixture: ${label}`).toBe(false);
  expect(ajvOk, `AJV accepted invalid fixture: ${label}`).toBe(false);
}

describe('schema drift guard: data/source-registry.schema.json vs registry.mjs', () => {
  it('both validators accept the real repository registry file', async () => {
    const ajvValidate = await loadAjvValidator();
    const { registry, valid, issues } = loadRegistry('data/source-registry.yml');
    expect(valid, issues.join('; ')).toBe(true);
    expect(ajvValidate(registry), JSON.stringify(ajvValidate.errors)).toBe(true);
  });

  it('both validators accept a minimal well-formed entry (positive baseline)', async () => {
    const ajvValidate = await loadAjvValidator();
    assertBothAccept(ajvValidate, VALID_ENTRY, 'the baseline valid entry');
  });

  describe.each(REQUIRED_ENTRY_FIELDS)('required top-level field "%s"', (field) => {
    it(`both validators reject an entry missing "${field}" (negative) and accept it present (positive)`, async () => {
      const ajvValidate = await loadAjvValidator();
      assertBothAccept(ajvValidate, VALID_ENTRY, `entry with "${field}" present`);
      const { [field]: _removed, ...withoutField } = VALID_ENTRY;
      assertBothReject(ajvValidate, withoutField, `entry missing "${field}"`);
    });
  });

  describe.each(REQUIRED_COMPLIANCE_FIELDS)('required compliance field "%s"', (field) => {
    it(`both validators reject a compliance block missing "${field}" (negative) and accept it present (positive)`, async () => {
      const ajvValidate = await loadAjvValidator();
      assertBothAccept(ajvValidate, VALID_ENTRY, `compliance with "${field}" present`);
      const { [field]: _removed, ...complianceWithoutField } = VALID_ENTRY.compliance;
      assertBothReject(
        ajvValidate,
        { ...VALID_ENTRY, compliance: complianceWithoutField },
        `compliance missing "${field}"`,
      );
    });
  });

  describe.each(Object.entries(ENUM_FIELDS))('enum field "%s"', (field, allowedValues) => {
    it(`both validators accept every declared value of "${field}" (positive)`, async () => {
      const ajvValidate = await loadAjvValidator();
      for (const value of allowedValues) {
        assertBothAccept(ajvValidate, { ...VALID_ENTRY, [field]: value }, `"${field}"="${value}"`);
      }
    });

    it(`both validators reject an unrecognized value of "${field}" (negative)`, async () => {
      const ajvValidate = await loadAjvValidator();
      assertBothReject(
        ajvValidate,
        { ...VALID_ENTRY, [field]: 'not-a-real-value' },
        `"${field}"="not-a-real-value"`,
      );
    });
  });

  it('both validators reject an empty sourceUrls array', async () => {
    const ajvValidate = await loadAjvValidator();
    assertBothReject(ajvValidate, { ...VALID_ENTRY, sourceUrls: [] }, 'empty sourceUrls');
  });

  it('both validators reject an unexpected extra top-level field (additionalProperties: false)', async () => {
    const ajvValidate = await loadAjvValidator();
    assertBothReject(
      ajvValidate,
      { ...VALID_ENTRY, notARealField: 'x' },
      'entry with an unexpected extra field',
    );
  });
});
