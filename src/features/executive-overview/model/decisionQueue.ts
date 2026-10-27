import type { CatalogRow } from '../../investment-catalog/model/catalogModel';

export type DecisionKind =
  'planning-review' | 'planning-uncited' | 'capital-missing' | 'location-unknown';
export type DecisionPriority = 'high' | 'medium';

export interface DecisionItem {
  projectId: string;
  name: string;
  kind: DecisionKind;
  priority: DecisionPriority;
  areaCodes: string[];
  /** VND; `undefined` nghĩa là nguồn không có số vốn — không phải 0. */
  capitalVnd: number | undefined;
  /** Số hiệu văn bản nguồn của dự án; vắng nghĩa là chưa có. */
  source: string | undefined;
}

/**
 * Loại vấn đề theo mức nghiêm trọng giảm dần. Mức ưu tiên chỉ phản ánh loại vấn đề (một ô quy hoạch
 * tự nêu còn thiếu là cao nhất), không suy ra từ dữ liệu không có: nguồn không có chủ trách nhiệm,
 * hạn xử lý hay số ngày tồn tại nên hàng chờ không có các trường đó.
 */
const KIND_ORDER: readonly DecisionKind[] = [
  'planning-review',
  'planning-uncited',
  'capital-missing',
  'location-unknown',
];
const PRIORITY: Record<DecisionKind, DecisionPriority> = {
  'planning-review': 'high',
  'planning-uncited': 'medium',
  'capital-missing': 'medium',
  'location-unknown': 'medium',
};

export function buildDecisionQueue(input: {
  rows: readonly CatalogRow[];
  /** Id dự án mà chính ô quy hoạch của nguồn nêu còn thiếu. */
  reviewIds: ReadonlySet<string>;
  /** Id dự án không nêu số hiệu văn bản quy hoạch nào. */
  uncitedIds: ReadonlySet<string>;
}): DecisionItem[] {
  const items: DecisionItem[] = [];
  for (const row of input.rows) {
    const kinds: DecisionKind[] = [];
    if (input.reviewIds.has(row.id)) kinds.push('planning-review');
    if (input.uncitedIds.has(row.id)) kinds.push('planning-uncited');
    if (row.capitalVnd === undefined) kinds.push('capital-missing');
    if (row.areaCodes.length === 0) kinds.push('location-unknown');
    const kind = KIND_ORDER.find((k) => kinds.includes(k));
    if (!kind) continue;
    items.push({
      projectId: row.id,
      name: row.name,
      kind,
      priority: PRIORITY[kind],
      areaCodes: row.areaCodes,
      capitalVnd: row.capitalVnd,
      source: row.documentNumber,
    });
  }
  const rank = (p: DecisionPriority) => (p === 'high' ? 0 : 1);
  return items.sort(
    (a, b) =>
      rank(a.priority) - rank(b.priority) ||
      KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) ||
      (b.capitalVnd ?? -1) - (a.capitalVnd ?? -1) ||
      a.name.localeCompare(b.name, 'vi'),
  );
}

export function countByKind(items: readonly DecisionItem[]): Record<DecisionKind, number> {
  const counts: Record<DecisionKind, number> = {
    'planning-review': 0,
    'planning-uncited': 0,
    'capital-missing': 0,
    'location-unknown': 0,
  };
  for (const item of items) counts[item.kind] += 1;
  return counts;
}
