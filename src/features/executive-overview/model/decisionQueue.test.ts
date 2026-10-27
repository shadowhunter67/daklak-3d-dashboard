import { describe, expect, it } from 'vitest';
import type { CatalogRow } from '../../investment-catalog/model/catalogModel';
import { buildDecisionQueue } from './decisionQueue';

const row = (id: string, over: Partial<CatalogRow> = {}): CatalogRow => ({
  id,
  name: `Dự án ${id}`,
  sector: 'energy',
  areaCodes: ['24235'],
  capitalVnd: 1e12,
  locationAccuracy: 'approximate',
  hasLocation: true,
  notes: [],
  documentNumber: '1985/QĐ-UBND',
  publishedAt: undefined,
  sourceUrl: undefined,
  evidence: [],
  ...over,
});

describe('buildDecisionQueue', () => {
  const rows = [
    row('a', { capitalVnd: 5e12 }),
    row('b', { capitalVnd: 9e12 }),
    row('c', { capitalVnd: undefined }),
    row('d', { areaCodes: [], hasLocation: false }),
    row('e'),
  ];

  it('mỗi dự án chỉ có tối đa một mục, lấy loại vấn đề nghiêm trọng nhất', () => {
    const queue = buildDecisionQueue({
      rows,
      reviewIds: new Set(['a', 'b']),
      uncitedIds: new Set(['b', 'e']),
    });
    const ids = queue.map((i) => i.projectId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(queue.find((i) => i.projectId === 'b')?.kind).toBe('planning-review');
    expect(queue.find((i) => i.projectId === 'e')?.kind).toBe('planning-uncited');
  });

  it('xếp theo mức ưu tiên rồi theo vốn giảm dần; vốn thiếu xếp cuối nhóm và không bị coi là 0', () => {
    const queue = buildDecisionQueue({
      rows,
      reviewIds: new Set(['a', 'b']),
      uncitedIds: new Set(['e']),
    });
    expect(queue.slice(0, 2).map((i) => i.projectId)).toEqual(['b', 'a']);
    expect(queue[0].priority).toBe('high');
    const missing = queue.find((i) => i.projectId === 'c');
    expect(missing?.kind).toBe('capital-missing');
    expect(missing?.capitalVnd).toBeUndefined();
  });

  it('không bịa chủ trách nhiệm, hạn xử lý hay số ngày tồn tại', () => {
    const [first] = buildDecisionQueue({ rows, reviewIds: new Set(['a']), uncitedIds: new Set() });
    expect(Object.keys(first)).not.toContain('owner');
    expect(Object.keys(first)).not.toContain('deadline');
    expect(Object.keys(first)).not.toContain('daysOpen');
    expect(first.source).toBe('1985/QĐ-UBND');
  });

  it('dự án không có vấn đề nào thì không vào hàng chờ; thống kê theo loại khớp danh sách', () => {
    const queue = buildDecisionQueue({
      rows: [row('ok')],
      reviewIds: new Set(),
      uncitedIds: new Set(),
    });
    expect(queue).toEqual([]);
  });
});
