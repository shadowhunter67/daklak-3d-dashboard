import type { ResearchedSector } from '../../../entities/researched-project/types';
import type { CatalogRow } from '../../investment-catalog/model/catalogModel';

export type BriefingTaskId = 'capital' | 'planning' | 'tourism-photo' | 'unit-photo';

export interface BriefingInput {
  rows: readonly CatalogRow[];
  planningReviewCount: number;
  destinationsWithoutPhoto: number;
  unitsWithoutVerifiedImage: number;
}

/**
 * Tóm tắt điều hành chỉ từ dữ liệu thật của repo: vốn đăng ký trong danh mục QĐ 1985 theo lĩnh vực
 * (không phải vốn giải ngân) và các khoảng trống dữ liệu cần người xử lý. Không có điểm nào ở đây
 * là số minh họa; thiếu dữ liệu thì không có dòng.
 */
export function buildBriefing(input: BriefingInput) {
  const bySector = new Map<ResearchedSector, { capitalVnd: number; projects: number }>();
  let projectsWithCapital = 0;
  for (const row of input.rows) {
    if (row.capitalVnd === undefined) continue;
    projectsWithCapital += 1;
    const entry = bySector.get(row.sector) ?? { capitalVnd: 0, projects: 0 };
    entry.capitalVnd += row.capitalVnd;
    entry.projects += 1;
    bySector.set(row.sector, entry);
  }
  const sectors = [...bySector.entries()]
    .map(([sector, value]) => ({ sector, ...value }))
    .sort((a, b) => b.capitalVnd - a.capitalVnd);
  const projectsWithoutCapital = input.rows.length - projectsWithCapital;
  const queue = (
    [
      ['capital', projectsWithoutCapital],
      ['planning', input.planningReviewCount],
      ['tourism-photo', input.destinationsWithoutPhoto],
      ['unit-photo', input.unitsWithoutVerifiedImage],
    ] as const
  )
    .filter(([, count]) => count > 0)
    .map(([id, count]) => ({ id, count }));
  return {
    sectors,
    totalCapitalVnd: sectors.reduce((sum, s) => sum + s.capitalVnd, 0),
    projectsWithCapital,
    projectsWithoutCapital,
    queue,
  };
}
