import { describe, expect, it } from 'vitest';
import { buildRefreshManifest } from './manifest.mjs';

describe('buildRefreshManifest', () => {
  const baseInput = {
    datasetId: 'test-dataset',
    effectiveAt: '2026-07-20T00:00:00.000Z',
    sourcePublishedAt: '2026-07-20T00:00:00.000Z',
    sourceUrl: 'https://example.invalid/x',
    publisher: 'Test',
    adapterVersion: 'recorded-fixture@1',
    recordCount: 2,
    validationResult: 'passed',
    evidenceReference: 'fixture://test',
    records: [{ id: '1' }, { id: '2' }],
  };

  it('includes every manifest field the ADR requires, except records', () => {
    const manifest = buildRefreshManifest(baseInput);
    expect(manifest).not.toHaveProperty('records');
    for (const field of [
      'datasetId',
      'effectiveAt',
      'sourcePublishedAt',
      'retrievedAt',
      'sourceUrl',
      'publisher',
      'checksum',
      'adapterVersion',
      'recordCount',
      'validationResult',
      'evidenceReference',
    ]) {
      expect(manifest, `manifest.${field}`).toHaveProperty(field);
    }
  });

  it('sets retrievedAt to a valid, current ISO timestamp', () => {
    const before = Date.now();
    const manifest = buildRefreshManifest(baseInput);
    const retrievedAtMs = new Date(manifest.retrievedAt).getTime();
    expect(retrievedAtMs).toBeGreaterThanOrEqual(before);
    expect(retrievedAtMs).toBeLessThanOrEqual(Date.now());
  });

  it('computes a checksum over records, and only records', () => {
    const manifestA = buildRefreshManifest(baseInput);
    const manifestB = buildRefreshManifest({ ...baseInput, records: [{ id: '2' }, { id: '1' }] });
    // Different record array identity but represents the same set — checksumOf sorts object keys
    // but not array order, so this documents that record order matters to the checksum.
    expect(manifestA.checksum).not.toBe(manifestB.checksum);
  });
});
