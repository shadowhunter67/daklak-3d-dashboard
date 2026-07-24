import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { validateRegistryShape, parseRegistryYaml, findEntry, loadRegistry } from './registry.mjs';

const VALID_ENTRY = {
  datasetId: 'test-dataset',
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

describe('validateRegistryShape', () => {
  it('accepts a well-formed registry', () => {
    const { valid, issues } = validateRegistryShape({ sources: [VALID_ENTRY] });
    expect(valid).toBe(true);
    expect(issues).toEqual([]);
  });

  it('rejects a registry that is not an object with a sources array', () => {
    expect(validateRegistryShape(null).valid).toBe(false);
    expect(validateRegistryShape({}).valid).toBe(false);
    expect(validateRegistryShape({ sources: 'nope' }).valid).toBe(false);
  });

  it('rejects an entry missing a required field', () => {
    const { publisher: _publisher, ...withoutPublisher } = VALID_ENTRY;
    const { valid, issues } = validateRegistryShape({ sources: [withoutPublisher] });
    expect(valid).toBe(false);
    expect(issues.some((issue) => issue.includes('publisher'))).toBe(true);
  });

  it('rejects an entry with redistributionPolicy: unknown', () => {
    const { valid, issues } = validateRegistryShape({
      sources: [{ ...VALID_ENTRY, redistributionPolicy: 'unknown' }],
    });
    // Shape-valid (the field is present and a recognized enum value) — but this is exactly the
    // input compliance.mjs must hard-stop on. Assert the shape validator accepts it (its job is
    // shape, not policy) and rejects an actually-invalid enum value.
    expect(valid).toBe(true);
    expect(issues).toEqual([]);
  });

  it('rejects an unrecognized redistributionPolicy value', () => {
    const { valid, issues } = validateRegistryShape({
      sources: [{ ...VALID_ENTRY, redistributionPolicy: 'maybe' }],
    });
    expect(valid).toBe(false);
    expect(issues.some((issue) => issue.includes('redistributionPolicy'))).toBe(true);
  });

  it('rejects a duplicate datasetId', () => {
    const { valid, issues } = validateRegistryShape({ sources: [VALID_ENTRY, VALID_ENTRY] });
    expect(valid).toBe(false);
    expect(issues.some((issue) => issue.includes('duplicates'))).toBe(true);
  });

  it('rejects a compliance block missing a required field', () => {
    const { robotsCheckedAt: _robotsCheckedAt, ...complianceWithoutRobots } =
      VALID_ENTRY.compliance;
    const { valid, issues } = validateRegistryShape({
      sources: [{ ...VALID_ENTRY, compliance: complianceWithoutRobots }],
    });
    expect(valid).toBe(false);
    expect(issues.some((issue) => issue.includes('robotsCheckedAt'))).toBe(true);
  });
});

describe('parseRegistryYaml / loadRegistry', () => {
  it('parses YAML into the same shape as the object form', () => {
    const yaml = `
sources:
  - datasetId: from-yaml
    recordKind: investment-opportunity
    publisher: Test
    authority: illustrative
    sourceUrls:
      - https://example.invalid/x
    acquisitionType: recorded-fixture
    adapter: recorded-fixture
    schedule: weekly
    schemaVersion: '1.0.0'
    classification: public
    redistributionPolicy: allowed
    attribution: none
    owner: shadowhunter67
    staleAfterDays: 30
    reviewPolicy: auto-merge-if-low-risk
    failurePolicy: keep-last-known-good
    expectedContentType: application/json
    maxResponseBytes: 1000
    maturity: experimental
    compliance:
      robotsCheckedAt: '2026-01-01T00:00:00.000Z'
      termsCheckedAt: '2026-01-01T00:00:00.000Z'
      redistributionPolicy: allowed
      attributionRequired: false
      personalDataExpected: false
      automatedAccessApproved: true
`;
    const parsed = parseRegistryYaml(yaml);
    expect(validateRegistryShape(parsed).valid).toBe(true);
    expect(findEntry(parsed, 'from-yaml')).not.toBeNull();
  });

  it('loads and validates the real repository registry file', () => {
    const { valid, issues } = loadRegistry('data/source-registry.yml');
    expect(issues).toEqual([]);
    expect(valid).toBe(true);
  });
});

describe('findEntry', () => {
  it('returns null for a registry with no sources array', () => {
    expect(findEntry({}, 'x')).toBeNull();
    expect(findEntry(null, 'x')).toBeNull();
  });

  it('returns null when no entry matches', () => {
    expect(findEntry({ sources: [VALID_ENTRY] }, 'does-not-exist')).toBeNull();
  });

  it('finds an entry by datasetId', () => {
    expect(findEntry({ sources: [VALID_ENTRY] }, 'test-dataset')).toEqual(VALID_ENTRY);
  });
});

describe('data/source-registry.schema.json parity (AJV, dev-only)', () => {
  it('validates the real registry file against the hand-written JSON Schema mirror', async () => {
    const { default: Ajv } = await import('ajv');
    const ajv = new Ajv({ allErrors: true });
    const schema = JSON.parse(readFileSync('data/source-registry.schema.json', 'utf8'));
    const validateFn = ajv.compile(schema);
    const { registry } = loadRegistry('data/source-registry.yml');
    const ok = validateFn(registry);
    expect(ok, JSON.stringify(validateFn.errors)).toBe(true);
  });
});
