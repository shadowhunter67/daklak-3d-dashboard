import type { DataAccessPolicy } from '../schemas/policy';

/**
 * One standard policy per classification tier (spec §5). Datasets reference these by
 * `access.delivery`/`accessPolicyId`; a dataset needing a stricter variant (e.g. a masked field
 * list) should add a new policy id here rather than mutating one of these four in place, since
 * other datasets already depend on their current shape.
 */
export const DEFAULT_ACCESS_POLICIES: Record<string, DataAccessPolicy> = {
  'public-standard': {
    id: 'public-standard',
    classification: 'public',
    publicMetadata: true,
    allowClientDownload: true,
    allowExport: true,
    allowCaching: true,
    requireAuthentication: false,
  },
  'internal-standard': {
    id: 'internal-standard',
    classification: 'internal',
    publicMetadata: true,
    allowClientDownload: false,
    allowExport: false,
    allowCaching: false,
    requireAuthentication: true,
  },
  'confidential-standard': {
    id: 'confidential-standard',
    classification: 'confidential',
    publicMetadata: false,
    allowClientDownload: false,
    allowExport: false,
    allowCaching: false,
    requireAuthentication: true,
    requiredRoles: ['confidential-data-viewer'],
    minimumAggregationLevel: 'province',
  },
  'restricted-standard': {
    id: 'restricted-standard',
    classification: 'restricted',
    publicMetadata: false,
    allowClientDownload: false,
    allowExport: false,
    allowCaching: false,
    requireAuthentication: true,
    requiredRoles: ['restricted-data-viewer'],
  },
};
