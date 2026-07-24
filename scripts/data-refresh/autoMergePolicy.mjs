// Auto-merge eligibility gate — deliberately separate from diffRisk.mjs's low-risk/hard-stop
// classification (docs/adr/0004-public-data-ingestion.md section 10 "Auto-merge policy"). A run
// can be `low-risk` (safe to *open a PR for*) while still never being auto-merge-eligible, because
// eligibility also depends on facts diffRisk.mjs doesn't see: the source's declared maturity, and
// whether anything about the *source itself* (schema, adapter, compliance, redistribution policy)
// moved since the last published snapshot. The risk engine never decides maturity — that's a fact
// declared by a human in data/source-registry.yml (see SOURCE_MATURITIES in types.mjs).

/**
 * @param {{
 *   maturity: string,
 *   riskLevel: 'low-risk'|'hard-stop',
 *   schemaChanged: boolean,
 *   adapterVersionChanged: boolean,
 *   deletionCount: number,
 *   identityRemapCount: number,
 *   legalStatusChanged: boolean,
 *   privacyFindingCount: number,
 *   complianceChanged: boolean,
 *   redistributionPolicyChanged: boolean,
 *   domainRedirectAllowed: boolean,
 *   evidenceChecksumConflict: boolean,
 *   qualityChecksPassed: boolean,
 * }} input
 * @returns {{ eligible: boolean, reasons: string[] }}
 */
export function evaluateAutoMergeEligibility(input) {
  const reasons = [];

  if (input.maturity !== 'auto-merge-eligible') {
    reasons.push(
      `source maturity is "${input.maturity}", not "auto-merge-eligible" — a human must declare a source auto-merge-eligible in data/source-registry.yml before any run of it can merge unattended`,
    );
  }
  if (input.riskLevel !== 'low-risk') {
    reasons.push(`run risk level is "${input.riskLevel}", not "low-risk"`);
  }
  if (input.schemaChanged) reasons.push('dataset schema changed since the last published run');
  if (input.adapterVersionChanged) {
    reasons.push('adapter version changed since the last published run — needs its own review');
  }
  if (input.deletionCount > 0) {
    reasons.push(`${input.deletionCount} record(s) deleted from the source`);
  }
  if (input.identityRemapCount > 0) {
    reasons.push(`${input.identityRemapCount} record(s) appear to have changed identity/id`);
  }
  if (input.legalStatusChanged) reasons.push('a record legal/approval status field changed');
  if (input.privacyFindingCount > 0) {
    reasons.push(`${input.privacyFindingCount} potential personal-data finding(s)`);
  }
  if (input.complianceChanged) {
    reasons.push('the registry compliance block changed since the last published run');
  }
  if (input.redistributionPolicyChanged) reasons.push('redistributionPolicy changed');
  if (!input.domainRedirectAllowed) {
    reasons.push('response redirected to an unexpected domain');
  }
  if (input.evidenceChecksumConflict) {
    reasons.push('evidence checksum conflicts with the previously recorded checksum');
  }
  if (!input.qualityChecksPassed) reasons.push('quality checks did not pass');

  return { eligible: reasons.length === 0, reasons };
}
