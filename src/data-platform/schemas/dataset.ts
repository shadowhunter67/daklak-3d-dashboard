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
  /** Must be a real, fetchable HTTPS URL — never a scheme like `internal://` (see
   * `repositoryPath` below for that case). Enforced by catalogValidation.ts. */
  sourceUrl?: string;
  /** For data that lives in this repository itself (e.g. a generator script), not on the web —
   * a relative path from the repo root, never absolute and never containing `..`. The UI shows
   * this as plain text or a GitHub link, never as a raw `<a href>` to a non-HTTP(S) scheme. */
  repositoryPath?: string;
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

/**
 * A single `authority` overstates or understates the truth whenever a dataset's identity/naming,
 * geometry, and metric values come from genuinely different sources with different authority
 * levels (e.g. legally-issued administrative names/codes rendered with community-sourced
 * geometry). When present, UI and validation should prefer this over the coarse `authority`
 * field; `authority` stays as the single-value fallback for datasets where one authority level
 * really does describe the whole thing.
 */
export interface DatasetAuthorityDetail {
  identityAuthority?: DataAuthority;
  geometryAuthority?: DataAuthority;
  metricAuthority?: DataAuthority;
}

export interface DatasetDescriptor {
  id: string;
  title: string;
  description: string;
  domain: DatasetDomain;

  classification: DataClassification;
  authority: DataAuthority;
  /** Optional finer breakdown — see `DatasetAuthorityDetail`. */
  authorityDetail?: DatasetAuthorityDetail;
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

/**
 * How strong is the evidence behind this citation — distinct from `verificationStatus`, which
 * only says whether *anyone* checked it. A citation can be `verified` yet still only rest on a
 * news-style publication page, not the signed instrument itself; conflating the two would let a
 * secondary source quietly masquerade as a primary one.
 */
export type DocumentEvidenceLevel =
  | 'official-primary-document'
  | 'official-publication-reference'
  | 'authoritative-secondary-reference'
  | 'unverified';

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
  /** See `DocumentEvidenceLevel` — required whenever `verificationStatus: 'verified'` (see
   * catalogValidation.ts); a research-needed entry may omit it or set 'unverified'. */
  evidenceLevel?: DocumentEvidenceLevel;
  note?: string;
}
