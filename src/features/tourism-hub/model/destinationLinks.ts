import type { PlanningDocument } from '../../../data/planningCitations';
import type { CatalogRow } from '../../investment-catalog/model/catalogModel';

export interface UnitLinks {
  /** Số dự án thu hút đầu tư nằm trong địa bàn (theo mã đơn vị nguồn nêu). */
  projects: number;
  /** Trong đó dự án lĩnh vực du lịch. */
  tourismProjects: number;
  /** Tổng vốn dự kiến của dự án CÓ số vốn; `undefined` khi không dự án nào có. */
  capitalVnd: number | undefined;
  /** Số hiệu văn bản quy hoạch mà các dự án trong địa bàn trích dẫn. */
  planningDocuments: string[];
}

/**
 * Chuỗi liên kết điểm đến → địa bàn → dự án → quy hoạch → cơ hội đầu tư. Chỉ dựa trên quan hệ có trong
 * dữ liệu (mã địa bàn của dự án, văn bản mà dự án trích dẫn); không suy diễn thêm.
 */
export function buildUnitLinks(
  unitCode: string,
  rows: readonly CatalogRow[],
  documents: readonly PlanningDocument[],
): UnitLinks {
  const inUnit = rows.filter((r) => r.areaCodes.includes(unitCode));
  const ids = new Set(inUnit.map((r) => r.id));
  const withCapital = inUnit.filter((r) => r.capitalVnd !== undefined);
  return {
    projects: inUnit.length,
    tourismProjects: inUnit.filter((r) => r.sector === 'tourism').length,
    capitalVnd: withCapital.length
      ? withCapital.reduce((sum, r) => sum + (r.capitalVnd ?? 0), 0)
      : undefined,
    planningDocuments: documents
      .filter((d) => d.projectIds.some((id) => ids.has(id)))
      .map((d) => d.number),
  };
}
