import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PROJECT_STATUSES, type ProjectStatus } from '../../entities/project/types';
import { PortfolioStatusChart } from './PortfolioStatusChart';

function distribution(
  overrides: Partial<Record<ProjectStatus, number>>,
): Record<ProjectStatus, number> {
  const base = Object.fromEntries(PROJECT_STATUSES.map((s) => [s, 0])) as Record<
    ProjectStatus,
    number
  >;
  return { ...base, ...overrides };
}

describe('PortfolioStatusChart', () => {
  afterEach(cleanup);

  it('shows an empty message when there are no projects', () => {
    render(<PortfolioStatusChart statusDistribution={distribution({})} />);
    expect(screen.getByText('Chưa có dự án nào để hiển thị.')).toBeInTheDocument();
  });

  it('provides a full text equivalent of the visual chart via an accessible name', () => {
    render(<PortfolioStatusChart statusDistribution={distribution({ active: 3, delayed: 1 })} />);
    const chart = screen.getByRole('img');
    expect(chart.getAttribute('aria-label')).toContain('Đang triển khai 3 dự án');
    expect(chart.getAttribute('aria-label')).toContain('Chậm tiến độ 1 dự án');
  });

  it('renders a text legend entry per status, never relying on color alone', () => {
    render(<PortfolioStatusChart statusDistribution={distribution({ active: 3, delayed: 1 })} />);
    expect(screen.getByText(/Đang triển khai: 3 dự án/)).toBeInTheDocument();
    expect(screen.getByText(/Chậm tiến độ: 1 dự án/)).toBeInTheDocument();
  });
});
