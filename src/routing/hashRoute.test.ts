import { describe, expect, it } from 'vitest';
import { parseHashRoute, serializePortfolioHash, serializeProjectDetailHash } from './hashRoute';

describe('parseHashRoute', () => {
  it('parses empty/missing hash as none', () => {
    expect(parseHashRoute('')).toEqual({ kind: 'none' });
    expect(parseHashRoute('#')).toEqual({ kind: 'none' });
  });

  it('parses #/projects with no filters', () => {
    expect(parseHashRoute('#/projects')).toEqual({ kind: 'portfolio', filters: {} });
  });

  it('parses #/projects with filters', () => {
    expect(
      parseHashRoute(
        '#/projects?status=delayed&sector=transport&area=61301&q=cao+t%E1%BB%91c&sort=disbursement-desc',
      ),
    ).toEqual({
      kind: 'portfolio',
      filters: {
        status: 'delayed',
        sector: 'transport',
        area: '61301',
        query: 'cao tốc',
        sort: 'disbursement-desc',
      },
    });
  });

  it('ignores unknown sort values instead of crashing', () => {
    expect(parseHashRoute('#/projects?sort=not-a-real-key')).toEqual({
      kind: 'portfolio',
      filters: {},
    });
  });

  it('parses #/projects/:id as project-detail', () => {
    expect(parseHashRoute('#/projects/prj-001')).toEqual({
      kind: 'project-detail',
      projectId: 'prj-001',
    });
  });

  it('decodes an encoded project id', () => {
    expect(parseHashRoute('#/projects/prj%20001')).toEqual({
      kind: 'project-detail',
      projectId: 'prj 001',
    });
  });

  it('falls back to none on unrecognized/malformed hashes', () => {
    expect(parseHashRoute('#/something-else')).toEqual({ kind: 'none' });
    expect(parseHashRoute('#/projects/a/b/c')).toEqual({ kind: 'none' });
    expect(parseHashRoute('#not-projects')).toEqual({ kind: 'none' });
  });

  it('tolerates a missing leading slash', () => {
    expect(parseHashRoute('#projects')).toEqual({ kind: 'portfolio', filters: {} });
  });
});

describe('serializePortfolioHash / serializeProjectDetailHash', () => {
  it('round-trips filters through parse', () => {
    const filters = {
      status: 'delayed',
      sector: 'transport',
      area: '61301',
      query: 'cầu',
      sort: 'progress-asc' as const,
    };
    const hash = serializePortfolioHash(filters);
    expect(parseHashRoute(hash)).toEqual({ kind: 'portfolio', filters });
  });

  it('serializes an empty filter set to a bare #/projects', () => {
    expect(serializePortfolioHash()).toBe('#/projects');
  });

  it('round-trips a project id, including one needing encoding', () => {
    expect(parseHashRoute(serializeProjectDetailHash('prj-001'))).toEqual({
      kind: 'project-detail',
      projectId: 'prj-001',
    });
    expect(parseHashRoute(serializeProjectDetailHash('prj 001'))).toEqual({
      kind: 'project-detail',
      projectId: 'prj 001',
    });
  });
});
