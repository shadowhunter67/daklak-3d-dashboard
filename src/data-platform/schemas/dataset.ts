/**
 * Dataset catalog schema. See docs/data-platform-architecture.md and docs/data-classification.md
 * for the reasoning behind each field; this file only defines shapes.
 */

export type DataClassification = 'public' | 'internal' | 'confidential' | 'restricted';

export type DataAuthority =
  'official' | 'authoritative-third-party' | 'open-community' | 'illustrative' | 'unknown';

export type PublicationStatus = 'draft' | 'reviewed' | 'published' | 'deprecated' | 'withdrawn';

export type DatasetDomain =
  | 'administrative'
  | 'population'
  | 'economy'
  | 'agriculture'
  | 'infrastructure'
  | 'energy'
  | 'environment'
  | 'planning'
  | 'tourism'
  | 'public-service'
  | 'disaster'
  | 'other';

export type AdministrativeLevel = 'province' | 'commune' | 'point' | 'grid' | 'mixed';

export type TemporalResolution =
  'static' | 'annual' | 'quarterly' | 'monthly' | 'daily' | 'realtime' | 'event';

export type SpatialRepresentation =
  'none' | 'point' | 'line' | 'polygon' | 'raster' | 'vector-tile';

export type GeometryStatus = 'official' | 'verified' | 'reference' | 'unknown';

export type QualityStatus = 'verified' | 'partially-verified' | 'unverified';

export type DataDelivery = 'bundled-static' | 'public-api' | 'protected-api' | 'pmtiles';

export interface DatasetSource {
  organization: string;
  documentNumber?: string;
  sourceUrl?: string;
  retrievalDate?: string;
  license?: string;
  termsOfUse?: string;
}

export interface DatasetPeriod {
  start?: string;
  end?: string;
  label: string;
}

export interface DatasetRefreshPolicy {
  mode: 'manual' | 'scheduled' | 'event-driven';
  expectedInterval?: string;
}

export interface DatasetQuality {
  status: QualityStatus;
  geometryStatus?: GeometryStatus;
  knownLimitations: string[];
}

export interface DatasetAccess {
  delivery: DataDelivery;
  requiresAuthentication: boolean;
  allowedRoles?: string[];
}

export interface DatasetDescriptor {
  id: string;
  title: string;
  description: string;
  domain: DatasetDomain;

  classification: DataClassification;
  authority: DataAuthority;
  publicationStatus: PublicationStatus;

  administrativeLevel: AdministrativeLevel;
  temporalResolution: TemporalResolution;
  spatialRepresentation: SpatialRepresentation;

  source: DatasetSource;

  version: string;
  period?: DatasetPeriod;

  generatedAt?: string;
  checksum?: string;
  refreshPolicy?: DatasetRefreshPolicy;

  quality: DatasetQuality;
  access: DatasetAccess;
}

/** A text-only planning/administrative document that has no verified spatial geometry (see spec §2.3). */
export type DocumentLegalStatus = 'draft' | 'in-effect' | 'superseded' | 'unknown';

export interface DocumentReference {
  id: string;
  title: string;
  issuingAuthority: string;
  documentNumber?: string;
  issuedDate?: string;
  legalStatus: DocumentLegalStatus;
  applicability: string;
  sourceUrl?: string;
  /** Administrative code this document is explicitly and verifiably linked to, if any. */
  relatedAdministrativeCode?: string;
  /** True while the citation still needs a human to verify title/number/date/authority/URL. */
  verificationStatus: 'verified' | 'research-needed';
  note?: string;
}
