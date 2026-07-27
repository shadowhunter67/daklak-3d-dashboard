import { describe, expect, it } from 'vitest';
import { evaluateCompliance, evaluateResponseCompliance } from './compliance.mjs';

const OK_ENTRY = {
  compliance: {
    robotsCheckedAt: '2026-07-24T00:00:00.000Z',
    termsCheckedAt: '2026-07-24T00:00:00.000Z',
    redistributionPolicy: 'allowed-with-attribution',
    attributionRequired: true,
    personalDataExpected: false,
    automatedAccessApproved: true,
  },
};

describe('evaluateCompliance', () => {
  it('allows an entry with every compliance field satisfied', () => {
    expect(evaluateCompliance(OK_ENTRY)).toEqual({ allowed: true, reasons: [] });
  });

  it('hard-stops when compliance is entirely missing', () => {
    expect(evaluateCompliance({}).allowed).toBe(false);
  });

  it('hard-stops on an unknown redistributionPolicy', () => {
    const { allowed, reasons } = evaluateCompliance({
      compliance: { ...OK_ENTRY.compliance, redistributionPolicy: 'unknown' },
    });
    expect(allowed).toBe(false);
    expect(reasons.some((r) => r.includes('redistributionPolicy'))).toBe(true);
  });

  it('hard-stops on redistributionPolicy: not-allowed', () => {
    const { allowed } = evaluateCompliance({
      compliance: { ...OK_ENTRY.compliance, redistributionPolicy: 'not-allowed' },
    });
    expect(allowed).toBe(false);
  });

  it('hard-stops when robots.txt was never checked', () => {
    const { allowed, reasons } = evaluateCompliance({
      compliance: { ...OK_ENTRY.compliance, robotsCheckedAt: undefined },
    });
    expect(allowed).toBe(false);
    expect(reasons.some((r) => r.includes('robots'))).toBe(true);
  });

  it('hard-stops when terms of use were never checked', () => {
    const { allowed, reasons } = evaluateCompliance({
      compliance: { ...OK_ENTRY.compliance, termsCheckedAt: undefined },
    });
    expect(allowed).toBe(false);
    expect(reasons.some((r) => r.includes('terms'))).toBe(true);
  });

  it('hard-stops when automated access was not explicitly approved', () => {
    const { allowed } = evaluateCompliance({
      compliance: { ...OK_ENTRY.compliance, automatedAccessApproved: false },
    });
    expect(allowed).toBe(false);
  });
});

describe('evaluateResponseCompliance', () => {
  const baseInput = {
    finalUrl: 'https://example.invalid/data',
    approvedUrls: ['https://example.invalid/data'],
    contentType: 'application/json',
    expectedContentType: 'application/json',
    looksLikeLoginWall: false,
  };

  it('allows a response from an approved origin with the expected content type', () => {
    expect(evaluateResponseCompliance(baseInput)).toEqual({ allowed: true, reasons: [] });
  });

  it('hard-stops on a redirect outside the approved domain', () => {
    const { allowed, reasons } = evaluateResponseCompliance({
      ...baseInput,
      finalUrl: 'https://attacker.invalid/data',
    });
    expect(allowed).toBe(false);
    expect(reasons.some((r) => r.includes('redirected'))).toBe(true);
  });

  it('hard-stops on a login/CAPTCHA wall', () => {
    const { allowed, reasons } = evaluateResponseCompliance({
      ...baseInput,
      looksLikeLoginWall: true,
    });
    expect(allowed).toBe(false);
    expect(reasons.some((r) => r.includes('login'))).toBe(true);
  });

  it('hard-stops on an unexpected content type', () => {
    const { allowed, reasons } = evaluateResponseCompliance({
      ...baseInput,
      contentType: 'text/html',
    });
    expect(allowed).toBe(false);
    expect(reasons.some((r) => r.includes('content-type'))).toBe(true);
  });
});
