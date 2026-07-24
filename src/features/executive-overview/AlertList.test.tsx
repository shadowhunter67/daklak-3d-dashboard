import { cleanup, screen } from '@testing-library/react';
import { renderWithI18n } from '../../i18n/tests/renderWithI18n';
import { afterEach, describe, expect, it } from 'vitest';
import { AlertList } from './AlertList';
import type { PortfolioAlert } from './model/executiveOverviewTypes';

describe('AlertList', () => {
  afterEach(cleanup);

  it('shows an empty-state message when there are no alerts', () => {
    renderWithI18n(<AlertList alerts={[]} />);
    expect(
      screen.getByText('Không có cảnh báo nào — danh mục dự án đang ổn định.'),
    ).toBeInTheDocument();
  });

  it('renders separate group headings for critical, warning and data-quality alerts', () => {
    const alerts: PortfolioAlert[] = [
      {
        id: '1',
        kind: 'business',
        severity: 'critical',
        category: 'schedule-delay',
        message: 'Dự án A chậm.',
      },
      {
        id: '2',
        kind: 'business',
        severity: 'warning',
        category: 'at-risk',
        message: 'Dự án B có nguy cơ.',
      },
      {
        id: '3',
        kind: 'data-quality',
        severity: 'warning',
        category: 'stale-data',
        message: 'Dữ liệu C cũ.',
      },
    ];
    renderWithI18n(<AlertList alerts={alerts} />);
    expect(screen.getByRole('heading', { name: /Nghiêm trọng/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Cảnh báo \(1\)/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Chất lượng dữ liệu/ })).toBeInTheDocument();
    expect(screen.getByText('Dự án A chậm.')).toBeInTheDocument();
  });

  it('always shows a text severity label alongside the visual marker (never color-only)', () => {
    const alerts: PortfolioAlert[] = [
      { id: '1', kind: 'business', severity: 'critical', category: 'schedule-delay', message: 'x' },
    ];
    renderWithI18n(<AlertList alerts={alerts} />);
    expect(document.querySelector('.alert-item__severity')?.textContent).toBe('Nghiêm trọng');
  });

  it('labels a data-quality alert distinctly from a business severity label', () => {
    const alerts: PortfolioAlert[] = [
      {
        id: '1',
        kind: 'data-quality',
        severity: 'critical',
        category: 'duplicate-primary-key',
        message: 'x',
      },
    ];
    renderWithI18n(<AlertList alerts={alerts} />);
    expect(document.querySelector('.alert-item__severity')?.textContent).toBe('Chất lượng dữ liệu');
    expect(screen.queryByRole('heading', { name: /Nghiêm trọng/ })).not.toBeInTheDocument();
  });
});
