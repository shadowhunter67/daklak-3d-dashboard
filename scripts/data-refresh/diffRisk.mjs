// Rule-based diff + risk classification — no AI/ML scoring (docs/adr/0004-public-data-ingestion.md
// section 7). Only two outcomes: 'low-risk' (safe to auto-merge if every other gate is green) or
// 'hard-stop' (a human must review). There is deliberately no "medium" bucket.

/**
 * @param {Record<string, unknown>[]} previousRecords
 * @param {Record<string, unknown>[]} nextRecords
 * @param {string} idField
 * @returns {{ added: object[], removed: object[], changed: {id: string, before: object, after: object}[], unchangedCount: number }}
 */
export function computeDiff(previousRecords, nextRecords, idField = 'id') {
  const previousById = new Map(previousRecords.map((record) => [record[idField], record]));
  const nextById = new Map(nextRecords.map((record) => [record[idField], record]));

  const added = [...nextById.entries()]
    .filter(([id]) => !previousById.has(id))
    .map(([, record]) => record);
  const removed = [...previousById.entries()]
    .filter(([id]) => !nextById.has(id))
    .map(([, record]) => record);
  const changed = [];
  let unchangedCount = 0;
  for (const [id, before] of previousById) {
    const after = nextById.get(id);
    if (!after) continue;
    if (JSON.stringify(before) === JSON.stringify(after)) unchangedCount += 1;
    else changed.push({ id, before, after });
  }

  return { added, removed, changed, unchangedCount };
}

/** @param {Record<string, unknown>[]} records @returns {Set<string>} */
function fieldUnion(records) {
  const fields = new Set();
  for (const record of records) for (const key of Object.keys(record)) fields.add(key);
  return fields;
}

/**
 * A schema change is any field appearing in one snapshot's record shape but not the other — not
 * just added/removed top-level keys on individual records (that's covered by computeDiff), but a
 * change to the *shape* records come in at all.
 * @param {Record<string, unknown>[]} previousRecords
 * @param {Record<string, unknown>[]} nextRecords
 * @returns {{ changed: boolean, addedFields: string[], removedFields: string[] }}
 */
export function detectSchemaChange(previousRecords, nextRecords) {
  const previousFields = fieldUnion(previousRecords);
  const nextFields = fieldUnion(nextRecords);
  const addedFields = [...nextFields].filter((field) => !previousFields.has(field));
  const removedFields = [...previousFields].filter((field) => !nextFields.has(field));
  return {
    changed: addedFields.length > 0 || removedFields.length > 0,
    addedFields,
    removedFields,
  };
}

/**
 * @param {{
 *   diff: ReturnType<typeof computeDiff>,
 *   schemaChange: ReturnType<typeof detectSchemaChange>,
 *   privacyFindingCount: number,
 *   complianceAllowed: boolean,
 *   responseComplianceAllowed: boolean,
 *   sourceIsOfficialMachineReadable: boolean,
 *   parserChanged: boolean,
 *   validationErrorCount: number,
 * }} input
 * @returns {{ level: 'low-risk'|'hard-stop', reasons: string[] }}
 */
export function assessRisk(input) {
  const reasons = [];

  if (!input.complianceAllowed) reasons.push('compliance gate failed (see compliance.mjs reasons)');
  if (!input.responseComplianceAllowed)
    reasons.push('response compliance gate failed (redirect/login-wall/content-type)');
  if (input.privacyFindingCount > 0)
    reasons.push(`${input.privacyFindingCount} potential personal-data finding(s)`);
  if (input.schemaChange.changed) reasons.push('dataset schema changed (fields added/removed)');
  if (input.diff.removed.length > 0)
    reasons.push(`${input.diff.removed.length} record(s) deleted from the source`);
  if (input.validationErrorCount > 0)
    reasons.push(`${input.validationErrorCount} validation error(s)`);
  if (
    input.parserChanged &&
    (input.diff.added.length > 0 || input.diff.changed.length > 0 || input.diff.removed.length > 0)
  ) {
    reasons.push(
      'parser/adapter changed in the same run as a real data change — cannot attribute the diff to the source alone',
    );
  }
  if (!input.sourceIsOfficialMachineReadable)
    reasons.push('source is not a confirmed official machine-readable source');

  return { level: reasons.length === 0 ? 'low-risk' : 'hard-stop', reasons };
}
