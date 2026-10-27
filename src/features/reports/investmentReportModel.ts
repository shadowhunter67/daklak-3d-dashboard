import type { ResearchedSector } from '../../entities/researched-project/types';
import type { CatalogRow } from '../investment-catalog/model/catalogModel';

export interface BenchmarkRow<K extends string = string> {
  key: K;
  projects: number;
  withCapital: number;
  /** Chỉ cộng dự án có số vốn (thiếu vốn không phải 0). */
  capitalVnd: number;
  /** Trung bình trên dự án có vốn; `undefined` khi không dự án nào có vốn. */
  averageVnd: number | undefined;
}

function accumulate<K extends string>(entries: Iterable<[K, CatalogRow]>): BenchmarkRow<K>[] {
  const map = new Map<K, BenchmarkRow<K>>();
  for (const [key, row] of entries) {
    const item = map.get(key) ?? {
      key,
      projects: 0,
      withCapital: 0,
      capitalVnd: 0,
      averageVnd: undefined,
    };
    item.projects += 1;
    if (row.capitalVnd !== undefined) {
      item.withCapital += 1;
      item.capitalVnd += row.capitalVnd;
    }
    map.set(key, item);
  }
  return [...map.values()]
    .map((item) => ({
      ...item,
      averageVnd: item.withCapital ? item.capitalVnd / item.withCapital : undefined,
    }))
    .sort(
      (a, b) =>
        b.capitalVnd - a.capitalVnd || b.projects - a.projects || a.key.localeCompare(b.key),
    );
}

/** So sánh theo lĩnh vực: chỉ dùng số liệu có trong nguồn (số dự án, vốn dự kiến). */
export function benchmarkBySector(rows: readonly CatalogRow[]): BenchmarkRow<ResearchedSector>[] {
  return accumulate(rows.map((row): [ResearchedSector, CatalogRow] => [row.sector, row]));
}

/** So sánh theo xã/phường. Dự án thuộc nhiều địa bàn được tính cho từng địa bàn; dự án chưa rõ địa
 * bàn không tính vào xã nào (không đoán). */
export function benchmarkByUnit(rows: readonly CatalogRow[], limit: number): BenchmarkRow[] {
  const entries: Array<[string, CatalogRow]> = [];
  for (const row of rows) for (const code of row.areaCodes) entries.push([code, row]);
  return accumulate(entries).slice(0, limit);
}

export type BottleneckId = 'planning' | 'land' | 'procedure' | 'infrastructure';
export interface Bottleneck {
  id: BottleneckId;
  count: number | undefined;
  available: boolean;
}

/** Điểm nghẽn: hiện chỉ "Quy hoạch" suy ra được từ ô quy hoạch của nguồn. Đất đai, thủ tục, hạ tầng
 * chưa có trường dữ liệu tương ứng nên không có số — không ước lượng. */
export function bottleneckSummary(input: { review: number; uncited: number }): Bottleneck[] {
  return [
    { id: 'planning', count: input.review + input.uncited, available: true },
    { id: 'land', count: undefined, available: false },
    { id: 'procedure', count: undefined, available: false },
    { id: 'infrastructure', count: undefined, available: false },
  ];
}

/** Vốn dự kiến gắn với các dự án đang có vấn đề dữ liệu/quy hoạch. Đây là vốn đăng ký trong danh mục,
 * không phải tác động kinh tế. */
export function capitalExposure(input: {
  rows: readonly CatalogRow[];
  flaggedIds: ReadonlySet<string>;
}) {
  let flaggedCapital = 0;
  let flaggedProjects = 0;
  let flaggedWithoutCapital = 0;
  let total = 0;
  for (const row of input.rows) {
    if (row.capitalVnd !== undefined) total += row.capitalVnd;
    if (!input.flaggedIds.has(row.id)) continue;
    flaggedProjects += 1;
    if (row.capitalVnd === undefined) flaggedWithoutCapital += 1;
    else flaggedCapital += row.capitalVnd;
  }
  return {
    flaggedProjects,
    flaggedCapitalVnd: flaggedCapital,
    flaggedWithoutCapital,
    totalCapitalVnd: total,
    shareOfTotal: total > 0 ? flaggedCapital / total : undefined,
  };
}
