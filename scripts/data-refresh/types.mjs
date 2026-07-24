// Pipeline contracts for the public-data refresh foundation (docs/adr/0004-public-data-ingestion.md).
// Plain Node ESM (no TypeScript) — this runs standalone via `node` in CI, not through the Vite
// build; see the ADR for why. JSDoc typedefs below are for editor/IDE hints only, not enforced.

/**
 * @typedef {'success'|'no-change'|'partial-success'|'source-unavailable'|'source-retracted'|
 *   'structure-changed'|'authorization-changed'|'rate-limited'|'validation-failed'|
 *   'review-required'} PipelineRunStatus
 */
export const PIPELINE_RUN_STATUSES = /** @type {const} */ ([
  'success',
  'no-change',
  'partial-success',
  'source-unavailable',
  'source-retracted',
  'structure-changed',
  'authorization-changed',
  'rate-limited',
  'validation-failed',
  'review-required',
]);

/**
 * Is the *source* reachable/behaving — never mixed with whether the *data* it returned is valid
 * (see DatasetQuality below) or whether something needs a human's attention (see BusinessAlert).
 * @typedef {{ datasetId: string, checkedAt: string, reachable: boolean, lastSuccessAt: string|null,
 *   httpStatus: number|null, note: string }} SourceHealth
 */

/** @param {Omit<SourceHealth, 'checkedAt'>} input @returns {SourceHealth} */
export function buildSourceHealth(input) {
  return { checkedAt: new Date().toISOString(), ...input };
}

/**
 * Is the *data* itself valid — reuses the same shape as `DatasetQuality` in
 * src/data-platform/schemas/dataset.ts (status/knownLimitations) so the two concepts of "dataset
 * quality" in this codebase don't drift into two different meanings for the same term.
 * @typedef {{ status: 'verified'|'partially-verified'|'unverified', knownLimitations: string[],
 *   recordCount: number, validationErrors: string[] }} DatasetQualityResult
 */

/** @param {Omit<DatasetQualityResult, 'knownLimitations'> & {knownLimitations?: string[]}} input
 * @returns {DatasetQualityResult} */
export function buildDatasetQuality(input) {
  return { knownLimitations: [], ...input };
}

/**
 * Something a human should look at — distinct from SourceHealth (source-level) and
 * DatasetQualityResult (data-level). A `BusinessAlert` can be raised even when the source is
 * reachable and the data is schema-valid (e.g. "this dataset is stale" or "structure changed").
 * @typedef {{ id: string, datasetId: string, severity: 'critical'|'warning',
 *   category: string, message: string, raisedAt: string }} BusinessAlert
 */

/** @param {Omit<BusinessAlert, 'raisedAt'>} input @returns {BusinessAlert} */
export function buildBusinessAlert(input) {
  return { raisedAt: new Date().toISOString(), ...input };
}
