import { describe, expect, it } from 'vitest';
import { DOCUMENT_REFERENCES, getDocumentReference } from './documents';

describe('DOCUMENT_REFERENCES', () => {
  it('has unique ids', () => {
    const ids = DOCUMENT_REFERENCES.map((doc) => doc.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('requires a documentNumber, issuedDate, sourceUrl and evidenceLevel for every verified reference', () => {
    for (const doc of DOCUMENT_REFERENCES) {
      if (doc.verificationStatus === 'verified') {
        expect(doc.documentNumber).toBeTruthy();
        expect(doc.issuedDate).toBeTruthy();
        expect(doc.sourceUrl).toBeTruthy();
        expect(doc.evidenceLevel).toBeTruthy();
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

  it('classifies the original Prime Minister decision as an official primary document, hosted on the government document portal itself', () => {
    const doc = getDocumentReference('quyhoach-daklak-goc-2023');
    expect(doc?.documentNumber).toBe('1747/QĐ-TTg');
    expect(doc?.issuedDate).toBe('2023-12-30');
    expect(doc?.issuingAuthority).toBe('Thủ tướng Chính phủ');
    expect(doc?.verificationStatus).toBe('verified');
    expect(doc?.evidenceLevel).toBe('official-primary-document');
    expect(doc?.sourceUrl).toContain('vanban.chinhphu.vn');
  });

  it('classifies the provincial adjustment decision as a publication reference, not a primary document, since only its announcement page (not the signed file) was checked', () => {
    const doc = getDocumentReference('quyhoach-daklak-dieu-chinh-2026');
    expect(doc?.documentNumber).toBe('1589/QĐ-UBND');
    expect(doc?.verificationStatus).toBe('verified');
    expect(doc?.evidenceLevel).toBe('official-publication-reference');
    expect(doc?.evidenceLevel).not.toBe('official-primary-document');
  });
});
