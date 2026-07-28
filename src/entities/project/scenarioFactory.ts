/**
 * Deterministic scenario builder cho dữ liệu minh hoạ — Phase 5 §B1 (docs/adr/0008-*.md). Không
 * dùng `Math.random()`/`Date.now()` — mọi giá trị caller không cung cấp đều là hằng số cố định, để
 * hai lần gọi cùng input luôn cho cùng output. KHÔNG dùng để sinh dữ liệu tại browser runtime — chỉ
 * gọi tại thời điểm viết mã nguồn (`illustrativeScenarioAdditions.ts`), kết quả là literal xuất ra,
 * giống cách 9 project gốc trong `illustrativeProjectPortfolio.ts` được viết tay.
 *
 * KHÔNG dùng importer production (`scripts/import-data/`) để sinh illustrative source — factory này
 * độc lập hoàn toàn, chỉ tạo `ProjectBundle` literal cho domain, không đi qua CSV/JSON transport.
 */
import type {
  DataConfidence,
  ProjectBundle,
  ProjectGeometry,
  ProjectGeometryMetadata,
  ProjectPriority,
  ProjectSector,
  ProjectStatus,
  VerificationStatus,
} from './types';

export interface ScenarioProjectInput {
  id: string;
  code: string;
  name: string;
  description: string;
  sector: ProjectSector;
  status: ProjectStatus;
  priority?: ProjectPriority;
  managingAuthorityId: string;
  investorId: string;
  administrativeAreaCodes: string[];
  geometry?: ProjectGeometry;
  geometryMetadata?: ProjectGeometryMetadata;
  approvedBudget: number;
  adjustedBudget?: number;
  disbursedAmount: number;
  overallProgress: number;
  plannedProgress: number;
  financialProgress: number;
  forecastCompletionDate?: string;
  dataUpdatedAt: string;
  dataOwner: string;
  sourceDatasetId: string;
  confidence?: DataConfidence;
  verificationStatus?: VerificationStatus;
}

/** Điền sẵn default cho các field domain không phải trọng tâm của scenario (priority/confidence/
 * verificationStatus) — caller chỉ cần khai báo field liên quan tới scenario đang minh hoạ. */
export function buildScenarioProject(input: ScenarioProjectInput): ProjectBundle['project'] {
  return {
    id: input.id,
    code: input.code,
    name: input.name,
    description: input.description,
    sector: input.sector,
    status: input.status,
    priority: input.priority ?? 'medium',
    managingAuthorityId: input.managingAuthorityId,
    investorId: input.investorId,
    administrativeAreaCodes: input.administrativeAreaCodes,
    geometry: input.geometry,
    geometryMetadata: input.geometryMetadata,
    approvedBudget: input.approvedBudget,
    adjustedBudget: input.adjustedBudget,
    disbursedAmount: input.disbursedAmount,
    overallProgress: input.overallProgress,
    plannedProgress: input.plannedProgress,
    financialProgress: input.financialProgress,
    forecastCompletionDate: input.forecastCompletionDate,
    dataUpdatedAt: input.dataUpdatedAt,
    dataOwner: input.dataOwner,
    sourceDatasetId: input.sourceDatasetId,
    confidence: input.confidence ?? 'medium',
    verificationStatus: input.verificationStatus ?? 'submitted',
  };
}

export function buildScenarioBundle(
  project: ScenarioProjectInput,
  extras: Partial<Omit<ProjectBundle, 'project'>> = {},
): ProjectBundle {
  return {
    project: buildScenarioProject(project),
    workPackages: extras.workPackages ?? [],
    milestones: extras.milestones ?? [],
    issues: extras.issues ?? [],
    progressSnapshots: extras.progressSnapshots ?? [],
  };
}
