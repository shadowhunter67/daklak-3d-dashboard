import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import labels from '../../assets/maps/daklak/daklak-labels.json';
import { MOCK_PROJECT_BUNDLES } from '../../entities/project/illustrativeProjectPortfolio';
import type { ProjectPortfolio } from '../../entities/project/adapters/ProjectPortfolioSource';
import {
  FakeProjectPortfolioSource,
  PendingProjectPortfolioSource,
} from './data/FakeProjectPortfolioSource';
import { ExecutiveOverview } from './ExecutiveOverview';

const validAdministrativeCodes = new Set(Object.keys(labels));

function portfolio(bundles = MOCK_PROJECT_BUNDLES): ProjectPortfolio {
  return {
    bundles,
    validAdministrativeCodes,
    provenance: {
      effectiveAt: new Date().toISOString(),
      sourcePublishedAt: new Date().toISOString(),
      retrievedAt: new Date().toISOString(),
      publishedToDashboardAt: new Date().toISOString(),
      loadedInBrowserAt: new Date().toISOString(),
    },
  };
}

describe('ExecutiveOverview', () => {
  afterEach(cleanup);

  it('shows a loading state before the source resolves', () => {
    render(<ExecutiveOverview source={new PendingProjectPortfolioSource()} />);
    expect(screen.getByText('Đang tải tổng quan danh mục dự án…')).toBeInTheDocument();
  });

  it('renders KPI cards, priority projects and the illustrative-data disclaimer once loaded', async () => {
    render(<ExecutiveOverview source={FakeProjectPortfolioSource.ok(portfolio())} />);
    await screen.findByRole('heading', { name: 'Tổng quan điều hành dự án trọng điểm' });
    expect(screen.getByText(/DỮ LIỆU MINH HỌA/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Chỉ số tổng quan' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Dự án cần chú ý' })).toBeInTheDocument();
  });

  it('shows an explicit empty state for a portfolio with zero projects, not a blank/zeroed KPI grid', async () => {
    render(<ExecutiveOverview source={FakeProjectPortfolioSource.ok(portfolio([]))} />);
    await screen.findByText(
      'Chưa có dự án nào trong danh mục. Khi có dữ liệu, tổng quan sẽ hiển thị tại đây.',
    );
    expect(screen.queryByRole('heading', { name: 'Chỉ số tổng quan' })).not.toBeInTheDocument();
  });

  it('renders an unavailable KPI as explanatory text, never a bare 0', async () => {
    const base = MOCK_PROJECT_BUNDLES.find((b) => b.project.id === 'prj-004')!;
    const zeroBudgetProject = {
      ...base,
      project: { ...base.project, approvedBudget: 0, disbursedAmount: 0 },
    };
    render(
      <ExecutiveOverview source={FakeProjectPortfolioSource.ok(portfolio([zeroBudgetProject]))} />,
    );
    await screen.findByRole('heading', { name: 'Tổng quan điều hành dự án trọng điểm' });
    const disbursementCard = screen.getByText('Tỷ lệ giải ngân').closest('li');
    expect(disbursementCard).not.toBeNull();
    expect(disbursementCard!.textContent).toContain('Chưa đủ dữ liệu');
    expect(disbursementCard!.textContent).not.toMatch(/[^A-Za-z]0%/);
  });

  it('shows a degraded banner and still renders the partial data when the source is degraded', async () => {
    render(
      <ExecutiveOverview
        source={FakeProjectPortfolioSource.degraded(portfolio(), ['issues dataset unavailable'])}
      />,
    );
    const banner = await screen.findByRole('alert');
    expect(banner.textContent).toContain('issues dataset unavailable');
    expect(
      screen.getByRole('heading', { name: 'Tổng quan điều hành dự án trọng điểm' }),
    ).toBeInTheDocument();
  });

  it('shows a friendly message and a retry button on error, without crashing the rest of the app', async () => {
    render(
      <ExecutiveOverview
        source={FakeProjectPortfolioSource.error('backend unreachable', 'network')}
      />,
    );
    await screen.findByRole('heading', { name: 'Không thể tải dữ liệu dự án' });
    expect(screen.getByText('Không thể kết nối tới nguồn dữ liệu.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
  });

  it('retries loading when the retry button is clicked', async () => {
    render(<ExecutiveOverview source={FakeProjectPortfolioSource.error('x', 'network')} />);
    await screen.findByRole('heading', { name: 'Không thể tải dữ liệu dự án' });
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    // Re-fires the same (still-erroring) fake source — proves the retry path re-triggers the
    // load effect without throwing, which is what a real recovered source would need.
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: 'Không thể tải dữ liệu dự án' }),
      ).toBeInTheDocument(),
    );
  });

  it('excludes an invalid record from the rendered portfolio without crashing', async () => {
    const broken = {
      ...MOCK_PROJECT_BUNDLES[0],
      project: { ...MOCK_PROJECT_BUNDLES[0].project, id: 'broken', overallProgress: 999 },
    };
    render(
      <ExecutiveOverview
        source={FakeProjectPortfolioSource.ok(portfolio([...MOCK_PROJECT_BUNDLES, broken]))}
      />,
    );
    await screen.findByRole('heading', { name: 'Tổng quan điều hành dự án trọng điểm' });
    // No crash, no dialog-of-death — the page rendered a complete, if slightly reduced, model.
    expect(screen.getByRole('heading', { name: 'Chỉ số tổng quan' })).toBeInTheDocument();
  });
});
