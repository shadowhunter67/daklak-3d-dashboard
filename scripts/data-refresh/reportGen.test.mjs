import { describe, expect, it } from 'vitest';
import {
  buildPrReportMarkdown,
  buildSourceHealthIssueBody,
  SOURCE_HEALTH_ISSUE_MARKER,
} from './reportGen.mjs';

const CLEAN_DIFF = { added: [], removed: [], changed: [], unchangedCount: 3 };

describe('buildPrReportMarkdown', () => {
  it('reports a clean low-risk run as auto-merge eligible with no reasons listed', () => {
    const markdown = buildPrReportMarkdown({
      datasetId: 'test-dataset',
      riskLevel: 'low-risk',
      reasons: [],
      diff: CLEAN_DIFF,
      runStatus: 'no-change',
    });
    expect(markdown).toContain('test-dataset');
    expect(markdown).toContain('low-risk');
    expect(markdown).toContain('eligible for auto-merge');
  });

  it('lists every reason for a hard-stop run', () => {
    const markdown = buildPrReportMarkdown({
      datasetId: 'test-dataset',
      riskLevel: 'hard-stop',
      reasons: ['schema changed', 'privacy finding'],
      diff: CLEAN_DIFF,
      runStatus: 'review-required',
    });
    expect(markdown).toContain('schema changed');
    expect(markdown).toContain('privacy finding');
    expect(markdown).not.toContain('eligible for auto-merge');
  });

  it('includes the diff summary counts', () => {
    const markdown = buildPrReportMarkdown({
      datasetId: 'x',
      riskLevel: 'low-risk',
      reasons: [],
      diff: { added: [1], removed: [2, 3], changed: [], unchangedCount: 7 },
      runStatus: 'success',
    });
    expect(markdown).toContain('Added: 1');
    expect(markdown).toContain('Removed: 2');
    expect(markdown).toContain('Unchanged: 7');
  });
});

describe('buildSourceHealthIssueBody', () => {
  it('always starts with the stable dedup marker', () => {
    const body = buildSourceHealthIssueBody({
      datasetId: 'x',
      riskLevel: 'low-risk',
      reasons: [],
      checkedAt: '2026-07-24T00:00:00.000Z',
    });
    expect(body.startsWith(SOURCE_HEALTH_ISSUE_MARKER)).toBe(true);
  });

  it('reports "no open issues" when there are no reasons', () => {
    const body = buildSourceHealthIssueBody({
      datasetId: 'x',
      riskLevel: 'low-risk',
      reasons: [],
      checkedAt: '2026-07-24T00:00:00.000Z',
    });
    expect(body).toContain('No open issues.');
  });

  it('lists every open reason', () => {
    const body = buildSourceHealthIssueBody({
      datasetId: 'x',
      riskLevel: 'hard-stop',
      reasons: ['reason A', 'reason B'],
      checkedAt: '2026-07-24T00:00:00.000Z',
    });
    expect(body).toContain('reason A');
    expect(body).toContain('reason B');
  });
});
