import { describe, expect, it } from 'vitest';
import type { DatasetDescriptor } from '../schemas/dataset';
import type { UserContext } from '../schemas/policy';
import {
  ANONYMOUS_PUBLIC_USER,
  canCacheDataset,
  canExportDataset,
  canViewDataset,
} from './accessPolicy';
import { DEFAULT_ACCESS_POLICIES } from './defaultPolicies';

function makeDataset(overrides: Partial<DatasetDescriptor> = {}): DatasetDescriptor {
  return {
    id: 'ds',
    title: 'Dataset',
    description: '',
    domain: 'other',
    classification: 'public',
    authority: 'official',
    publicationStatus: 'published',
    administrativeLevel: 'province',
    temporalResolution: 'annual',
    spatialRepresentation: 'none',
    source: { organization: 'x' },
    version: '1.0.0',
    quality: { status: 'verified', knownLimitations: [] },
    access: { delivery: 'bundled-static', requiresAuthentication: false },
    ...overrides,
  };
}

describe('canViewDataset', () => {
  it('always allows public data, even for an anonymous user', () => {
    const dataset = makeDataset({ classification: 'public' });
    expect(
      canViewDataset(ANONYMOUS_PUBLIC_USER, dataset, DEFAULT_ACCESS_POLICIES['public-standard']),
    ).toBe(true);
  });

  it('denies internal data to an unauthenticated user', () => {
    const dataset = makeDataset({ classification: 'internal' });
    expect(
      canViewDataset(ANONYMOUS_PUBLIC_USER, dataset, DEFAULT_ACCESS_POLICIES['internal-standard']),
    ).toBe(false);
  });

  it('denies confidential data to an authenticated user missing the required role', () => {
    const dataset = makeDataset({ classification: 'confidential' });
    const user: UserContext = { authenticated: true, roles: ['some-other-role'] };
    expect(canViewDataset(user, dataset, DEFAULT_ACCESS_POLICIES['confidential-standard'])).toBe(
      false,
    );
  });

  it('allows confidential data to a user with the required role', () => {
    const dataset = makeDataset({ classification: 'confidential' });
    const user: UserContext = { authenticated: true, roles: ['confidential-data-viewer'] };
    expect(canViewDataset(user, dataset, DEFAULT_ACCESS_POLICIES['confidential-standard'])).toBe(
      true,
    );
  });
});

describe('canExportDataset', () => {
  it('denies export when the policy disallows it even if the dataset is viewable', () => {
    const dataset = makeDataset({ classification: 'internal' });
    const user: UserContext = { authenticated: true, roles: [] };
    expect(canExportDataset(user, dataset, DEFAULT_ACCESS_POLICIES['internal-standard'])).toBe(
      false,
    );
  });

  it('allows export for public data under the standard public policy', () => {
    const dataset = makeDataset({ classification: 'public' });
    expect(
      canExportDataset(ANONYMOUS_PUBLIC_USER, dataset, DEFAULT_ACCESS_POLICIES['public-standard']),
    ).toBe(true);
  });
});

describe('canCacheDataset', () => {
  it('never allows caching confidential or restricted data, regardless of policy.allowCaching', () => {
    const confidential = makeDataset({ classification: 'confidential' });
    const restricted = makeDataset({ classification: 'restricted' });
    expect(
      canCacheDataset(confidential, {
        ...DEFAULT_ACCESS_POLICIES['confidential-standard'],
        allowCaching: true,
      }),
    ).toBe(false);
    expect(
      canCacheDataset(restricted, {
        ...DEFAULT_ACCESS_POLICIES['restricted-standard'],
        allowCaching: true,
      }),
    ).toBe(false);
  });

  it('allows caching public data under the standard public policy', () => {
    const dataset = makeDataset({ classification: 'public' });
    expect(canCacheDataset(dataset, DEFAULT_ACCESS_POLICIES['public-standard'])).toBe(true);
  });
});
