import { describe, expect, it } from 'vitest';
import {
  parseHashRoute,
  serializeDataReadinessHash,
  serializeInvestmentCatalogHash,
  serializePlanningHash,
  serializeTourismHash,
  serializeUnitHash,
  serializeDioramaHash,
  serializePortfolioHash,
  serializeProjectDetailHash,
} from './hashRoute';

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

  it('parses #/reports and rejects extra segments', () => {
    expect(parseHashRoute('#/reports')).toEqual({ kind: 'reports' });
    expect(parseHashRoute('#/reports/x')).toEqual({ kind: 'none' });
  });

  it('parses #/investment-catalog, rejects extra segments, and round-trips', () => {
    expect(parseHashRoute('#/investment-catalog')).toEqual({ kind: 'investment-catalog' });
    expect(parseHashRoute('#/investment-catalog/x')).toEqual({ kind: 'none' });
    expect(parseHashRoute(serializeInvestmentCatalogHash())).toEqual({
      kind: 'investment-catalog',
    });
  });

  it('carries an optional ?q= search into the investment catalog route', () => {
    expect(parseHashRoute('#/investment-catalog?q=%C4%91i%E1%BB%87n%20gi%C3%B3')).toEqual({
      kind: 'investment-catalog',
      query: 'điện gió',
    });
    expect(serializeInvestmentCatalogHash('điện gió')).toBe(
      '#/investment-catalog?q=%C4%91i%E1%BB%87n%20gi%C3%B3',
    );
    expect(parseHashRoute(serializeInvestmentCatalogHash('điện gió'))).toEqual({
      kind: 'investment-catalog',
      query: 'điện gió',
    });
    expect(parseHashRoute('#/investment-catalog?q=')).toEqual({ kind: 'investment-catalog' });
  });

  it('parses #/tourism and #/planning, rejects extra segments, and round-trips', () => {
    expect(parseHashRoute('#/tourism')).toEqual({ kind: 'tourism' });
    expect(parseHashRoute('#/planning')).toEqual({ kind: 'planning' });
    expect(parseHashRoute('#/tourism/x')).toEqual({ kind: 'none' });
    expect(parseHashRoute('#/planning/x')).toEqual({ kind: 'none' });
    expect(parseHashRoute(serializeTourismHash())).toEqual({ kind: 'tourism' });
    expect(parseHashRoute(serializePlanningHash())).toEqual({ kind: 'planning' });
  });

  it('parses #/unit/<code>, rejects extra or empty segments, and round-trips', () => {
    expect(parseHashRoute('#/unit/24133')).toEqual({ kind: 'unit', code: '24133' });
    expect(parseHashRoute('#/unit/')).toEqual({ kind: 'none' });
    expect(parseHashRoute('#/unit/24133/x')).toEqual({ kind: 'none' });
    expect(parseHashRoute(serializeUnitHash('24133'))).toEqual({ kind: 'unit', code: '24133' });
  });

  it('carries an optional ?area= filter into the investment catalog route', () => {
    expect(parseHashRoute('#/investment-catalog?area=24133')).toEqual({
      kind: 'investment-catalog',
      area: '24133',
    });
    expect(serializeInvestmentCatalogHash(undefined, '24133')).toBe(
      '#/investment-catalog?area=24133',
    );
    expect(parseHashRoute(serializeInvestmentCatalogHash('điện gió', '24133'))).toEqual({
      kind: 'investment-catalog',
      query: 'điện gió',
      area: '24133',
    });
  });

  it('parses #/data-readiness', () => {
    expect(parseHashRoute('#/data-readiness')).toEqual({ kind: 'data-readiness' });
  });

  it('falls back to none for #/data-readiness with an extra segment', () => {
    expect(parseHashRoute('#/data-readiness/extra')).toEqual({ kind: 'none' });
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

  it('round-trips the data-readiness hash', () => {
    expect(parseHashRoute(serializeDataReadinessHash())).toEqual({ kind: 'data-readiness' });
  });

  it('round-trips a diorama destination id and rejects malformed diorama hashes', () => {
    expect(parseHashRoute(serializeDioramaHash('krong-kmar-waterfall'))).toEqual({
      kind: 'diorama',
      destinationId: 'krong-kmar-waterfall',
    });
    expect(parseHashRoute('#/diorama')).toEqual({ kind: 'none' });
    expect(parseHashRoute('#/diorama/a/b')).toEqual({ kind: 'none' });
  });
});
