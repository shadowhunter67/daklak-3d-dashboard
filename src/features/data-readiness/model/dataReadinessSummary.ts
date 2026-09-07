import type { DataReadinessModel } from './dataReadinessTypes';

export type DataReadinessStatus = 'good' | 'attention' | 'critical';

export interface DataReadinessSummary {
  status: DataReadinessStatus;
  structuralErrorCount: number;
  businessAlertCount: number;
  staleProjectCount: number;
  activeDatasetCount: number;
  completeness: { structuralErrorCount: number; totalRecordCount: number };
  freshness: { staleCount: number; totalCount: number };
  consistency: { duplicateCount: number; unmappedCount: number };
  provenance: { missingCount: number; lowConfidenceCount: number; unverifiedCount: number };
}

/**
 * "SỨC KHỎE DỮ LIỆU" summary (spec §XVI) — deliberately NOT a synthetic "92/100" score: there is
 * no defined, defensible methodology for weighting structural errors vs. staleness vs.
 * provenance gaps into one number, and inventing one would be exactly the kind of fabricated
 * precision this project's own data-trust principle forbids. Instead: a plain 3-level status
 * (Tốt/Cần chú ý/Nghiêm trọng) derived from real counts already computed elsewhere in the
 * pipeline, plus those counts themselves grouped into the four categories the spec asks for.
 */
export function buildDataReadinessSummary(model: DataReadinessModel): DataReadinessSummary {
  const structuralErrorCount = model.validationErrors.length;
  const businessAlertCount = model.businessAlerts.length;
  const hasQualityConcern =
    model.staleProjectCount > 0 ||
    model.duplicateRecordCount > 0 ||
    model.unmappedAdministrativeCodeCount > 0 ||
    model.lowConfidenceProjectCount > 0 ||
    model.unverifiedProjectCount > 0 ||
    model.missingProvenanceChildCount > 0;

  const status: DataReadinessStatus =
    structuralErrorCount > 0 ? 'critical' : hasQualityConcern ? 'attention' : 'good';

  const totalRecordCount =
    model.counts.projects +
    model.counts.workPackages +
    model.counts.milestones +
    model.counts.issues +
    model.counts.progressSnapshots;

  return {
    status,
    structuralErrorCount,
    businessAlertCount,
    staleProjectCount: model.staleProjectCount,
    activeDatasetCount: model.metadata.datasetIds.length,
    completeness: { structuralErrorCount, totalRecordCount },
    freshness: { staleCount: model.staleProjectCount, totalCount: model.counts.projects },
    consistency: {
      duplicateCount: model.duplicateRecordCount,
      unmappedCount: model.unmappedAdministrativeCodeCount,
    },
    provenance: {
      missingCount: model.missingProvenanceChildCount,
      lowConfidenceCount: model.lowConfidenceProjectCount,
      unverifiedCount: model.unverifiedProjectCount,
    },
  };
}
