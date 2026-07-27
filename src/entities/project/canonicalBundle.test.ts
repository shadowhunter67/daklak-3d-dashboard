import { describe, expect, it } from 'vitest';
import {
  CANONICAL_PROJECT_PORTFOLIO_SCHEMA_VERSION,
  isSupportedCanonicalSchemaVersion,
  SUPPORTED_CANONICAL_SCHEMA_VERSIONS,
} from './canonicalBundle';

describe('isSupportedCanonicalSchemaVersion', () => {
  it('accepts the current schema version', () => {
    expect(isSupportedCanonicalSchemaVersion(CANONICAL_PROJECT_PORTFOLIO_SCHEMA_VERSION)).toBe(
      true,
    );
    expect(SUPPORTED_CANONICAL_SCHEMA_VERSIONS).toContain(
      CANONICAL_PROJECT_PORTFOLIO_SCHEMA_VERSION,
    );
  });

  it('rejects an unlisted version, including a plausible-looking future one — never parsed best-effort', () => {
    expect(isSupportedCanonicalSchemaVersion('2.0.0')).toBe(false);
    expect(isSupportedCanonicalSchemaVersion('1.0.1')).toBe(false);
    expect(isSupportedCanonicalSchemaVersion('')).toBe(false);
    expect(isSupportedCanonicalSchemaVersion('not-a-version')).toBe(false);
  });
});
