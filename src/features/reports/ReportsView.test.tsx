import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithI18n } from '../../i18n/tests/renderWithI18n';
import { ReportsView } from './ReportsView';

describe('ReportsView', () => {
  afterEach(cleanup);

  it('định dạng phần trăm theo ngôn ngữ (dấu phẩy ở tiếng Việt), cùng kiểu với Tổng quan', async () => {
    renderWithI18n(<ReportsView onBackToOverview={vi.fn()} />);
    await screen.findByRole('heading', { name: 'Báo cáo' });
    expect((await screen.findAllByText(/^\d+,\d%$/)).length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/^\d+\.\d%$/)).toHaveLength(0);
  });
});
