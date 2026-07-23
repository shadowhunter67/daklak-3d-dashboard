/**
 * Domain model cho "nền tảng điều hành dự án trọng điểm" — xem
 * docs/adr/0001-project-centric-domain.md. Project là entity trung tâm; ward
 * (`administrativeAreaCodes`) chỉ còn là thuộc tính/bộ lọc không gian, không phải điểm neo domain.
 *
 * Đây là type/shape thuần TypeScript, tách biệt hoàn toàn với `src/data-platform/schemas/dataset.ts`
 * (mô tả *nguồn dữ liệu*, không phải *đối tượng nghiệp vụ*) — hai domain khác nhau, không tái dùng
 * enum của nhau dù có vẻ giống nhau bề mặt (ví dụ `VerificationStatus` ở đây khác
 * `PublicationStatus`/`QualityStatus` bên data-platform).
 */

// ---------------------------------------------------------------------------------------------
// Status taxonomy — chuỗi tuỳ ý không được chấp nhận ở bất kỳ đâu trong domain này.
// ---------------------------------------------------------------------------------------------

export const PROJECT_STATUSES = [
  'proposed',
  'preparing',
  'approved',
  'procurement',
  'active',
  'at-risk',
  'delayed',
  'suspended',
  'completed',
  'cancelled',
  'unknown',
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const WORK_PACKAGE_STATUSES = [
  'planned',
  'procurement',
  'active',
  'at-risk',
  'delayed',
  'suspended',
  'completed',
  'cancelled',
  'unknown',
] as const;
export type WorkPackageStatus = (typeof WORK_PACKAGE_STATUSES)[number];

export const MILESTONE_STATUSES = [
  'planned',
  'on-track',
  'at-risk',
  'delayed',
  'achieved',
  'cancelled',
  'unknown',
] as const;
export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];

export const ISSUE_STATUSES = [
  'open',
  'acknowledged',
  'in-progress',
  'blocked',
  'resolved',
  'closed',
] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

export const ISSUE_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
export type IssueSeverity = (typeof ISSUE_SEVERITIES)[number];

export const ISSUE_CATEGORIES = [
  'land-clearance',
  'procurement',
  'design',
  'financing',
  'contractor-performance',
  'permitting',
  'environment',
  'social',
  'technical',
  'other',
] as const;
export type IssueCategory = (typeof ISSUE_CATEGORIES)[number];

export const VERIFICATION_STATUSES = [
  'raw',
  'validated-automatically',
  'submitted',
  'reviewed',
  'approved',
  'rejected',
  'superseded',
] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const DATA_CONFIDENCE_LEVELS = ['verified', 'high', 'medium', 'low', 'unknown'] as const;
export type DataConfidence = (typeof DATA_CONFIDENCE_LEVELS)[number];

export const PROJECT_SECTORS = [
  'transport',
  'energy',
  'irrigation',
  'health',
  'education',
  'urban-development',
  'digital-transformation',
] as const;
export type ProjectSector = (typeof PROJECT_SECTORS)[number];

export const PROJECT_PRIORITIES = ['critical', 'high', 'medium', 'low'] as const;
export type ProjectPriority = (typeof PROJECT_PRIORITIES)[number];

// ---------------------------------------------------------------------------------------------
// Geometry — điểm đại diện hoặc polygon dự án, độc lập với polygon ranh giới ward.
// ---------------------------------------------------------------------------------------------

export interface ProjectPointGeometry {
  type: 'Point';
  /** [longitude, latitude], WGS84 — cùng hệ toạ độ với các artifact GIS còn lại trong repo. */
  coordinates: [number, number];
}

export interface ProjectPolygonGeometry {
  type: 'Polygon';
  coordinates: [number, number][][];
}

export type ProjectGeometry = ProjectPointGeometry | ProjectPolygonGeometry;

// ---------------------------------------------------------------------------------------------
// Supporting entities
// ---------------------------------------------------------------------------------------------

export interface Agency {
  id: string;
  name: string;
  type: 'managing-authority' | 'line-department' | 'investor' | 'other';
}

export interface Contractor {
  id: string;
  name: string;
  taxCode?: string;
}

export interface Evidence {
  id: string;
  title: string;
  /** Loại bằng chứng — ảnh hiện trường, biên bản nghiệm thu, văn bản, v.v. */
  kind: 'document' | 'photo' | 'report' | 'measurement' | 'other';
  capturedAt?: string;
  sourceDatasetId?: string;
  note?: string;
}

export type ReferenceDocumentLegalStatus = 'draft' | 'in-effect' | 'superseded' | 'unknown';

export interface ReferenceDocument {
  id: string;
  title: string;
  issuingAuthority: string;
  documentNumber?: string;
  issuedDate?: string;
  legalStatus: ReferenceDocumentLegalStatus;
  sourceUrl?: string;
}

export interface DataQualityIssue {
  id: string;
  /** Loại record bị ảnh hưởng — dùng để nhóm trong UI data-quality. */
  entityType: 'project' | 'workPackage' | 'milestone' | 'issue' | 'progressSnapshot';
  entityId: string;
  rule: string;
  message: string;
  severity: 'error' | 'warning';
}

export type AuditAction =
  | 'dataset_view'
  | 'dataset_export'
  | 'project_update'
  | 'progress_submission'
  | 'progress_approval'
  | 'issue_update'
  | 'restricted_layer_enable'
  | 'access_denied';

/**
 * Bản mở rộng của `AuditEvent` trong `data-platform/schemas/policy.ts` cho domain dự án — không
 * thay thế contract cũ, chỉ thêm field domain-dự-án cần. Không có emitter thật trong repo này (xem
 * docs/deployment-profiles.md); frontend chỉ tạo `requestId`/context, backend là nguồn có thẩm
 * quyền. TUYỆT ĐỐI không ghi PII hoặc response body vào `note`.
 */
export interface ProjectAuditEvent {
  eventId: string;
  eventType: AuditAction;
  actorId?: string;
  actorAgencyId?: string;
  datasetId?: string;
  projectId?: string;
  resourceType?: string;
  resourceId?: string;
  action: AuditAction;
  result: 'success' | 'denied' | 'error';
  requestId: string;
  occurredAt: string;
  purpose?: string;
  note?: string;
}

// ---------------------------------------------------------------------------------------------
// Core entities
// ---------------------------------------------------------------------------------------------

export interface Project {
  id: string;
  code: string;
  name: string;
  description: string;
  sector: ProjectSector;
  status: ProjectStatus;
  priority: ProjectPriority;
  managingAuthorityId: string;
  investorId: string;
  projectManagerId?: string;
  approvalDecision?: string;
  startDate?: string;
  plannedCompletionDate?: string;
  forecastCompletionDate?: string;
  actualCompletionDate?: string;
  approvedBudget: number;
  adjustedBudget?: number;
  disbursedAmount: number;
  /** 0-100, tiến độ tổng thể (khối lượng thực tế). */
  overallProgress: number;
  /** 0-100, tiến độ theo kế hoạch tại thời điểm hiện tại. */
  plannedProgress: number;
  /** 0-100, tiến độ giải ngân (thường khác tiến độ khối lượng). */
  financialProgress: number;
  administrativeAreaCodes: string[];
  geometry?: ProjectGeometry;
  dataUpdatedAt: string;
  dataOwner: string;
  sourceDatasetId: string;
  confidence: DataConfidence;
  verificationStatus: VerificationStatus;
}

export interface WorkPackage {
  id: string;
  projectId: string;
  code: string;
  name: string;
  contractorId?: string;
  plannedStart: string;
  plannedEnd: string;
  actualStart?: string;
  actualEnd?: string;
  plannedProgress: number;
  actualProgress: number;
  budget: number;
  paidAmount: number;
  status: WorkPackageStatus;
}

export interface Milestone {
  id: string;
  projectId: string;
  workPackageId?: string;
  name: string;
  plannedDate: string;
  forecastDate?: string;
  actualDate?: string;
  critical: boolean;
  status: MilestoneStatus;
}

export interface ProjectIssue {
  id: string;
  projectId: string;
  category: IssueCategory;
  severity: IssueSeverity;
  title: string;
  description: string;
  ownerAgencyId?: string;
  ownerUserId?: string;
  openedAt: string;
  dueAt?: string;
  resolvedAt?: string;
  status: IssueStatus;
  relatedGeometry?: ProjectGeometry;
  evidenceIds: string[];
}

export interface ProgressSnapshot {
  projectId: string;
  observedAt: string;
  plannedPhysicalProgress: number;
  physicalProgress: number;
  financialProgress: number;
  disbursedAmount: number;
  sourceDatasetId: string;
  sourceRecordId: string;
  importedAt: string;
  verificationStatus: VerificationStatus;
}

/**
 * Tập dữ liệu đầy đủ cho một dự án — hình dạng dùng bởi fixture, KPI utility và data-quality
 * summary. Không phải một entity riêng, chỉ là cách gom các entity liên quan tới một `Project`.
 */
export interface ProjectBundle {
  project: Project;
  workPackages: WorkPackage[];
  milestones: Milestone[];
  issues: ProjectIssue[];
  progressSnapshots: ProgressSnapshot[];
}
