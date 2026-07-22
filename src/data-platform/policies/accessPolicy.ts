import type { DatasetDescriptor } from '../schemas/dataset';
import type { DataAccessPolicy, UserContext } from '../schemas/policy';

/**
 * The only real caller today: this is a static site with no authentication, so every visitor is
 * this context. A future secure deployment's auth provider would produce a different UserContext
 * per request — see docs/deployment-profiles.md.
 */
export const ANONYMOUS_PUBLIC_USER: UserContext = { authenticated: false, roles: [] };

function hasRequiredRole(user: UserContext, policy: DataAccessPolicy): boolean {
  if (!policy.requiredRoles || policy.requiredRoles.length === 0) return true;
  return policy.requiredRoles.some((role) => user.roles.includes(role));
}

/**
 * A UX guard only. The frontend has no way to actually enforce this — a static bundle is fully
 * readable by anyone who fetches it. Real enforcement for non-public data must happen server-side
 * (a BFF/API gateway checking the same policy id); see docs/security-architecture.md. This
 * function exists so the UI can hide/disable things it has no business rendering, not to protect
 * the data itself.
 */
export function canViewDataset(
  user: UserContext,
  dataset: DatasetDescriptor,
  policy: DataAccessPolicy,
): boolean {
  if (dataset.classification === 'public') return true;
  if (policy.requireAuthentication && !user.authenticated) return false;
  return hasRequiredRole(user, policy);
}

export function canExportDataset(
  user: UserContext,
  dataset: DatasetDescriptor,
  policy: DataAccessPolicy,
): boolean {
  if (!policy.allowExport) return false;
  return canViewDataset(user, dataset, policy);
}

/** Whether the dataset may be cached client-side at all (localStorage/IndexedDB/SW/HTTP cache). */
export function canCacheDataset(dataset: DatasetDescriptor, policy: DataAccessPolicy): boolean {
  if (dataset.classification === 'confidential' || dataset.classification === 'restricted')
    return false;
  return policy.allowCaching;
}
