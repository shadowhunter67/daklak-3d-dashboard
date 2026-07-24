import { describe, expect, it } from 'vitest';
import { auditHardcodedStrings } from './check_i18n_hardcoded_strings.mjs';

describe('static i18n audit: no hard-coded visible Vietnamese strings outside src/i18n/messages/**', () => {
  it('finds zero hard-coded visible strings in production TSX/TS (small allowlist excepted)', async () => {
    const findings = await auditHardcodedStrings();
    const summary = findings.map((f) => `${f.file}:${f.line} ${JSON.stringify(f.text)}`);
    expect(findings, `Hard-coded string(s) found:\n${summary.join('\n')}`).toEqual([]);
  });
});
