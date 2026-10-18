/**
 * Domain "dự án đã nghiên cứu từ nguồn công khai" — tách khỏi `src/entities/project/` (dự án minh
 * họa/vận hành) và `src/entities/investment-opportunity/`. Lý do: bản ghi thật thường chỉ biết một
 * phần trường; `Project` bắt buộc ngân sách/tiến độ nên không thể chứa dữ liệu "chưa biết" mà không
 * bịa số. Ở đây MỌI trường đều tuỳ chọn và có bằng chứng riêng (field-level provenance); thiếu
 * nghĩa là "Chưa có dữ liệu", không bao giờ là 0 hay giá trị ước lượng.
 *
 * Domain này không import GIS asset/UI (cùng import-boundary với `entities/project`): mã đơn vị
 * hành chính hợp lệ được truyền vào validator qua `ReadonlySet<string>`.
 */
import type { DataConfidence } from '../project/types';

export const SOURCE_TYPES = [
  'official-legal-document',
  'official-agency-dataset',
  'official-publication',
  'verified-open-data',
  'derived',
  'secondary-news',
] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

/** Nguồn chính thống = văn bản pháp lý hoặc dữ liệu/ấn phẩm của cơ quan nhà nước. */
export const OFFICIAL_SOURCE_TYPES: readonly SourceType[] = [
  'official-legal-document',
  'official-agency-dataset',
  'official-publication',
];

export interface SourceRecord {
  id: string;
  title: string;
  organization: string;
  url: string;
  documentNumber?: string;
  sourceType: SourceType;
  publishedAt?: string;
  retrievedAt: string;
  jurisdiction?: string;
  /** SHA-256 của snapshot đã lưu (nếu có lưu), để kiểm chứng lại khi nguồn bị sửa. */
  checksum?: string;
  knownLimitations?: string;
  usageNotes?: string;
}

/** Mức bằng chứng của MỘT quan sát — không phải của cả dự án. */
export const EVIDENCE_LEVELS = [
  'official',
  'verified-open-data',
  'derived',
  'illustrative',
  'unknown',
] as const;
export type EvidenceLevel = (typeof EVIDENCE_LEVELS)[number];

export interface FieldObservation<T> {
  value: T;
  sourceId: string;
  /** Thời điểm nguồn nói giá trị này đúng ("thông tin cập nhật đến..."), không phải ngày tải. */
  observedAt: string;
  confidence: DataConfidence;
  status: EvidenceLevel;
}

export const PROJECT_LIFECYCLES = [
  'investment-attraction',
  'proposal',
  'approved-policy',
  'investor-selection',
  'preparation',
  'procurement',
  'construction',
  'operational',
  'completed',
  'suspended',
  'cancelled',
  'unknown',
] as const;
export type ProjectLifecycle = (typeof PROJECT_LIFECYCLES)[number];

export const RESEARCHED_SECTORS = [
  'transport',
  'energy',
  'irrigation',
  'health',
  'education',
  'urban',
  'housing',
  'industrial',
  'agriculture',
  'tourism',
  'digital-government',
  'environment',
  'other',
] as const;
export type ResearchedSector = (typeof RESEARCHED_SECTORS)[number];

export const LOCATION_ACCURACIES = [
  'administrative-centroid',
  'approximate',
  'official-coordinate',
  'verified',
] as const;
export type LocationAccuracy = (typeof LOCATION_ACCURACIES)[number];

export const VERIFICATION_METHODS = [
  'administrative-centroid',
  'official-document',
  'osm-nominatim',
  'existing-geometry',
  'planning-document',
  'map-imagery',
] as const;
export type VerificationMethod = (typeof VERIFICATION_METHODS)[number];

export interface ResearchedLocation {
  /** [kinh độ, vĩ độ], WGS84. */
  coordinates: [number, number];
  accuracy: LocationAccuracy;
  sourceId: string;
  verificationMethods: VerificationMethod[];
  note?: string;
}

/** Giá trị từng trường có thể có lịch sử quan sát. Tiền tệ: VND, số nguyên. */
export interface ResearchedFieldValues {
  totalInvestment: number;
  adjustedInvestment: number;
  disbursement: number;
  /** 0–100, khối lượng thực hiện. */
  progress: number;
  investor: string;
  owner: string;
  managementAgency: string;
  plannedStart: string;
  plannedCompletion: string;
  approvalDocument: string;
  operationalStatus: string;
}
export type ResearchedFieldKey = keyof ResearchedFieldValues;

export type ResearchedFields = {
  [K in ResearchedFieldKey]?: FieldObservation<ResearchedFieldValues[K]>[];
};

/** Mức độ hoàn thiện kiểm chứng của cả bản ghi — chỉ để hiển thị/lọc, không thay cho bằng chứng. */
export type ResearchVerification = 'verified' | 'partial' | 'incomplete';

export interface ResearchedProject {
  id: string;
  name: string;
  lifecycle: FieldObservation<ProjectLifecycle>;
  sector: ResearchedSector;
  /** Rỗng nghĩa là chưa biết địa bàn — không đoán. */
  administrativeAreaCodes: string[];
  location?: ResearchedLocation;
  fields: ResearchedFields;
  verification: ResearchVerification;
  /** Id trong `config/media-sources.json`; vắng nghĩa là dùng ảnh thay thế có nhãn "Minh hoạ". */
  mediaId?: string;
  /** Ghi chú nghiên cứu hiển thị cho người đọc (ví dụ địa danh chưa khớp được đơn vị hành chính). */
  notes?: string[];
}

export interface ResearchedDataset {
  schemaVersion: 1;
  generatedAt: string;
  sources: SourceRecord[];
  projects: ResearchedProject[];
}

export interface ResearchValidationContext {
  validAdministrativeCodes: ReadonlySet<string>;
  /** ISO — thời điểm đánh giá "cũ"; truyền vào để test tất định. */
  now: string;
}

export interface ResearchIssue {
  rule: string;
  projectId?: string;
  severity: 'error' | 'warning';
  message: string;
}
