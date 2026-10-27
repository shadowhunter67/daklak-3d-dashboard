import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PLANNING_TOTAL_PROJECTS } from './planningCitations';
import { INVESTMENT_CATALOG_PROJECT_COUNT } from './investmentCatalogMeta';

describe('INVESTMENT_CATALOG_PROJECT_COUNT', () => {
  it('khớp số dự án trong tập dữ liệu nghiên cứu và trong trích dẫn quy hoạch', () => {
    const dataset = JSON.parse(
      readFileSync(resolve(__dirname, '../../reports/research/researched-projects.json'), 'utf8'),
    ) as { projects: unknown[] };
    expect(INVESTMENT_CATALOG_PROJECT_COUNT).toBe(dataset.projects.length);
    expect(INVESTMENT_CATALOG_PROJECT_COUNT).toBe(PLANNING_TOTAL_PROJECTS);
  });
});
