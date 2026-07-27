import { describe, expect, it } from 'vitest';
import { computeDiff, detectSchemaChange, assessRisk } from './diffRisk.mjs';

const BASE_RISK_INPUT = {
  privacyFindingCount: 0,
  complianceAllowed: true,
  responseComplianceAllowed: true,
  sourceIsOfficialMachineReadable: true,
  parserChanged: false,
  validationErrorCount: 0,
};

describe('computeDiff', () => {
  it('classifies an added, removed, unchanged, and changed record correctly', () => {
    const previous = [
      { id: '1', name: 'a' },
      { id: '2', name: 'b' },
      { id: '3', name: 'c' },
    ];
    const next = [
      { id: '1', name: 'a' }, // unchanged
      { id: '2', name: 'b2' }, // changed
      { id: '4', name: 'd' }, // added
      // id: '3' removed
    ];
    const diff = computeDiff(previous, next);
    expect(diff.added).toEqual([{ id: '4', name: 'd' }]);
    expect(diff.removed).toEqual([{ id: '3', name: 'c' }]);
    expect(diff.changed).toEqual([
      { id: '2', before: { id: '2', name: 'b' }, after: { id: '2', name: 'b2' } },
    ]);
    expect(diff.unchangedCount).toBe(1);
  });

  it('reports an empty diff for identical snapshots', () => {
    const records = [{ id: '1', name: 'a' }];
    const diff = computeDiff(records, records);
    expect(diff).toEqual({ added: [], removed: [], changed: [], unchangedCount: 1 });
  });

  it('treats an empty previous snapshot as everything added (first run)', () => {
    const diff = computeDiff([], [{ id: '1', name: 'a' }]);
    expect(diff.added).toHaveLength(1);
    expect(diff.removed).toEqual([]);
  });
});

describe('detectSchemaChange', () => {
  it('detects no change when record shape is identical', () => {
    const records = [{ id: '1', name: 'a' }];
    expect(detectSchemaChange(records, records)).toEqual({
      changed: false,
      addedFields: [],
      removedFields: [],
    });
  });

  it('detects an added field', () => {
    const result = detectSchemaChange([{ id: '1' }], [{ id: '1', newField: 'x' }]);
    expect(result.changed).toBe(true);
    expect(result.addedFields).toContain('newField');
  });

  it('detects a removed field', () => {
    const result = detectSchemaChange([{ id: '1', oldField: 'x' }], [{ id: '1' }]);
    expect(result.changed).toBe(true);
    expect(result.removedFields).toContain('oldField');
  });
});

describe('assessRisk', () => {
  const cleanDiff = { added: [], removed: [], changed: [], unchangedCount: 5 };
  const noSchemaChange = { changed: false, addedFields: [], removedFields: [] };

  it('is low-risk when everything is clean', () => {
    const result = assessRisk({
      ...BASE_RISK_INPUT,
      diff: cleanDiff,
      schemaChange: noSchemaChange,
    });
    expect(result).toEqual({ level: 'low-risk', reasons: [] });
  });

  it('hard-stops on a compliance failure', () => {
    const result = assessRisk({
      ...BASE_RISK_INPUT,
      complianceAllowed: false,
      diff: cleanDiff,
      schemaChange: noSchemaChange,
    });
    expect(result.level).toBe('hard-stop');
  });

  it('hard-stops on any deletion', () => {
    const result = assessRisk({
      ...BASE_RISK_INPUT,
      diff: { ...cleanDiff, removed: [{ id: '1' }] },
      schemaChange: noSchemaChange,
    });
    expect(result.level).toBe('hard-stop');
    expect(result.reasons.some((r) => r.includes('deleted'))).toBe(true);
  });

  it('hard-stops on a schema change', () => {
    const result = assessRisk({
      ...BASE_RISK_INPUT,
      diff: cleanDiff,
      schemaChange: { changed: true, addedFields: ['x'], removedFields: [] },
    });
    expect(result.level).toBe('hard-stop');
  });

  it('hard-stops when a privacy finding is present', () => {
    const result = assessRisk({
      ...BASE_RISK_INPUT,
      privacyFindingCount: 1,
      diff: cleanDiff,
      schemaChange: noSchemaChange,
    });
    expect(result.level).toBe('hard-stop');
  });

  it('hard-stops on a parser change combined with a real data change', () => {
    const result = assessRisk({
      ...BASE_RISK_INPUT,
      parserChanged: true,
      diff: { ...cleanDiff, added: [{ id: 'x' }] },
      schemaChange: noSchemaChange,
    });
    expect(result.level).toBe('hard-stop');
  });

  it('does not hard-stop on a parser change alone, with no data change', () => {
    const result = assessRisk({
      ...BASE_RISK_INPUT,
      parserChanged: true,
      diff: cleanDiff,
      schemaChange: noSchemaChange,
    });
    expect(result.level).toBe('low-risk');
  });

  it('hard-stops when the source is not confirmed official/illustrative', () => {
    const result = assessRisk({
      ...BASE_RISK_INPUT,
      sourceIsOfficialMachineReadable: false,
      diff: cleanDiff,
      schemaChange: noSchemaChange,
    });
    expect(result.level).toBe('hard-stop');
  });

  it('accumulates multiple reasons rather than stopping at the first', () => {
    const result = assessRisk({
      ...BASE_RISK_INPUT,
      complianceAllowed: false,
      privacyFindingCount: 2,
      diff: { ...cleanDiff, removed: [{ id: '1' }] },
      schemaChange: noSchemaChange,
    });
    expect(result.reasons.length).toBeGreaterThanOrEqual(3);
  });
});
