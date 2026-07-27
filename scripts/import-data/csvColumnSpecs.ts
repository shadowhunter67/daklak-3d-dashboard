/**
 * Canonical CSV column → domain field mapping — Phase 4 importer (ADR 0007). Header CHUẨN duy nhất
 * là các file mẫu trong `data-templates/csv/*.csv` (Phase 3). Alias config (`--header-alias-map`)
 * KHÔNG triển khai ở Phase 4 — xem docs/project-data-import/csv-contract.md "Alias mapping (Phase 5)".
 * Không fuzzy match tên cột theo bất kỳ hình thức nào.
 */
import {
  ISSUE_CATEGORIES,
  ISSUE_SEVERITIES,
  ISSUE_STATUSES,
  MILESTONE_STATUSES,
  PROJECT_PRIORITIES,
  PROJECT_SECTORS,
  PROJECT_STATUSES,
  VERIFICATION_STATUSES,
  DATA_CONFIDENCE_LEVELS,
  WORK_PACKAGE_STATUSES,
} from '../../src/entities/project/types';

export type ColumnKind =
  'string' | 'vnd' | 'percentage' | 'dateOnly' | 'dateTime' | 'boolean' | 'enum' | 'semicolonArray';

export interface ColumnSpec {
  header: string;
  field: string;
  required: boolean;
  kind: ColumnKind;
  enumValues?: readonly string[];
}

export interface CsvDatasetSpec {
  /** logical dataset key — matches CanonicalProjectPortfolioDatasets key. */
  datasetKey: string;
  fileName: string;
  required: boolean;
  columns: readonly ColumnSpec[];
}

const c = (
  header: string,
  field: string,
  required: boolean,
  kind: ColumnKind,
  enumValues?: readonly string[],
): ColumnSpec => ({ header, field, required, kind, enumValues });

export const CSV_DATASET_SPECS: readonly CsvDatasetSpec[] = [
  {
    datasetKey: 'agencies',
    fileName: 'agencies.csv',
    required: false,
    columns: [
      c('id', 'id', true, 'string'),
      c('name', 'name', true, 'string'),
      c('type', 'type', true, 'enum', [
        'managing-authority',
        'line-department',
        'investor',
        'other',
      ]),
      c('source_dataset_id', 'sourceDatasetId', false, 'string'),
      c('data_owner', 'dataOwner', false, 'string'),
    ],
  },
  {
    datasetKey: 'contractors',
    fileName: 'contractors.csv',
    required: false,
    columns: [
      c('id', 'id', true, 'string'),
      c('name', 'name', true, 'string'),
      c('tax_code', 'taxCode', false, 'string'),
      c('source_dataset_id', 'sourceDatasetId', false, 'string'),
      c('data_owner', 'dataOwner', false, 'string'),
    ],
  },
  {
    datasetKey: 'projects',
    fileName: 'projects.csv',
    required: true,
    columns: [
      c('id', 'id', true, 'string'),
      c('code', 'code', true, 'string'),
      c('name', 'name', true, 'string'),
      c('description', 'description', true, 'string'),
      c('sector', 'sector', true, 'enum', PROJECT_SECTORS),
      c('status', 'status', true, 'enum', PROJECT_STATUSES),
      c('priority', 'priority', true, 'enum', PROJECT_PRIORITIES),
      c('managing_authority_id', 'managingAuthorityId', true, 'string'),
      c('investor_id', 'investorId', true, 'string'),
      c('project_manager_id', 'projectManagerId', false, 'string'),
      c('approval_decision', 'approvalDecision', false, 'string'),
      c('start_date', 'startDate', false, 'dateOnly'),
      c('planned_completion_date', 'plannedCompletionDate', false, 'dateOnly'),
      c('forecast_completion_date', 'forecastCompletionDate', false, 'dateOnly'),
      c('actual_completion_date', 'actualCompletionDate', false, 'dateOnly'),
      c('approved_budget_vnd', 'approvedBudget', true, 'vnd'),
      c('adjusted_budget_vnd', 'adjustedBudget', false, 'vnd'),
      c('disbursed_amount_vnd', 'disbursedAmount', true, 'vnd'),
      c('overall_progress_pct', 'overallProgress', true, 'percentage'),
      c('planned_progress_pct', 'plannedProgress', true, 'percentage'),
      c('financial_progress_pct', 'financialProgress', true, 'percentage'),
      c('administrative_area_codes', 'administrativeAreaCodes', true, 'semicolonArray'),
      c('data_updated_at', 'dataUpdatedAt', true, 'dateTime'),
      c('data_owner', 'dataOwner', true, 'string'),
      c('source_dataset_id', 'sourceDatasetId', true, 'string'),
      c('confidence', 'confidence', true, 'enum', DATA_CONFIDENCE_LEVELS),
      c('verification_status', 'verificationStatus', true, 'enum', VERIFICATION_STATUSES),
    ],
  },
  {
    datasetKey: 'workPackages',
    fileName: 'work-packages.csv',
    required: false,
    columns: [
      c('id', 'id', true, 'string'),
      c('project_id', 'projectId', true, 'string'),
      c('code', 'code', true, 'string'),
      c('name', 'name', true, 'string'),
      c('contractor_id', 'contractorId', false, 'string'),
      c('planned_start', 'plannedStart', true, 'dateOnly'),
      c('planned_end', 'plannedEnd', true, 'dateOnly'),
      c('actual_start', 'actualStart', false, 'dateOnly'),
      c('actual_end', 'actualEnd', false, 'dateOnly'),
      c('planned_progress_pct', 'plannedProgress', true, 'percentage'),
      c('actual_progress_pct', 'actualProgress', true, 'percentage'),
      c('budget_vnd', 'budget', true, 'vnd'),
      c('paid_amount_vnd', 'paidAmount', true, 'vnd'),
      c('status', 'status', true, 'enum', WORK_PACKAGE_STATUSES),
      c('source_dataset_id', 'sourceDatasetId', false, 'string'),
      c('source_record_id', 'sourceRecordId', false, 'string'),
      c('observed_at', 'observedAt', false, 'dateTime'),
      c('verification_status', 'verificationStatus', false, 'enum', VERIFICATION_STATUSES),
      c('confidence', 'confidence', false, 'enum', DATA_CONFIDENCE_LEVELS),
      c('data_owner', 'dataOwner', false, 'string'),
    ],
  },
  {
    datasetKey: 'milestones',
    fileName: 'milestones.csv',
    required: false,
    columns: [
      c('id', 'id', true, 'string'),
      c('project_id', 'projectId', true, 'string'),
      c('work_package_id', 'workPackageId', false, 'string'),
      c('name', 'name', true, 'string'),
      c('planned_date', 'plannedDate', true, 'dateOnly'),
      c('forecast_date', 'forecastDate', false, 'dateOnly'),
      c('actual_date', 'actualDate', false, 'dateOnly'),
      c('critical', 'critical', true, 'boolean'),
      c('status', 'status', true, 'enum', MILESTONE_STATUSES),
      c('source_dataset_id', 'sourceDatasetId', false, 'string'),
      c('source_record_id', 'sourceRecordId', false, 'string'),
      c('observed_at', 'observedAt', false, 'dateTime'),
      c('verification_status', 'verificationStatus', false, 'enum', VERIFICATION_STATUSES),
      c('confidence', 'confidence', false, 'enum', DATA_CONFIDENCE_LEVELS),
      c('data_owner', 'dataOwner', false, 'string'),
    ],
  },
  {
    datasetKey: 'projectIssues',
    fileName: 'project-issues.csv',
    required: false,
    columns: [
      c('id', 'id', true, 'string'),
      c('project_id', 'projectId', true, 'string'),
      c('category', 'category', true, 'enum', ISSUE_CATEGORIES),
      c('severity', 'severity', true, 'enum', ISSUE_SEVERITIES),
      c('title', 'title', true, 'string'),
      c('description', 'description', true, 'string'),
      c('owner_agency_id', 'ownerAgencyId', false, 'string'),
      c('owner_user_id', 'ownerUserId', false, 'string'),
      c('opened_at', 'openedAt', true, 'dateTime'),
      c('due_at', 'dueAt', false, 'dateTime'),
      c('resolved_at', 'resolvedAt', false, 'dateTime'),
      c('status', 'status', true, 'enum', ISSUE_STATUSES),
      c('evidence_ids', 'evidenceIds', true, 'semicolonArray'),
      c('source_dataset_id', 'sourceDatasetId', true, 'string'),
      c('verification_status', 'verificationStatus', false, 'enum', VERIFICATION_STATUSES),
      c('confidence', 'confidence', false, 'enum', DATA_CONFIDENCE_LEVELS),
      c('data_owner', 'dataOwner', false, 'string'),
    ],
  },
  {
    datasetKey: 'progressSnapshots',
    fileName: 'progress-snapshots.csv',
    required: false,
    columns: [
      c('project_id', 'projectId', true, 'string'),
      c('observed_at', 'observedAt', true, 'dateTime'),
      c('planned_physical_progress_pct', 'plannedPhysicalProgress', true, 'percentage'),
      c('physical_progress_pct', 'physicalProgress', true, 'percentage'),
      c('financial_progress_pct', 'financialProgress', true, 'percentage'),
      c('disbursed_amount_vnd', 'disbursedAmount', true, 'vnd'),
      c('source_dataset_id', 'sourceDatasetId', true, 'string'),
      c('source_record_id', 'sourceRecordId', true, 'string'),
      c('imported_at', 'importedAt', true, 'dateTime'),
      c('verification_status', 'verificationStatus', true, 'enum', VERIFICATION_STATUSES),
      c('confidence', 'confidence', false, 'enum', DATA_CONFIDENCE_LEVELS),
      c('data_owner', 'dataOwner', false, 'string'),
    ],
  },
  {
    datasetKey: 'evidence',
    fileName: 'evidence.csv',
    required: false,
    columns: [
      c('id', 'id', true, 'string'),
      c('title', 'title', true, 'string'),
      c('kind', 'kind', true, 'enum', ['document', 'photo', 'report', 'measurement', 'other']),
      c('captured_at', 'capturedAt', false, 'dateTime'),
      c('source_dataset_id', 'sourceDatasetId', false, 'string'),
      c('note', 'note', false, 'string'),
      c('data_owner', 'dataOwner', false, 'string'),
    ],
  },
  {
    datasetKey: 'referenceDocuments',
    fileName: 'reference-documents.csv',
    required: false,
    columns: [
      c('id', 'id', true, 'string'),
      c('title', 'title', true, 'string'),
      c('issuing_authority', 'issuingAuthority', true, 'string'),
      c('document_number', 'documentNumber', false, 'string'),
      c('issued_date', 'issuedDate', false, 'dateOnly'),
      c('legal_status', 'legalStatus', true, 'enum', [
        'draft',
        'in-effect',
        'superseded',
        'unknown',
      ]),
      c('source_url', 'sourceUrl', false, 'string'),
      c('source_dataset_id', 'sourceDatasetId', false, 'string'),
      c('verification_status', 'verificationStatus', false, 'enum', VERIFICATION_STATUSES),
    ],
  },
];
