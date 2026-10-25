import type { PlanningDocument, PlanningIssuer } from '../../../data/planningCitations';

export interface PlanningFilters {
  query?: string;
  issuer?: PlanningIssuer | '';
}

/** Chỉ đếm theo những gì nguồn nêu; "cần rà soát" = ô quy hoạch tự nêu còn thiếu, không phải kết luận pháp lý. */
export function summarizePlanning(input: {
  documents: readonly PlanningDocument[];
  total: number;
  uncited: readonly string[];
  review: readonly string[];
}) {
  const cited = new Set(input.documents.flatMap((d) => d.projectIds));
  return {
    documents: input.documents.length,
    citedProjects: cited.size,
    uncitedProjects: input.uncited.length,
    reviewProjects: input.review.length,
    total: input.total,
  };
}

export function filterDocuments(
  documents: readonly PlanningDocument[],
  { query, issuer }: PlanningFilters,
): PlanningDocument[] {
  const needle = query?.trim().toLowerCase() ?? '';
  return documents.filter(
    (d) => (!issuer || d.issuer === issuer) && (!needle || d.number.toLowerCase().includes(needle)),
  );
}

export function countByIssuer(
  documents: readonly PlanningDocument[],
): Partial<Record<PlanningIssuer, number>> {
  const counts: Partial<Record<PlanningIssuer, number>> = {};
  for (const d of documents) counts[d.issuer] = (counts[d.issuer] ?? 0) + 1;
  return counts;
}
