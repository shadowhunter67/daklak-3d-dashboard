import { describe, expect, it } from 'vitest';
import { createBuildInfo } from './buildInfo';

describe('createBuildInfo', () => {
  const base = {
    applicationVersion: '1.2.3',
    buildTimestamp: '2026-07-16T12:00:00+07:00',
    datasetVersion: '1253e2ad7933bcc59a5b68a03a81b532cd939e3e',
    datasetSnapshot: '2026-07-16',
  };

  it('normalizes metadata to a deploy-verifiable representation', () => {
    expect(createBuildInfo({ ...base, gitCommit: ' abc123\n' })).toEqual({
      ...base,
      gitCommit: 'abc123',
      buildTimestamp: '2026-07-16T05:00:00.000Z',
    });
  });

  it('uses an explicit marker when git metadata is unavailable', () => {
    expect(createBuildInfo({ ...base, gitCommit: undefined }).gitCommit).toBe('unknown');
  });
});
