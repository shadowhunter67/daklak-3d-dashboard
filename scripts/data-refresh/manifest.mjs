// Refresh manifest — the machine-readable evidence a pipeline run produces (docs/adr/
// 0004-public-data-ingestion.md section 5). Raw evidence itself (HTML/PDF) never lives here or in
// Git; `evidenceReference` only points at where it was stored (a GitHub Actions artifact or
// Release asset — not implemented in this PR, see the ADR "Phạm vi chưa làm").
import { checksumOf } from './checksum.mjs';

/**
 * @param {{
 *   datasetId: string,
 *   effectiveAt: string,
 *   sourcePublishedAt: string,
 *   sourceUrl: string,
 *   publisher: string,
 *   adapterVersion: string,
 *   recordCount: number,
 *   validationResult: 'passed'|'failed',
 *   evidenceReference: string,
 *   records: unknown,
 * }} input
 * @returns {object} the manifest, with `retrievedAt` set to now and `checksum` computed from `records`.
 */
export function buildRefreshManifest(input) {
  const { records, ...rest } = input;
  return {
    ...rest,
    retrievedAt: new Date().toISOString(),
    checksum: checksumOf(records),
  };
}
