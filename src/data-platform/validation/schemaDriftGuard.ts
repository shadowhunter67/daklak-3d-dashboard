/**
 * Hand-written TypeScript mirrors of data-templates/schemas/*.schema.json's key constraints —
 * deliberately a SEPARATE implementation, not a shared source of truth, because the whole point
 * (spec §10) is that schemaDriftGuard.test.ts cross-checks this against Ajv-compiled JSON Schema
 * over the same fixtures in data-templates/fixtures/. If the two disagree, one of them drifted
 * from src/data-platform/schemas/*.ts and CI should fail — see data-templates/README.md.
 */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSafeRepositoryPath(path: string): boolean {
  if (path.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(path)) return false;
  return !path.includes('..');
}

const DATASET_DESCRIPTOR_REQUIRED_FIELDS = [
  'id',
  'title',
  'description',
  'domain',
  'classification',
  'authority',
  'publicationStatus',
  'administrativeLevel',
  'temporalResolution',
  'spatialRepresentation',
  'source',
  'version',
  'quality',
  'access',
];

export function validateDatasetDescriptorShape(candidate: unknown): string[] {
  const issues: string[] = [];
  if (!isPlainObject(candidate)) return ['not an object'];
  for (const field of DATASET_DESCRIPTOR_REQUIRED_FIELDS) {
    if (!(field in candidate)) issues.push(`missing required field '${field}'`);
  }
  const source = candidate.source;
  if (isPlainObject(source)) {
    if (typeof source.sourceUrl === 'string' && !source.sourceUrl.startsWith('https://')) {
      issues.push("source.sourceUrl must start with 'https://'");
    }
    if (typeof source.repositoryPath === 'string' && !isSafeRepositoryPath(source.repositoryPath)) {
      issues.push('source.repositoryPath must be relative and must not contain ".."');
    }
  } else if ('source' in candidate) {
    issues.push('source must be an object');
  }
  const access = candidate.access;
  if (isPlainObject(access)) {
    if (access.delivery === 'protected-api' && access.requiresAuthentication !== true) {
      issues.push("access.delivery:'protected-api' must pair with requiresAuthentication:true");
    }
  }
  return issues;
}

const INDICATOR_OBSERVATION_REQUIRED_FIELDS = [
  'indicatorCode',
  'administrativeCode',
  'administrativeLevel',
  'period',
  'value',
  'status',
  'sourceDatasetId',
];

const VALID_ADMINISTRATIVE_LEVELS = new Set(['province', 'commune']);

export function validateIndicatorObservationShape(candidate: unknown): string[] {
  const issues: string[] = [];
  if (!isPlainObject(candidate)) return ['not an object'];
  for (const field of INDICATOR_OBSERVATION_REQUIRED_FIELDS) {
    if (!(field in candidate)) issues.push(`missing required field '${field}'`);
  }
  if (
    'administrativeLevel' in candidate &&
    !VALID_ADMINISTRATIVE_LEVELS.has(candidate.administrativeLevel as string)
  ) {
    issues.push(
      `administrativeLevel must be one of province/commune, got '${String(candidate.administrativeLevel)}'`,
    );
  }
  if (candidate.status === 'missing' && candidate.value !== null) {
    issues.push("status:'missing' must pair with value:null — never 0 as a stand-in");
  }
  return issues;
}

const ASSET_FEATURE_REQUIRED_FIELDS = [
  'assetId',
  'assetType',
  'name',
  'status',
  'classification',
  'sourceDatasetId',
  'updatedAt',
];
const ASSET_FEATURE_ALLOWED_FIELDS = new Set([
  ...ASSET_FEATURE_REQUIRED_FIELDS,
  'administrativeCode',
  'note',
]);

export function validateAssetFeatureShape(candidate: unknown): string[] {
  const issues: string[] = [];
  if (!isPlainObject(candidate)) return ['not an object'];
  for (const field of ASSET_FEATURE_REQUIRED_FIELDS) {
    if (!(field in candidate)) issues.push(`missing required field '${field}'`);
  }
  for (const field of Object.keys(candidate)) {
    if (!ASSET_FEATURE_ALLOWED_FIELDS.has(field)) {
      issues.push(
        `unexpected field '${field}' — asset-feature templates deliberately have no personal-data fields (see data-templates/README.md)`,
      );
    }
  }
  return issues;
}
