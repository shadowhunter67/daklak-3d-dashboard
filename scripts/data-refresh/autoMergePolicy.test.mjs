import { describe, expect, it } from 'vitest';
import { evaluateAutoMergeEligibility } from './autoMergePolicy.mjs';

const CLEAN_INPUT = {
  maturity: 'auto-merge-eligible',
  riskLevel: 'low-risk',
  schemaChanged: false,
  adapterVersionChanged: false,
  deletionCount: 0,
  identityRemapCount: 0,
  legalStatusChanged: false,
  privacyFindingCount: 0,
  complianceChanged: false,
  redistributionPolicyChanged: false,
  domainRedirectAllowed: true,
  evidenceChecksumConflict: false,
  qualityChecksPassed: true,
};

describe('evaluateAutoMergeEligibility', () => {
  it('is eligible when maturity is auto-merge-eligible, risk is low-risk, and every hard condition passes', () => {
    const result = evaluateAutoMergeEligibility(CLEAN_INPUT);
    expect(result.eligible).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  it('is never eligible for an experimental source, even with a clean low-risk run', () => {
    const result = evaluateAutoMergeEligibility({ ...CLEAN_INPUT, maturity: 'experimental' });
    expect(result.eligible).toBe(false);
    expect(result.reasons.some((r) => r.includes('experimental'))).toBe(true);
  });

  it('is never eligible for a review-required source', () => {
    const result = evaluateAutoMergeEligibility({ ...CLEAN_INPUT, maturity: 'review-required' });
    expect(result.eligible).toBe(false);
  });

  it('is not eligible when risk level is hard-stop, regardless of maturity', () => {
    const result = evaluateAutoMergeEligibility({ ...CLEAN_INPUT, riskLevel: 'hard-stop' });
    expect(result.eligible).toBe(false);
    expect(result.reasons.some((r) => r.includes('hard-stop'))).toBe(true);
  });

  const hardConditionCases = [
    ['schemaChanged', { schemaChanged: true }, 'schema'],
    ['adapterVersionChanged', { adapterVersionChanged: true }, 'adapter version'],
    ['deletionCount', { deletionCount: 1 }, 'deleted'],
    ['identityRemapCount', { identityRemapCount: 1 }, 'identity'],
    ['legalStatusChanged', { legalStatusChanged: true }, 'legal/approval status'],
    ['privacyFindingCount', { privacyFindingCount: 1 }, 'personal-data'],
    ['complianceChanged', { complianceChanged: true }, 'compliance block'],
    ['redistributionPolicyChanged', { redistributionPolicyChanged: true }, 'redistributionPolicy'],
    ['domainRedirectAllowed', { domainRedirectAllowed: false }, 'unexpected domain'],
    ['evidenceChecksumConflict', { evidenceChecksumConflict: true }, 'checksum conflicts'],
    ['qualityChecksPassed', { qualityChecksPassed: false }, 'quality checks did not pass'],
  ];

  it.each(hardConditionCases)(
    'a clean auto-merge-eligible/low-risk run is blocked by %s alone',
    (_name, override, reasonSubstring) => {
      const result = evaluateAutoMergeEligibility({ ...CLEAN_INPUT, ...override });
      expect(result.eligible).toBe(false);
      expect(result.reasons.some((r) => r.includes(reasonSubstring))).toBe(true);
    },
  );
});
