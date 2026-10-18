import type { DataConfidence } from '../../../entities/project/types';
import type { DataHealthSummary } from './executiveOverviewTypes';

export interface DataHealthMetric {
  key: 'completeness' | 'freshness' | 'consistency' | 'traceability';
  value: number;
}

export interface DataHealthScore {
  score: number;
  metrics: DataHealthMetric[];
}

/** Computes only metrics that can be proven from the imported quality summary. */
export function calculateDataHealthScore(data: DataHealthSummary): DataHealthScore {
  const total = Math.max(data.totalProjects, 0);
  const denominator = Math.max(total, 1);
  const metrics: DataHealthMetric[] = [
    { key: 'completeness', value: total ? data.validProjects / total : 0 },
    { key: 'freshness', value: total ? (total - data.staleProjectCount) / total : 0 },
    {
      key: 'consistency',
      value:
        1 -
        Math.min(
          1,
          (data.duplicateRecordCount + data.unmappedAdministrativeCodeCount) / denominator,
        ),
    },
  ];

  const confidence: Record<DataConfidence, number> = data.confidenceBreakdown;
  const knownConfidence = Object.entries(confidence).reduce(
    (sum, [level, count]) => (level === 'low' || level === 'unknown' ? sum : sum + count),
    0,
  );
  const confidenceTotal = Object.values(confidence).reduce((sum, count) => sum + count, 0);
  if (confidenceTotal > 0) {
    metrics.push({ key: 'traceability', value: knownConfidence / confidenceTotal });
  }

  return {
    metrics,
    score: Math.round(
      (metrics.reduce((sum, metric) => sum + metric.value, 0) / metrics.length) * 100,
    ),
  };
}
