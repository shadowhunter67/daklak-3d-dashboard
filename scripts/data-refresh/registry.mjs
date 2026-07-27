// Loads and validates data/source-registry.yml — hand-written validator (mirrors
// data/source-registry.schema.json by hand, see docs/adr/0004-public-data-ingestion.md and the
// existing data-templates/schemas/*.schema.json convention this repo already uses for domain
// fixtures). Compliance rules that cause a hard stop live in compliance.mjs, not here — this file
// only checks *shape*, not *policy*.
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

const REDISTRIBUTION_POLICIES = new Set([
  'allowed',
  'allowed-with-attribution',
  'not-allowed',
  'unknown',
]);
const CLASSIFICATIONS = new Set(['public', 'internal', 'confidential', 'restricted']);
const AUTHORITIES = new Set([
  'official',
  'authoritative-third-party',
  'open-community',
  'illustrative',
  'unknown',
]);

// Kept in sync by hand with SOURCE_MATURITIES in types.mjs — see that file for what each value
// means and why maturity is a registry-declared fact, not something the risk engine infers.
export const MATURITIES = new Set([
  'experimental',
  'review-required',
  'observed',
  'auto-merge-eligible',
]);

const REQUIRED_ENTRY_FIELDS = [
  'datasetId',
  'recordKind',
  'publisher',
  'authority',
  'sourceUrls',
  'acquisitionType',
  'adapter',
  'schedule',
  'schemaVersion',
  'classification',
  'redistributionPolicy',
  'attribution',
  'owner',
  'staleAfterDays',
  'reviewPolicy',
  'failurePolicy',
  'expectedContentType',
  'maxResponseBytes',
  'maturity',
  'compliance',
];

const REQUIRED_COMPLIANCE_FIELDS = [
  'robotsCheckedAt',
  'termsCheckedAt',
  'redistributionPolicy',
  'attributionRequired',
  'personalDataExpected',
  'automatedAccessApproved',
];

/**
 * @param {unknown} registry Parsed YAML content (see parseRegistryYaml).
 * @returns {{ valid: boolean, issues: string[] }}
 */
export function validateRegistryShape(registry) {
  const issues = [];
  if (typeof registry !== 'object' || registry === null || !Array.isArray(registry.sources)) {
    return { valid: false, issues: ['registry must be an object with a "sources" array'] };
  }
  const seenIds = new Set();
  for (const [index, entry] of registry.sources.entries()) {
    const label = `sources[${index}]`;
    if (typeof entry !== 'object' || entry === null) {
      issues.push(`${label} must be an object`);
      continue;
    }
    for (const field of REQUIRED_ENTRY_FIELDS) {
      if (entry[field] === undefined || entry[field] === null || entry[field] === '') {
        issues.push(`${label} is missing required field "${field}"`);
      }
    }
    if (typeof entry.datasetId === 'string') {
      if (seenIds.has(entry.datasetId))
        issues.push(`${label} duplicates datasetId "${entry.datasetId}"`);
      seenIds.add(entry.datasetId);
    }
    if (entry.authority !== undefined && !AUTHORITIES.has(entry.authority)) {
      issues.push(`${label}.authority "${entry.authority}" is not a recognized authority`);
    }
    if (entry.classification !== undefined && !CLASSIFICATIONS.has(entry.classification)) {
      issues.push(
        `${label}.classification "${entry.classification}" is not a recognized classification`,
      );
    }
    if (
      entry.redistributionPolicy !== undefined &&
      !REDISTRIBUTION_POLICIES.has(entry.redistributionPolicy)
    ) {
      issues.push(
        `${label}.redistributionPolicy "${entry.redistributionPolicy}" is not recognized`,
      );
    }
    if (Array.isArray(entry.sourceUrls) && entry.sourceUrls.length === 0) {
      issues.push(`${label}.sourceUrls must not be empty`);
    }
    if (entry.maturity !== undefined && !MATURITIES.has(entry.maturity)) {
      issues.push(`${label}.maturity "${entry.maturity}" is not a recognized source maturity`);
    }
    if (entry.compliance !== undefined) {
      if (typeof entry.compliance !== 'object' || entry.compliance === null) {
        issues.push(`${label}.compliance must be an object`);
      } else {
        for (const field of REQUIRED_COMPLIANCE_FIELDS) {
          if (
            entry.compliance[field] === undefined ||
            entry.compliance[field] === null ||
            entry.compliance[field] === ''
          ) {
            issues.push(`${label}.compliance is missing required field "${field}"`);
          }
        }
        if (
          entry.compliance.redistributionPolicy !== undefined &&
          !REDISTRIBUTION_POLICIES.has(entry.compliance.redistributionPolicy)
        ) {
          issues.push(
            `${label}.compliance.redistributionPolicy "${entry.compliance.redistributionPolicy}" is not recognized`,
          );
        }
        for (const field of Object.keys(entry.compliance)) {
          if (!REQUIRED_COMPLIANCE_FIELDS.includes(field)) {
            issues.push(`${label}.compliance has an unexpected extra field "${field}"`);
          }
        }
      }
    }
    // Mirrors the schema's additionalProperties: false — an unrecognized field is exactly the
    // kind of drift the schema-vs-hand-written-validator guard exists to catch (see
    // registrySchemaDriftGuard.test.mjs).
    for (const field of Object.keys(entry)) {
      if (!REQUIRED_ENTRY_FIELDS.includes(field)) {
        issues.push(`${label} has an unexpected extra field "${field}"`);
      }
    }
  }
  return { valid: issues.length === 0, issues };
}

/** @param {string} yamlText @returns {unknown} */
export function parseRegistryYaml(yamlText) {
  return parse(yamlText);
}

/** @param {string} filePath @returns {{ registry: unknown, valid: boolean, issues: string[] }} */
export function loadRegistry(filePath) {
  const registry = parseRegistryYaml(readFileSync(filePath, 'utf8'));
  const { valid, issues } = validateRegistryShape(registry);
  return { registry, valid, issues };
}

/** @param {unknown} registry @param {string} datasetId */
export function findEntry(registry, datasetId) {
  if (!registry || !Array.isArray(registry.sources)) return null;
  return registry.sources.find((entry) => entry.datasetId === datasetId) ?? null;
}
