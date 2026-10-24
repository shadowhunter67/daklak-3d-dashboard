import { describe, expect, it } from 'vitest';
import {
  PLANNING_DOCUMENTS,
  PLANNING_REVIEW_PROJECT_IDS,
  PLANNING_TOTAL_PROJECTS,
  PLANNING_UNCITED_PROJECT_IDS,
  type PlanningDocument,
} from '../../../data/planningCitations';
import { countByIssuer, filterDocuments, summarizePlanning } from './planningModel';

const docs: PlanningDocument[] = [
  { number: '768/QĐ-TTg', issuer: 'prime-minister', date: '2025-04-15', projectIds: ['a', 'b'] },
  { number: '1349/QĐ-UBND', issuer: 'people-committee', projectIds: ['b'] },
];

describe('planning model', () => {
  it('summarises cited documents and projects without judging legal fit', () => {
    const s = summarizePlanning({ documents: docs, total: 5, uncited: ['e'], review: ['b'] });
    expect(s).toEqual({
      documents: 2,
      citedProjects: 2,
      uncitedProjects: 1,
      reviewProjects: 1,
      total: 5,
    });
  });

  it('counts a project once even if it cites several documents', () => {
    const s = summarizePlanning({ documents: docs, total: 3, uncited: [], review: [] });
    expect(s.citedProjects).toBe(2);
  });

  it('filters by issuer and by number text', () => {
    expect(filterDocuments(docs, { issuer: 'prime-minister' })).toHaveLength(1);
    expect(filterDocuments(docs, { query: '1349' })[0].number).toBe('1349/QĐ-UBND');
    expect(filterDocuments(docs, {})).toHaveLength(2);
    expect(countByIssuer(docs)).toEqual({ 'prime-minister': 1, 'people-committee': 1 });
  });

  it('generated citations are consistent with the 201-project catalog', () => {
    expect(PLANNING_TOTAL_PROJECTS).toBe(201);
    const cited = new Set(PLANNING_DOCUMENTS.flatMap((d) => d.projectIds));
    expect(cited.size + PLANNING_UNCITED_PROJECT_IDS.length).toBe(PLANNING_TOTAL_PROJECTS);
    for (const id of PLANNING_REVIEW_PROJECT_IDS) expect(id).toMatch(/^qd1985-pl\d-\d{3}$/);
    expect(PLANNING_DOCUMENTS.every((d) => d.projectIds.length > 0)).toBe(true);
  });
});
