// The only adapter this PR ships: reads a committed fixture file, never the network. Real
// adapters (HTTP fetch with robots/terms already confirmed) are future work — see docs/adr/
// 0004-public-data-ingestion.md section 9 "Không thực thi ngoài đời thật trong PR này".
import { readFileSync } from 'node:fs';

/**
 * @param {{ fixturePath: string }} config
 * @returns {{ sourcePublishedAt: string, records: Record<string, unknown>[], finalUrl: string,
 *   contentType: string, looksLikeLoginWall: boolean }}
 */
export function fetchRecordedFixture(config) {
  const parsed = JSON.parse(readFileSync(config.fixturePath, 'utf8'));
  return {
    sourcePublishedAt: parsed.sourcePublishedAt,
    records: parsed.records,
    // A recorded fixture has no real network hop — these are reported as trivially compliant so
    // evaluateResponseCompliance still runs the same code path a real HTTP adapter would.
    finalUrl: 'fixture://recorded-source-response',
    contentType: 'application/json',
    looksLikeLoginWall: false,
  };
}
