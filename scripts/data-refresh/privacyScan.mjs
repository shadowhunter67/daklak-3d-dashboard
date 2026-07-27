// Deterministic personal-data scanner — regex-based, not AI (docs/adr/0004-public-data-ingestion.md
// section 6 "Compliance là hard rule"). A finding is a hard stop for publishing, never a soft
// warning. `maskValue` must be used before any finding is written to a log or report — the raw
// matched value itself must never be committed or logged (see run.mjs).

const PATTERNS = [
  { kind: 'email', regex: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi },
  // Vietnamese phone numbers: 10-11 digits, optionally with +84/84 prefix.
  { kind: 'phone', regex: /(?:\+?84|0)(?:\d[\s.-]?){9,10}\b/g },
  // Citizen ID (CCCD/CMND): exactly 9 or 12 digits, word-boundary delimited so it doesn't match
  // inside a longer numeric string (e.g. a budget figure).
  { kind: 'citizen-id', regex: /\b\d{9}\b|\b\d{12}\b/g },
  // Bank-account-like: 8, 10-11, or 13-19 consecutive digits (common range for VN bank account
  // numbers) — deliberately excludes exactly 9 or 12 digits, already classified as citizen-id
  // above, so one finding doesn't get double-counted under two kinds.
  { kind: 'bank-account-like', regex: /\b\d{8}\b|\b\d{10,11}\b|\b\d{13,19}\b/g },
];

/**
 * @param {string} value
 * @returns {string} the value with all but the first/last character replaced by `*`, e.g.
 *   "a***********m" for an email — enough to spot-check a finding without leaking the real value.
 */
export function maskValue(value) {
  if (value.length <= 2) return '*'.repeat(value.length);
  return `${value[0]}${'*'.repeat(value.length - 2)}${value[value.length - 1]}`;
}

/**
 * @param {string} text
 * @returns {{ kind: string, maskedValue: string, count: number }[]} one entry per (kind, masked
 *   value) pair actually found — never the raw value, and never a per-occurrence log that could
 *   balloon a report with repeated real values.
 */
export function scanForPersonalData(text) {
  if (typeof text !== 'string' || text.length === 0) return [];
  const counts = new Map();
  for (const { kind, regex } of PATTERNS) {
    const matches = text.match(regex) ?? [];
    for (const match of matches) {
      const key = `${kind}:${match}`;
      counts.set(key, counts.get(key) ?? { kind, value: match, count: 0 });
      counts.get(key).count += 1;
    }
  }
  return [...counts.values()].map(({ kind, value, count }) => ({
    kind,
    maskedValue: maskValue(value),
    count,
  }));
}

/**
 * Recursively scans every string value in a parsed JSON record.
 * @param {unknown} record
 * @returns {{ kind: string, maskedValue: string, count: number }[]}
 */
export function scanRecordForPersonalData(record) {
  const findings = [];
  const visit = (value) => {
    if (typeof value === 'string') {
      findings.push(...scanForPersonalData(value));
    } else if (Array.isArray(value)) {
      value.forEach(visit);
    } else if (value && typeof value === 'object') {
      Object.values(value).forEach(visit);
    }
  };
  visit(record);
  return findings;
}
