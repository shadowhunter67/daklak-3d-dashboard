import { describe, expect, it } from 'vitest';
import { buildSearchIndex, flattenResults, searchAll, type SearchEntry } from './globalSearchIndex';

const entries: SearchEntry[] = [
  { kind: 'ward', id: '24133', name: 'Buôn Ma Thuột', latitude: 12.67, longitude: 108.04 },
  { kind: 'ward', id: '24235', name: 'Buôn Đôn', latitude: 12.9, longitude: 107.75 },
  {
    kind: 'project',
    id: 'p1',
    name: 'Nâng cấp Trung tâm Y tế khu vực Krông Bông',
    code: 'DL-2026-YT-001',
  },
  { kind: 'place', id: 'ho-lak', name: 'Hồ Lắk' },
  { kind: 'planning', id: '768/QĐ-TTg', name: '768/QĐ-TTg' },
  { kind: 'opportunity', id: 'qd1985-pl1-001', name: 'Nhà máy điện gió Thuận Phong 2, GĐ 1' },
];
const index = buildSearchIndex(entries);

describe('global search index', () => {
  it('matches without diacritics and groups results by kind', () => {
    const grouped = searchAll(index, 'buon');
    expect(grouped.ward.map((e) => e.name)).toEqual(['Buôn Ma Thuột', 'Buôn Đôn']);
    expect(grouped.project).toHaveLength(0);
  });

  it('finds a project by name or by code', () => {
    expect(searchAll(index, 'y te')['project']).toHaveLength(1);
    expect(searchAll(index, 'dl-2026-yt')['project']).toHaveLength(1);
  });

  it('finds a place and keeps kind order ward, project, place when flattened', () => {
    const grouped = searchAll(index, 'l');
    expect(flattenResults(grouped).map((e) => e.kind)).toEqual(
      [...flattenResults(grouped).map((e) => e.kind)].sort(
        (a, b) => ['ward', 'project', 'place'].indexOf(a) - ['ward', 'project', 'place'].indexOf(b),
      ),
    );
    expect(searchAll(index, 'ho lak').place[0]?.id).toBe('ho-lak');
  });

  it('finds an investment-attraction opportunity without diacritics, ranked after projects', () => {
    const grouped = searchAll(index, 'dien gio');
    expect(grouped.opportunity.map((e) => e.id)).toEqual(['qd1985-pl1-001']);
    expect(flattenResults(searchAll(index, 'a')).map((e) => e.kind)).toEqual(
      [...flattenResults(searchAll(index, 'a')).map((e) => e.kind)].sort(
        (a, b) =>
          ['ward', 'project', 'opportunity', 'place'].indexOf(a) -
          ['ward', 'project', 'opportunity', 'place'].indexOf(b),
      ),
    );
  });

  it('ranks prefix matches before substring matches', () => {
    const local = buildSearchIndex([
      { kind: 'ward', id: 'a', name: 'Ea Kar', latitude: 0, longitude: 0 },
      { kind: 'ward', id: 'b', name: 'Cư Kar', latitude: 0, longitude: 0 },
      { kind: 'ward', id: 'c', name: 'Kar Thịnh', latitude: 0, longitude: 0 },
    ]);
    expect(searchAll(local, 'kar').ward.map((e) => e.id)).toEqual(['c', 'a', 'b']);
  });

  it('returns nothing for an empty query and honours the per-kind limit', () => {
    expect(flattenResults(searchAll(index, '   '))).toHaveLength(0);
    expect(searchAll(index, 'buon', 1).ward).toHaveLength(1);
  });

  it('finds a planning document by its number, with or without diacritics', () => {
    expect(searchAll(index, '768/qd-ttg').planning.map((e) => e.id)).toEqual(['768/QĐ-TTg']);
    expect(searchAll(index, '768').planning).toHaveLength(1);
  });
});
