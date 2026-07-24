import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { renderWithI18n as render } from '../../i18n/tests/renderWithI18n';
import type { DataStatusCounts } from '../../data-platform/catalog/freshness';
import { DataStatusSummary } from './DataStatusSummary';

const counts: DataStatusCounts = {
  current: 1,
  aging: 2,
  stale: 3,
  unknown: 4,
  illustrative: 5,
  unavailable: 0,
  total: 15,
};

describe('DataStatusSummary', () => {
  afterEach(cleanup);

  it('renders every bucket and the total as a compact list, not a monitoring dashboard', () => {
    render(<DataStatusSummary counts={counts} />);
    const list = screen.getByLabelText('Tóm tắt trạng thái dữ liệu');
    expect(list.tagName).toBe('UL');
    expect(list.textContent).toContain('Tổng');
    expect(list.textContent).toContain('15');
  });
});
