/// <reference types="node" />
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { describe, expect, it } from 'vitest';
import {
  validateAssetFeatureShape,
  validateDatasetDescriptorShape,
  validateIndicatorObservationShape,
} from './schemaDriftGuard';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../');
const fixturesDir = join(repoRoot, 'data-templates', 'fixtures');
const schemasDir = join(repoRoot, 'data-templates', 'schemas');

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);

const datasetDescriptorSchema = readJson(join(schemasDir, 'dataset-descriptor.schema.json'));
const indicatorSchemaDoc = readJson(join(schemasDir, 'indicator.schema.json')) as {
  definitions: { indicatorObservation: unknown };
};
const assetFeatureSchema = readJson(join(schemasDir, 'asset-feature.schema.json'));

const validateDatasetDescriptorAjv = ajv.compile(datasetDescriptorSchema as object);
const validateIndicatorObservationAjv = ajv.compile(
  indicatorSchemaDoc.definitions.indicatorObservation as object,
);
const validateAssetFeatureAjv = ajv.compile(assetFeatureSchema as object);

/**
 * Which validator pair applies to a fixture, decided by filename prefix — every fixture in
 * data-templates/fixtures/{valid,invalid}/ must match one of these.
 */
function pickValidators(fileName: string) {
  if (fileName.startsWith('dataset-descriptor')) {
    return { ts: validateDatasetDescriptorShape, ajv: validateDatasetDescriptorAjv };
  }
  if (fileName.startsWith('indicator-observation')) {
    return { ts: validateIndicatorObservationShape, ajv: validateIndicatorObservationAjv };
  }
  if (fileName.startsWith('asset-feature')) {
    return { ts: validateAssetFeatureShape, ajv: validateAssetFeatureAjv };
  }
  throw new Error(`No validator mapping for fixture file: ${fileName}`);
}

function listFixtures(kind: 'valid' | 'invalid'): string[] {
  return readdirSync(join(fixturesDir, kind)).filter((name) => name.endsWith('.json'));
}

describe('schema drift guard: TS validators agree with Ajv-compiled JSON Schema', () => {
  it('has at least one valid and one invalid fixture for each of the three shapes', () => {
    const validNames = listFixtures('valid');
    const invalidNames = listFixtures('invalid');
    for (const prefix of ['dataset-descriptor', 'indicator-observation', 'asset-feature']) {
      expect(validNames.some((name) => name.startsWith(prefix))).toBe(true);
      expect(invalidNames.some((name) => name.startsWith(prefix))).toBe(true);
    }
  });

  for (const kind of ['valid', 'invalid'] as const) {
    for (const fileName of listFixtures(kind)) {
      it(`${kind}/${fileName}: TS validator and Ajv agree (both ${kind === 'valid' ? 'accept' : 'reject'})`, () => {
        const fixture = readJson(join(fixturesDir, kind, fileName));
        const { ts, ajv: ajvValidate } = pickValidators(fileName);

        const tsIssues = ts(fixture);
        const tsValid = tsIssues.length === 0;
        const ajvValid = ajvValidate(fixture);

        if (kind === 'valid') {
          expect(tsIssues, `TS validator issues: ${JSON.stringify(tsIssues)}`).toEqual([]);
          expect(ajvValid, `Ajv errors: ${JSON.stringify(ajvValidate.errors)}`).toBe(true);
        } else {
          expect(tsValid, 'expected the TS validator to reject this fixture').toBe(false);
          expect(ajvValid, 'expected Ajv to reject this fixture').toBe(false);
        }

        // The actual drift guard: both validators must reach the same verdict on every fixture,
        // valid or invalid — a mismatch means the hand-written TS mirror and the JSON Schema have
        // drifted apart from each other (or from src/data-platform/schemas/*.ts).
        expect(tsValid, `TS said ${tsValid}, Ajv said ${ajvValid} for ${kind}/${fileName}`).toBe(
          ajvValid,
        );
      });
    }
  }
});
