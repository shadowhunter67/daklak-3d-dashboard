import { describe, expect, it } from 'vitest';
import {
  buildPublicationDecisionIndex,
  computePublicationDecisionSetChecksum,
  InvalidPublicationDecisionSetError,
  parsePublicationDecisionSet,
  type PublicationDecisionSet,
} from './publicationDecision';

const VALID_ENTRY = {
  entityKind: 'projects',
  recordId: 'project-1',
  decision: 'public',
  reason: 'Approved for public release',
  decidedBy: 'reviewer-a',
  decidedAt: '2026-03-01T00:00:00.000Z',
};

const VALID_SET = {
  policyVersion: '1.0.0',
  generatedAt: '2026-03-01T00:00:00.000Z',
  decisions: [VALID_ENTRY],
};

describe('parsePublicationDecisionSet', () => {
  it('parses a valid decision set', () => {
    const parsed = parsePublicationDecisionSet(VALID_SET);
    expect(parsed.decisions).toHaveLength(1);
    expect(parsed.decisions[0].recordId).toBe('project-1');
  });

  it('rejects a non-object input', () => {
    expect(() => parsePublicationDecisionSet('not an object')).toThrow(
      InvalidPublicationDecisionSetError,
    );
  });

  it('rejects a missing policyVersion', () => {
    expect(() => parsePublicationDecisionSet({ ...VALID_SET, policyVersion: undefined })).toThrow(
      InvalidPublicationDecisionSetError,
    );
  });

  it('rejects a missing generatedAt', () => {
    expect(() => parsePublicationDecisionSet({ ...VALID_SET, generatedAt: undefined })).toThrow(
      InvalidPublicationDecisionSetError,
    );
  });

  it('rejects decisions that is not an array', () => {
    expect(() => parsePublicationDecisionSet({ ...VALID_SET, decisions: {} })).toThrow(
      InvalidPublicationDecisionSetError,
    );
  });

  it('rejects an unknown entityKind', () => {
    expect(() =>
      parsePublicationDecisionSet({
        ...VALID_SET,
        decisions: [{ ...VALID_ENTRY, entityKind: 'not-a-real-entity' }],
      }),
    ).toThrow(InvalidPublicationDecisionSetError);
  });

  it('rejects an empty recordId', () => {
    expect(() =>
      parsePublicationDecisionSet({ ...VALID_SET, decisions: [{ ...VALID_ENTRY, recordId: '' }] }),
    ).toThrow(InvalidPublicationDecisionSetError);
  });

  it("rejects a decision value that is neither 'public' nor 'excluded'", () => {
    expect(() =>
      parsePublicationDecisionSet({
        ...VALID_SET,
        decisions: [{ ...VALID_ENTRY, decision: 'maybe' }],
      }),
    ).toThrow(InvalidPublicationDecisionSetError);
  });

  it('rejects a missing reason', () => {
    expect(() =>
      parsePublicationDecisionSet({ ...VALID_SET, decisions: [{ ...VALID_ENTRY, reason: '' }] }),
    ).toThrow(InvalidPublicationDecisionSetError);
  });

  it('rejects a missing decidedBy', () => {
    expect(() =>
      parsePublicationDecisionSet({ ...VALID_SET, decisions: [{ ...VALID_ENTRY, decidedBy: '' }] }),
    ).toThrow(InvalidPublicationDecisionSetError);
  });

  it('rejects a missing decidedAt', () => {
    expect(() =>
      parsePublicationDecisionSet({ ...VALID_SET, decisions: [{ ...VALID_ENTRY, decidedAt: '' }] }),
    ).toThrow(InvalidPublicationDecisionSetError);
  });

  it('rejects duplicate decisions for the same entityKind:recordId', () => {
    expect(() =>
      parsePublicationDecisionSet({ ...VALID_SET, decisions: [VALID_ENTRY, VALID_ENTRY] }),
    ).toThrow(InvalidPublicationDecisionSetError);
  });
});

describe('buildPublicationDecisionIndex', () => {
  it('indexes decisions by entityKind:recordId', () => {
    const set = parsePublicationDecisionSet(VALID_SET);
    const index = buildPublicationDecisionIndex(set);
    expect(index.get('projects:project-1')?.decision).toBe('public');
    expect(index.get('projects:unknown')).toBeUndefined();
  });
});

describe('computePublicationDecisionSetChecksum', () => {
  it('is deterministic for the same content', () => {
    const set = parsePublicationDecisionSet(VALID_SET);
    expect(computePublicationDecisionSetChecksum(set)).toBe(
      computePublicationDecisionSetChecksum(set),
    );
  });

  it('is unaffected by generatedAt', () => {
    const set = parsePublicationDecisionSet(VALID_SET);
    const later: PublicationDecisionSet = { ...set, generatedAt: '2030-01-01T00:00:00.000Z' };
    expect(computePublicationDecisionSetChecksum(set)).toBe(
      computePublicationDecisionSetChecksum(later),
    );
  });

  it('changes when a decision value changes', () => {
    const set = parsePublicationDecisionSet(VALID_SET);
    const changed: PublicationDecisionSet = {
      ...set,
      decisions: [{ ...set.decisions[0], decision: 'excluded' }],
    };
    expect(computePublicationDecisionSetChecksum(set)).not.toBe(
      computePublicationDecisionSetChecksum(changed),
    );
  });
});
