import { describe, expect, it } from 'vitest';
import type { PlanningDocument } from '../../../data/planningCitations';
import type { CatalogRow } from '../../investment-catalog/model/catalogModel';
import { buildUnitLinks } from './destinationLinks';

const row = (id: string, over: Partial<CatalogRow> = {}): CatalogRow => ({
  id,
  name: id,
  sector: 'energy',
  areaCodes: ['U1'],
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
const docs: PlanningDocument[] = [
  { number: '768/QĐ-TTg', issuer: 'prime-minister', projectIds: ['a', 'b'] },
  { number: '1349/QĐ-UBND', issuer: 'people-committee', projectIds: ['b', 'z'] },
];

describe('buildUnitLinks', () => {
  const rows = [
    row('a', { sector: 'tourism', capitalVnd: 3e11 }),
    row('b'),
    row('c', { areaCodes: ['U2'], sector: 'tourism' }),
  ];

  it('dự án trong địa bàn, tách riêng dự án lĩnh vực du lịch, kèm vốn chỉ của dự án có số vốn', () => {
    const links = buildUnitLinks('U1', rows, docs);
    expect(links.projects).toBe(2);
    expect(links.tourismProjects).toBe(1);
    expect(links.capitalVnd).toBe(1.3e12);
  });

  it('văn bản quy hoạch liên quan là các văn bản mà dự án trong địa bàn trích dẫn (không trùng)', () => {
    const links = buildUnitLinks('U1', rows, docs);
    expect(links.planningDocuments.sort()).toEqual(['1349/QĐ-UBND', '768/QĐ-TTg']);
  });

  it('địa bàn không có dự án: số 0 và danh sách rỗng, không bịa', () => {
    expect(buildUnitLinks('U9', rows, docs)).toEqual({
      projects: 0,
      tourismProjects: 0,
      capitalVnd: undefined,
      planningDocuments: [],
    });
  });

  it('không có số vốn nào thì vốn là undefined, không phải 0', () => {
    const links = buildUnitLinks('U1', [row('a', { capitalVnd: undefined })], docs);
    expect(links.capitalVnd).toBeUndefined();
  });
});
