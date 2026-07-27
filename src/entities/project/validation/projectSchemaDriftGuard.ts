/**
 * Hand-written TypeScript mirror của `data-templates/schemas/{project-portfolio-bundle,definitions/*}.schema.json`
 * — Phase 3, cùng pattern `src/data-platform/validation/schemaDriftGuard.ts`. Đây là Layer 1
 * (transport/structural) CHỈ: required field có mặt, enum hợp lệ, không phải Layer 2 (semantic —
 * ngày trước/sau, ngân sách vượt trần...) hay Layer 3 (cross-record — FK, trùng khoá, stale). Layer
 * 2/3 đã có `validateProject.ts`/`dataQualityRules.ts` riêng, không lặp lại ở đây.
 *
 * Enum lấy TRỰC TIẾP từ `types.ts` (không copy tay giá trị) — nếu `types.ts` đổi một enum mà JSON
 * Schema (copy tay) không đổi theo, fixture enum-mismatch trong
 * `projectSchemaDriftGuard.test.ts` sẽ lộ ra ngay (TS mirror và Ajv bất đồng), đúng mục tiêu "phát
 * hiện enum drift tự động".
 */
import {
  DATA_CONFIDENCE_LEVELS,
  GEOMETRY_SOURCES,
  ISSUE_CATEGORIES,
  ISSUE_SEVERITIES,
  ISSUE_STATUSES,
  MILESTONE_STATUSES,
  PROJECT_PRIORITIES,
  PROJECT_SECTORS,
  PROJECT_STATUSES,
  VERIFICATION_STATUSES,
  WORK_PACKAGE_STATUSES,
} from '../types';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

interface ShapeSpec {
  requiredFields: readonly string[];
  enumFields?: Record<string, readonly string[]>;
}

function checkShape(candidate: unknown, spec: ShapeSpec): string[] {
  if (!isPlainObject(candidate)) return ['not an object'];
  const issues: string[] = [];
  for (const field of spec.requiredFields) {
    if (!(field in candidate)) issues.push(`missing required field '${field}'`);
  }
  if (spec.enumFields) {
    for (const [field, allowed] of Object.entries(spec.enumFields)) {
      if (field in candidate && !allowed.includes(candidate[field] as string)) {
        issues.push(`field '${field}' has invalid enum value: ${String(candidate[field])}`);
      }
    }
  }
  return issues;
}

const AGENCY_SPEC: ShapeSpec = {
  requiredFields: ['id', 'name', 'type'],
  enumFields: { type: ['managing-authority', 'line-department', 'investor', 'other'] },
};
export function validateAgencyShape(candidate: unknown): string[] {
  return checkShape(candidate, AGENCY_SPEC);
}

const CONTRACTOR_SPEC: ShapeSpec = { requiredFields: ['id', 'name'] };
export function validateContractorShape(candidate: unknown): string[] {
  return checkShape(candidate, CONTRACTOR_SPEC);
}

const PROJECT_SPEC: ShapeSpec = {
  requiredFields: [
    'id',
    'code',
    'name',
    'description',
    'sector',
    'status',
    'priority',
    'managingAuthorityId',
    'investorId',
    'approvedBudget',
    'disbursedAmount',
    'overallProgress',
    'plannedProgress',
    'financialProgress',
    'administrativeAreaCodes',
    'dataUpdatedAt',
    'dataOwner',
    'sourceDatasetId',
    'confidence',
    'verificationStatus',
  ],
  enumFields: {
    sector: PROJECT_SECTORS,
    status: PROJECT_STATUSES,
    priority: PROJECT_PRIORITIES,
    confidence: DATA_CONFIDENCE_LEVELS,
    verificationStatus: VERIFICATION_STATUSES,
  },
};
export function validateProjectShape(candidate: unknown): string[] {
  const issues = checkShape(candidate, PROJECT_SPEC);
  if (isPlainObject(candidate) && isPlainObject(candidate.geometryMetadata)) {
    const meta = candidate.geometryMetadata;
    if (
      'source' in meta &&
      !(GEOMETRY_SOURCES as readonly string[]).includes(meta.source as string)
    )
      issues.push(`field 'geometryMetadata.source' has invalid enum value: ${String(meta.source)}`);
    if (
      'confidence' in meta &&
      !(DATA_CONFIDENCE_LEVELS as readonly string[]).includes(meta.confidence as string)
    )
      issues.push(
        `field 'geometryMetadata.confidence' has invalid enum value: ${String(meta.confidence)}`,
      );
  }
  return issues;
}

const WORK_PACKAGE_SPEC: ShapeSpec = {
  requiredFields: [
    'id',
    'projectId',
    'code',
    'name',
    'plannedStart',
    'plannedEnd',
    'plannedProgress',
    'actualProgress',
    'budget',
    'paidAmount',
    'status',
  ],
  enumFields: { status: WORK_PACKAGE_STATUSES },
};
export function validateWorkPackageShape(candidate: unknown): string[] {
  return checkShape(candidate, WORK_PACKAGE_SPEC);
}

const MILESTONE_SPEC: ShapeSpec = {
  requiredFields: ['id', 'projectId', 'name', 'plannedDate', 'critical', 'status'],
  enumFields: { status: MILESTONE_STATUSES },
};
export function validateMilestoneShape(candidate: unknown): string[] {
  return checkShape(candidate, MILESTONE_SPEC);
}

const PROJECT_ISSUE_SPEC: ShapeSpec = {
  requiredFields: [
    'id',
    'projectId',
    'category',
    'severity',
    'title',
    'description',
    'openedAt',
    'status',
    'evidenceIds',
    'sourceDatasetId',
  ],
  enumFields: {
    category: ISSUE_CATEGORIES,
    severity: ISSUE_SEVERITIES,
    status: ISSUE_STATUSES,
  },
};
export function validateProjectIssueShape(candidate: unknown): string[] {
  return checkShape(candidate, PROJECT_ISSUE_SPEC);
}

const PROGRESS_SNAPSHOT_SPEC: ShapeSpec = {
  requiredFields: [
    'projectId',
    'observedAt',
    'plannedPhysicalProgress',
    'physicalProgress',
    'financialProgress',
    'disbursedAmount',
    'sourceDatasetId',
    'sourceRecordId',
    'importedAt',
    'verificationStatus',
  ],
  enumFields: { verificationStatus: VERIFICATION_STATUSES },
};
export function validateProgressSnapshotShape(candidate: unknown): string[] {
  return checkShape(candidate, PROGRESS_SNAPSHOT_SPEC);
}

const EVIDENCE_SPEC: ShapeSpec = {
  requiredFields: ['id', 'title', 'kind'],
  enumFields: { kind: ['document', 'photo', 'report', 'measurement', 'other'] },
};
export function validateEvidenceShape(candidate: unknown): string[] {
  return checkShape(candidate, EVIDENCE_SPEC);
}

const REFERENCE_DOCUMENT_SPEC: ShapeSpec = {
  requiredFields: ['id', 'title', 'issuingAuthority', 'legalStatus'],
  enumFields: { legalStatus: ['draft', 'in-effect', 'superseded', 'unknown'] },
};
export function validateReferenceDocumentShape(candidate: unknown): string[] {
  return checkShape(candidate, REFERENCE_DOCUMENT_SPEC);
}

const PROJECT_AUDIT_EVENT_SPEC: ShapeSpec = {
  requiredFields: ['eventId', 'eventType', 'action', 'result', 'requestId', 'occurredAt'],
  enumFields: { result: ['success', 'denied', 'error'] },
};
export function validateProjectAuditEventShape(candidate: unknown): string[] {
  return checkShape(candidate, PROJECT_AUDIT_EVENT_SPEC);
}

const BUNDLE_SPEC: ShapeSpec = {
  requiredFields: ['schemaVersion', 'bundleVersion', 'metadata', 'datasets'],
};
const BUNDLE_METADATA_SPEC: ShapeSpec = {
  requiredFields: [
    'generatedAt',
    'asOf',
    'sourceDatasetIds',
    'administrativeCodeVersion',
    'classification',
    'producer',
  ],
  enumFields: { classification: ['public', 'internal', 'confidential', 'restricted'] },
};
const BUNDLE_DATASETS_SPEC: ShapeSpec = {
  requiredFields: [
    'agencies',
    'contractors',
    'projects',
    'workPackages',
    'milestones',
    'projectIssues',
    'progressSnapshots',
    'evidence',
    'referenceDocuments',
  ],
};

export function validateProjectPortfolioBundleShape(candidate: unknown): string[] {
  const issues = checkShape(candidate, BUNDLE_SPEC);
  if (!isPlainObject(candidate)) return issues;
  if (isPlainObject(candidate.metadata)) {
    issues.push(
      ...checkShape(candidate.metadata, BUNDLE_METADATA_SPEC).map((e) => `metadata.${e}`),
    );
  }
  if (isPlainObject(candidate.datasets)) {
    issues.push(
      ...checkShape(candidate.datasets, BUNDLE_DATASETS_SPEC).map((e) => `datasets.${e}`),
    );
  }
  return issues;
}

/**
 * Registry dùng bởi `projectSchemaDriftGuard.test.ts` để sinh mutation test (required-field-missing,
 * enum-mismatch) TỰ ĐỘNG cho mỗi entity thay vì viết tay hàng chục fixture invalid — xem rule
 * "Không tạo hàng trăm fixture file thủ công nếu có thể generate mutation cases trong test".
 * `schemaFile`/`fixtureFile` trỏ đúng tên file tương ứng dưới data-templates/schemas/definitions/ và
 * data-templates/fixtures/project-domain/valid/.
 */
export const PROJECT_DOMAIN_SHAPE_REGISTRY = {
  agency: {
    spec: AGENCY_SPEC,
    validate: validateAgencyShape,
    schemaFile: 'agency.schema.json',
    fixtureFile: 'agency.json',
  },
  contractor: {
    spec: CONTRACTOR_SPEC,
    validate: validateContractorShape,
    schemaFile: 'contractor.schema.json',
    fixtureFile: 'contractor.json',
  },
  project: {
    spec: PROJECT_SPEC,
    validate: validateProjectShape,
    schemaFile: 'project.schema.json',
    fixtureFile: 'project.json',
  },
  workPackage: {
    spec: WORK_PACKAGE_SPEC,
    validate: validateWorkPackageShape,
    schemaFile: 'work-package.schema.json',
    fixtureFile: 'work-package.json',
  },
  milestone: {
    spec: MILESTONE_SPEC,
    validate: validateMilestoneShape,
    schemaFile: 'milestone.schema.json',
    fixtureFile: 'milestone.json',
  },
  projectIssue: {
    spec: PROJECT_ISSUE_SPEC,
    validate: validateProjectIssueShape,
    schemaFile: 'project-issue.schema.json',
    fixtureFile: 'project-issue.json',
  },
  progressSnapshot: {
    spec: PROGRESS_SNAPSHOT_SPEC,
    validate: validateProgressSnapshotShape,
    schemaFile: 'progress-snapshot.schema.json',
    fixtureFile: 'progress-snapshot.json',
  },
  evidence: {
    spec: EVIDENCE_SPEC,
    validate: validateEvidenceShape,
    schemaFile: 'evidence.schema.json',
    fixtureFile: 'evidence.json',
  },
  referenceDocument: {
    spec: REFERENCE_DOCUMENT_SPEC,
    validate: validateReferenceDocumentShape,
    schemaFile: 'reference-document.schema.json',
    fixtureFile: 'reference-document.json',
  },
  projectAuditEvent: {
    spec: PROJECT_AUDIT_EVENT_SPEC,
    validate: validateProjectAuditEventShape,
    schemaFile: 'project-audit-event.schema.json',
    fixtureFile: 'project-audit-event.json',
  },
} as const;
