import type { AdministrativeLevel, DataClassification } from './dataset';

export interface DataAccessPolicy {
  id: string;
  classification: DataClassification;
  publicMetadata: boolean;
  allowClientDownload: boolean;
  allowExport: boolean;
  allowCaching: boolean;
  requireAuthentication: boolean;
  requiredRoles?: string[];
  maskFields?: string[];
  minimumAggregationLevel?: Extract<AdministrativeLevel, 'province' | 'commune'>;
}

/**
 * Minimal shape for a future authenticated caller. This repo has no real auth (static site) —
 * today's only real caller is `ANONYMOUS_PUBLIC_USER` in accessPolicy.ts. This type exists so a
 * future secure deployment's auth provider has a contract to fill in, not because a caller with
 * roles exists yet.
 */
export interface UserContext {
  authenticated: boolean;
  roles: string[];
}

export type AuditEventType = 'dataset_view' | 'dataset_export' | 'layer_enable' | 'access_denied';

/**
 * Contract for a future secure deployment's audit log. Nothing in this repo emits or transmits
 * these today — see docs/deployment-profiles.md. Never include PII in `note`.
 */
export interface AuditEvent {
  eventType: AuditEventType;
  datasetId?: string;
  layerId?: string;
  occurredAt: string;
  requestId: string;
}
