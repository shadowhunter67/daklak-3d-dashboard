import { describe, expect, it } from 'vitest';
import {
  InvalidPublicApprovalReceiptError,
  parsePublicApprovalReceipt,
  validateReceiptMatchesManifest,
  type PublicApprovalReceipt,
} from './approvalReceipt';

const VALID_RECEIPT = {
  receiptVersion: '1.0.0',
  sourceNormalizedContentChecksum: 'aaa',
  projectedContentChecksum: 'bbb',
  allowedFieldPolicyVersion: '1.0.0',
  publicationDecisionSetChecksum: 'ccc',
  reviewer: 'reviewer-a',
  decidedAt: '2026-03-01T00:00:00.000Z',
};

describe('parsePublicApprovalReceipt', () => {
  it('parses a valid receipt', () => {
    const parsed = parsePublicApprovalReceipt(VALID_RECEIPT);
    expect(parsed.reviewer).toBe('reviewer-a');
  });

  it('accepts an explicit null publicationDecisionSetChecksum', () => {
    const parsed = parsePublicApprovalReceipt({
      ...VALID_RECEIPT,
      publicationDecisionSetChecksum: null,
    });
    expect(parsed.publicationDecisionSetChecksum).toBeNull();
  });

  it('rejects a missing publicationDecisionSetChecksum (must be an explicit value or null)', () => {
    const { publicationDecisionSetChecksum, ...withoutField } = VALID_RECEIPT;
    void publicationDecisionSetChecksum;
    expect(() => parsePublicApprovalReceipt(withoutField)).toThrow(
      InvalidPublicApprovalReceiptError,
    );
  });

  it('rejects a non-object input', () => {
    expect(() => parsePublicApprovalReceipt('nope')).toThrow(InvalidPublicApprovalReceiptError);
  });

  it('rejects a missing reviewer', () => {
    expect(() => parsePublicApprovalReceipt({ ...VALID_RECEIPT, reviewer: '' })).toThrow(
      InvalidPublicApprovalReceiptError,
    );
  });

  it('rejects a missing projectedContentChecksum', () => {
    expect(() =>
      parsePublicApprovalReceipt({ ...VALID_RECEIPT, projectedContentChecksum: '' }),
    ).toThrow(InvalidPublicApprovalReceiptError);
  });

  it('accepts an optional referenceId', () => {
    const parsed = parsePublicApprovalReceipt({ ...VALID_RECEIPT, referenceId: 'TICKET-1' });
    expect(parsed.referenceId).toBe('TICKET-1');
  });
});

describe('validateReceiptMatchesManifest', () => {
  const receipt: PublicApprovalReceipt = parsePublicApprovalReceipt(VALID_RECEIPT);

  it('is valid when every field matches the manifest exactly', () => {
    const result = validateReceiptMatchesManifest(receipt, {
      sourceNormalizedContentChecksum: 'aaa',
      projectedContentChecksum: 'bbb',
      allowedFieldPolicyVersion: '1.0.0',
      publicationDecisionSetChecksum: 'ccc',
    });
    expect(result).toEqual({ valid: true, reasons: [] });
  });

  it('is invalid when projectedContentChecksum has changed (bundle regenerated after approval)', () => {
    const result = validateReceiptMatchesManifest(receipt, {
      sourceNormalizedContentChecksum: 'aaa',
      projectedContentChecksum: 'different',
      allowedFieldPolicyVersion: '1.0.0',
      publicationDecisionSetChecksum: 'ccc',
    });
    expect(result.valid).toBe(false);
    expect(result.reasons.join(' ')).toContain('projectedContentChecksum');
  });

  it('is invalid when publicationDecisionSetChecksum differs', () => {
    const result = validateReceiptMatchesManifest(receipt, {
      sourceNormalizedContentChecksum: 'aaa',
      projectedContentChecksum: 'bbb',
      allowedFieldPolicyVersion: '1.0.0',
      publicationDecisionSetChecksum: 'different',
    });
    expect(result.valid).toBe(false);
  });

  it('treats a manifest with an absent publicationDecisionSetChecksum field as null', () => {
    const nullReceipt = parsePublicApprovalReceipt({
      ...VALID_RECEIPT,
      publicationDecisionSetChecksum: null,
    });
    const result = validateReceiptMatchesManifest(nullReceipt, {
      sourceNormalizedContentChecksum: 'aaa',
      projectedContentChecksum: 'bbb',
      allowedFieldPolicyVersion: '1.0.0',
    });
    expect(result.valid).toBe(true);
  });

  it('reports every mismatched field, not just the first', () => {
    const result = validateReceiptMatchesManifest(receipt, {
      sourceNormalizedContentChecksum: 'x',
      projectedContentChecksum: 'y',
      allowedFieldPolicyVersion: '2.0.0',
      publicationDecisionSetChecksum: 'z',
    });
    expect(result.reasons).toHaveLength(4);
  });
});
