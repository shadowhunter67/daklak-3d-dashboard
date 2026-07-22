import { describe, expect, it } from 'vitest';
import { DOCUMENT_REFERENCES, getDocumentReference } from './documents';

describe('DOCUMENT_REFERENCES', () => {
  it('has unique ids', () => {
    const ids = DOCUMENT_REFERENCES.map((doc) => doc.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('requires a documentNumber and issuedDate for every verified reference', () => {
    for (const doc of DOCUMENT_REFERENCES) {
      if (doc.verificationStatus === 'verified') {
        expect(doc.documentNumber).toBeTruthy();
        expect(doc.issuedDate).toBeTruthy();
        expect(doc.sourceUrl).toBeTruthy();
      }
    }
  });

  it('requires an explanatory note for every research-needed reference', () => {
    for (const doc of DOCUMENT_REFERENCES) {
      if (doc.verificationStatus === 'research-needed') {
        expect(doc.note).toBeTruthy();
      }
    }
  });

  it('looks up a document by id', () => {
    expect(getDocumentReference('quyhoach-daklak-dieu-chinh-2026')?.issuingAuthority).toBe(
      'Chủ tịch UBND tỉnh Đắk Lắk',
    );
    expect(getDocumentReference('missing')).toBeUndefined();
  });
});
