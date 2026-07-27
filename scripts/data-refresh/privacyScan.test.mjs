import { describe, expect, it } from 'vitest';
import { maskValue, scanForPersonalData, scanRecordForPersonalData } from './privacyScan.mjs';

describe('maskValue', () => {
  it('keeps only the first and last character', () => {
    expect(maskValue('user@example.com')).toBe('u**************m');
  });

  it('masks a short value entirely', () => {
    expect(maskValue('ab')).toBe('**');
    expect(maskValue('a')).toBe('*');
  });
});

describe('scanForPersonalData', () => {
  it('detects an email address', () => {
    const findings = scanForPersonalData('Contact: nguyen.van.a@example.com for details.');
    expect(findings.some((f) => f.kind === 'email')).toBe(true);
  });

  it('detects a Vietnamese phone number', () => {
    const findings = scanForPersonalData('Hotline: 0912345678');
    expect(findings.some((f) => f.kind === 'phone')).toBe(true);
  });

  it('detects a 12-digit citizen ID, not a phone or bank-account-like match for the same digits', () => {
    const findings = scanForPersonalData('CCCD: 037201012345');
    const kinds = findings.map((f) => f.kind);
    expect(kinds).toContain('citizen-id');
  });

  it('never includes the raw matched value, only a masked one', () => {
    const findings = scanForPersonalData('email: secret.person@example.com');
    for (const finding of findings) {
      expect(finding.maskedValue).not.toContain('secret.person@example.com');
    }
  });

  it('returns no findings for ordinary illustrative project text', () => {
    const findings = scanForPersonalData(
      'Nâng cấp trục đường liên xã Buôn Ma Thuột – Ea Ô (minh hoạ)',
    );
    expect(findings).toEqual([]);
  });

  it('returns no findings for an empty or non-string input', () => {
    expect(scanForPersonalData('')).toEqual([]);
    expect(scanForPersonalData(null)).toEqual([]);
    expect(scanForPersonalData(42)).toEqual([]);
  });

  it('counts repeated occurrences of the same value once, with an accurate count', () => {
    const findings = scanForPersonalData('a@example.com and again a@example.com');
    const emailFinding = findings.find((f) => f.kind === 'email');
    expect(emailFinding.count).toBe(2);
  });
});

describe('scanRecordForPersonalData', () => {
  it('recursively scans nested objects and arrays', () => {
    const record = {
      title: 'A project',
      contacts: [{ name: 'A', email: 'contact@example.com' }],
    };
    const findings = scanRecordForPersonalData(record);
    expect(findings.some((f) => f.kind === 'email')).toBe(true);
  });

  it('finds nothing in a clean illustrative record', () => {
    const record = {
      id: 'io-001',
      title: 'Kêu gọi đầu tư khu công nghiệp Ea Kar (minh hoạ)',
      sector: 'industrial-zone',
      estimatedInvestmentVndMin: 500000000000,
    };
    expect(scanRecordForPersonalData(record)).toEqual([]);
  });
});
