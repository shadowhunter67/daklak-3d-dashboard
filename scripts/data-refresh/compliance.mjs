// Hard-rule compliance gate — code, not an AI judgment call (docs/adr/0004-public-data-ingestion.md
// section 6). Any one of these failing means the pipeline must stop before fetching/publishing
// anything for that source.

/**
 * @param {{ compliance?: Record<string, unknown> }} entry A source-registry entry.
 * @returns {{ allowed: boolean, reasons: string[] }}
 */
export function evaluateCompliance(entry) {
  const reasons = [];
  const compliance = entry?.compliance;
  if (!compliance || typeof compliance !== 'object') {
    return { allowed: false, reasons: ['no compliance block declared for this source'] };
  }
  if (!compliance.robotsCheckedAt)
    reasons.push('robots.txt has not been checked (robotsCheckedAt missing)');
  if (!compliance.termsCheckedAt)
    reasons.push('terms of use have not been checked (termsCheckedAt missing)');
  if (compliance.redistributionPolicy === 'unknown' || !compliance.redistributionPolicy) {
    reasons.push('redistributionPolicy is unknown — cannot legally redistribute this data yet');
  }
  if (compliance.redistributionPolicy === 'not-allowed') {
    reasons.push(
      'redistributionPolicy is not-allowed — this source may not be redistributed at all',
    );
  }
  if (compliance.automatedAccessApproved !== true) {
    reasons.push(
      'automated access has not been explicitly approved (automatedAccessApproved !== true)',
    );
  }
  return { allowed: reasons.length === 0, reasons };
}

/**
 * Additional hard stops that only make sense once a response has actually been fetched — a
 * redirect outside the approved domain, a login/CAPTCHA wall, or content that isn't the expected
 * type all mean "stop and ask a human", never "guess and continue".
 * @param {{ finalUrl: string, approvedUrls: string[], contentType: string, expectedContentType: string,
 *   looksLikeLoginWall: boolean }} input
 * @returns {{ allowed: boolean, reasons: string[] }}
 */
export function evaluateResponseCompliance(input) {
  const reasons = [];
  const approvedOrigins = input.approvedUrls.map((url) => new URL(url).origin);
  const finalOrigin = (() => {
    try {
      return new URL(input.finalUrl).origin;
    } catch {
      return null;
    }
  })();
  if (!finalOrigin || !approvedOrigins.includes(finalOrigin)) {
    reasons.push(`response redirected outside the approved domain(s): ${input.finalUrl}`);
  }
  if (input.looksLikeLoginWall) {
    reasons.push('response looks like a login/CAPTCHA wall, not the expected content');
  }
  if (input.contentType && !input.contentType.includes(input.expectedContentType)) {
    reasons.push(
      `unexpected content-type "${input.contentType}", expected "${input.expectedContentType}"`,
    );
  }
  return { allowed: reasons.length === 0, reasons };
}
