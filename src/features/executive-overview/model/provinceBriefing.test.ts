import { describe, expect, it } from 'vitest';
import type { CatalogRow } from '../../investment-catalog/model/catalogModel';
import { buildBriefing } from './provinceBriefing';

const row = (id: string, sector: CatalogRow['sector'], capitalVnd?: number): CatalogRow => ({
  id,
  name: id,
  sector,
  areaCodes: [],
  capitalVnd,
  locationAccuracy: undefined,
  hasLocation: false,
  notes: [],
  documentNumber: undefined,
  publishedAt: undefined,
  sourceUrl: undefined,
  evidence: [],
});

describe('buildBriefing', () => {
  const rows = [
    row('a', 'energy', 3e12),
    row('b', 'energy', 1e12),
    row('c', 'tourism', 2e11),
    row('d', 'transport'),
  ];

  it('tổng vốn theo lĩnh vực chỉ cộng dự án có số liệu vốn, xếp giảm dần', () => {
    const b = buildBriefing({
      rows,
      planningReviewCount: 0,
      destinationsWithoutPhoto: 0,
      unitsWithoutVerifiedImage: 0,
    });
    expect(b.sectors.map((s) => [s.sector, s.capitalVnd, s.projects])).toEqual([
      ['energy', 4e12, 2],
      ['tourism', 2e11, 1],
    ]);
    expect(b.totalCapitalVnd).toBe(4.2e12);
    expect(b.projectsWithCapital).toBe(3);
    expect(b.projectsWithoutCapital).toBe(1);
  });

  it('hàng chờ chỉ gồm việc có thật (số > 0), giữ thứ tự cố định', () => {
    const b = buildBriefing({
      rows,
      planningReviewCount: 5,
      destinationsWithoutPhoto: 0,
      unitsWithoutVerifiedImage: 102,
    });
    expect(b.queue).toEqual([
      { id: 'capital', count: 1 },
      { id: 'planning', count: 5 },
      { id: 'unit-photo', count: 102 },
    ]);
  });

  it('không có việc nào thì hàng chờ rỗng', () => {
    const b = buildBriefing({
      rows: [row('a', 'energy', 1)],
      planningReviewCount: 0,
      destinationsWithoutPhoto: 0,
      unitsWithoutVerifiedImage: 0,
    });
    expect(b.queue).toEqual([]);
  });
});
