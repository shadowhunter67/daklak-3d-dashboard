import { describe, expect, it } from 'vitest';
import { dataQualityRuleLabelKey } from './dataQualityMessages';

describe('dataQualityRuleLabelKey', () => {
  it('maps every known DataQualityIssue rule to a human-facing message key', () => {
    const knownRules = [
      'duplicate-primary-key',
      'unmapped-administrative-code',
      'unknown-managing-authority',
      'unknown-investor',
      'unknown-contractor',
      'unknown-evidence',
      'dangling-project-reference',
      'dangling-work-package-reference',
      'stale-data',
      'multiple-verification-stage-records',
    ];
    for (const rule of knownRules) {
      const key = dataQualityRuleLabelKey(rule);
      expect(key.startsWith('dataQuality.rule.')).toBe(true);
      expect(key).not.toBe('dataQuality.rule.generic');
    }
  });

  it('falls back to a generic key for an unrecognized rule — never leaks the raw slug', () => {
    expect(dataQualityRuleLabelKey('some-future-rule-nobody-mapped-yet')).toBe(
      'dataQuality.rule.generic',
    );
  });
});
