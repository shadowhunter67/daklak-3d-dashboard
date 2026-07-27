/**
 * Layer 1 (JSON Schema) validation cho importer — tái sử dụng NGUYÊN VẸN
 * `data-templates/schemas/` (Phase 3), không viết lại constraint nào. Cùng pattern Ajv với
 * `scripts/validate_project_data_contract.mjs` — Node-only tooling, không import vào browser bundle.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import Ajv, { type AnySchemaObject, type ErrorObject, type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import type { ImportIssue } from './errorCodes';

function readJsonSchema(path: string): AnySchemaObject {
  return JSON.parse(readFileSync(path, 'utf8')) as AnySchemaObject;
}

export function compileCanonicalBundleValidator(repoRoot: string): ValidateFunction {
  const schemasDir = join(repoRoot, 'data-templates', 'schemas');
  const definitionsDir = join(schemasDir, 'definitions');
  const ajv = new Ajv({ strict: false, allErrors: true });
  addFormats(ajv);

  const definitionFileNames = readdirSync(definitionsDir).filter((f) => f.endsWith('.schema.json'));
  for (const fileName of definitionFileNames)
    ajv.addSchema(readJsonSchema(join(definitionsDir, fileName)));

  const bundleSchemaDoc = readJsonSchema(join(schemasDir, 'project-portfolio-bundle.schema.json'));
  return ajv.compile(bundleSchemaDoc);
}

function ajvErrorToIssue(error: ErrorObject): ImportIssue {
  return {
    code: 'schema-invalid',
    severity: 'error',
    layer: 'schema',
    fieldPath: error.instancePath || '(root)',
    message: `${error.instancePath || '(root)'} ${error.message ?? 'schema violation'}`,
    details: JSON.stringify(error.params),
  };
}

export function validateAgainstCanonicalSchema(
  validate: ValidateFunction,
  bundle: unknown,
): ImportIssue[] {
  const valid = validate(bundle);
  if (valid) return [];
  return (validate.errors ?? []).map(ajvErrorToIssue);
}
