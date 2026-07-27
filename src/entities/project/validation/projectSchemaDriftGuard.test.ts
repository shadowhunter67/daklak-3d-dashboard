/// <reference types="node" />
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import type { ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { describe, expect, it } from 'vitest';
import {
  PROJECT_DOMAIN_SHAPE_REGISTRY,
  validateProjectPortfolioBundleShape,
} from './projectSchemaDriftGuard';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../');
const schemasDir = join(repoRoot, 'data-templates', 'schemas');
const definitionsDir = join(schemasDir, 'definitions');
const fixturesDir = join(repoRoot, 'data-templates', 'fixtures', 'project-domain', 'valid');

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function cloneDeep<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);

const definitionFileNames = readdirSync(definitionsDir).filter((f) => f.endsWith('.schema.json'));
const definitionIdByFileName = new Map<string, string>();
// Mỗi definitions/*.schema.json được add đúng MỘT LẦN ở module scope — test "compiles every entity
// schema" bên dưới lấy validator đã compile qua `ajv.getSchema($id)`, KHÔNG gọi `ajv.compile()` lần
// nữa trên cùng document (Ajv coi $id trùng là lỗi "schema already exists").
for (const fileName of definitionFileNames) {
  const doc = readJson(join(definitionsDir, fileName)) as { $id: string };
  ajv.addSchema(doc);
  definitionIdByFileName.set(fileName, doc.$id);
}

const bundleSchemaDoc = readJson(join(schemasDir, 'project-portfolio-bundle.schema.json')) as {
  $id: string;
};
ajv.addSchema(bundleSchemaDoc);

const entries = Object.entries(PROJECT_DOMAIN_SHAPE_REGISTRY);
const ajvValidators = new Map<string, ValidateFunction>();

describe('project domain JSON Schema discovery, $ref resolution and compilation', () => {
  it('discovers every schema file referenced by the shape registry (no orphan/missing schema)', () => {
    // common.schema.json là definitions dùng chung (vndAmount/isoDate/geometry/...), không phải một
    // entity riêng — cố ý không có entry trong registry, loại trừ khỏi orphan check.
    const SHARED_DEFINITION_FILES = new Set(['common.schema.json']);
    const registrySchemaFiles = new Set<string>(entries.map(([, entry]) => entry.schemaFile));
    for (const fileName of definitionFileNames) {
      if (SHARED_DEFINITION_FILES.has(fileName)) continue;
      expect(
        registrySchemaFiles.has(fileName),
        `orphan schema file not in registry: ${fileName}`,
      ).toBe(true);
    }
    for (const fileName of registrySchemaFiles) {
      expect(
        (definitionFileNames as string[]).includes(fileName),
        `registry references a schema file that does not exist: ${fileName}`,
      ).toBe(true);
    }
  });

  it('every entity schema resolved and compiled without error (proves $ref resolution across files, e.g. into common.schema.json)', () => {
    for (const [name, entry] of entries) {
      const id = definitionIdByFileName.get(entry.schemaFile);
      expect(id, `no registered schema for '${name}' (${entry.schemaFile})`).toBeDefined();
      const validateFn = ajv.getSchema(id!);
      expect(validateFn, `Ajv could not resolve/compile schema for '${name}'`).toBeTypeOf(
        'function',
      );
      ajvValidators.set(name, validateFn!);
    }
    expect(ajvValidators.size).toBe(entries.length);
  });

  it('the top-level bundle schema resolved and compiled without error (proves $ref resolution into definitions/*.schema.json)', () => {
    const validateFn = ajv.getSchema(bundleSchemaDoc.$id);
    expect(validateFn, 'Ajv could not resolve/compile the bundle schema').toBeTypeOf('function');
  });
});

describe('project domain schema drift guard: TS shape mirror agrees with Ajv-compiled JSON Schema', () => {
  for (const [name, entry] of entries) {
    describe(name, () => {
      const fixture = readJson(join(fixturesDir, entry.fixtureFile));

      it('valid fixture passes both TS shape validator and Ajv', () => {
        const validateAjv = ajvValidators.get(name)!;
        expect(entry.validate(fixture), 'TS validator issues').toEqual([]);
        expect(validateAjv(cloneDeep(fixture)), JSON.stringify(validateAjv.errors)).toBe(true);
      });

      for (const field of entry.spec.requiredFields) {
        it(`required-field mutation: removing '${field}' is rejected by both validators`, () => {
          const mutated = cloneDeep(fixture) as Record<string, unknown>;
          delete mutated[field];
          const validateAjv = ajvValidators.get(name)!;
          const tsIssues = entry.validate(mutated);
          const ajvValid = validateAjv(mutated);
          expect(tsIssues.length, `TS validator did not flag missing '${field}'`).toBeGreaterThan(
            0,
          );
          expect(ajvValid, `Ajv did not reject missing '${field}'`).toBe(false);
        });
      }

      for (const [field, allowedValues] of Object.entries(entry.spec.enumFields ?? {})) {
        it(`enum mutation: invalid value for '${field}' is rejected by both validators`, () => {
          const mutated = cloneDeep(fixture) as Record<string, unknown>;
          mutated[field] = '__not-a-real-enum-value__';
          const validateAjv = ajvValidators.get(name)!;
          const tsIssues = entry.validate(mutated);
          const ajvValid = validateAjv(mutated);
          expect(tsIssues.length, `TS validator did not flag invalid '${field}'`).toBeGreaterThan(
            0,
          );
          expect(ajvValid, `Ajv did not reject invalid '${field}'`).toBe(false);
          // Sanity: the mutated value really isn't one of the allowed ones (guards against a typo
          // in the sentinel string accidentally colliding with a real enum member).
          expect(allowedValues).not.toContain('__not-a-real-enum-value__');
        });
      }

      it('rejects an unexpected additional property (Ajv additionalProperties: false)', () => {
        const mutated = cloneDeep(fixture) as Record<string, unknown>;
        mutated.__unexpectedField = 'nope';
        const validateAjv = ajvValidators.get(name)!;
        expect(validateAjv(mutated), 'Ajv did not reject an unexpected additional property').toBe(
          false,
        );
      });
    });
  }
});

describe('canonical bundle: TS shape mirror agrees with Ajv on the top-level bundle', () => {
  const bundleFixture = readJson(join(fixturesDir, 'project-portfolio-bundle.json'));
  const validateBundleAjv = ajv.getSchema(bundleSchemaDoc.$id)!;

  it('valid bundle fixture passes both validators', () => {
    expect(validateProjectPortfolioBundleShape(bundleFixture)).toEqual([]);
    expect(
      validateBundleAjv(cloneDeep(bundleFixture)),
      JSON.stringify(validateBundleAjv.errors),
    ).toBe(true);
  });

  it('rejects a bundle missing the top-level "datasets" key', () => {
    const mutated = cloneDeep(bundleFixture) as Record<string, unknown>;
    delete mutated.datasets;
    expect(validateProjectPortfolioBundleShape(mutated).length).toBeGreaterThan(0);
    expect(validateBundleAjv(mutated)).toBe(false);
  });

  it('rejects a bundle with an invalid metadata.classification enum value', () => {
    const mutated = cloneDeep(bundleFixture) as {
      metadata: Record<string, unknown>;
    };
    mutated.metadata.classification = 'top-secret';
    expect(validateProjectPortfolioBundleShape(mutated).length).toBeGreaterThan(0);
    expect(validateBundleAjv(mutated)).toBe(false);
  });

  it('accepts a schemaVersion-shaped string at the schema layer regardless of whether it is a SUPPORTED version — that allowlist check is a separate runtime concern (see canonicalBundle.test.ts / isSupportedCanonicalSchemaVersion), not a JSON Schema structural rule', () => {
    const mutated = cloneDeep(bundleFixture) as Record<string, unknown>;
    mutated.schemaVersion = '9.9.9';
    expect(validateBundleAjv(mutated)).toBe(true);
  });

  it('rejects a schemaVersion that is not even semver-shaped (Layer 1 structural check)', () => {
    const mutated = cloneDeep(bundleFixture) as Record<string, unknown>;
    mutated.schemaVersion = 'not-a-version';
    expect(validateBundleAjv(mutated)).toBe(false);
  });
});
