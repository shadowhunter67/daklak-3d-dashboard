import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import labels from '../../assets/maps/daklak/daklak-labels.json';
import { MOCK_PROJECT_BUNDLES } from '../../entities/project/illustrativeProjectPortfolio';
import type { ProjectPortfolio } from '../../entities/project/adapters/ProjectPortfolioSource';
import {
  FakeProjectPortfolioSource,
  PendingProjectPortfolioSource,
} from '../executive-overview/data/FakeProjectPortfolioSource';
import { ProjectPortfolioView } from './ProjectPortfolioView';

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

function renderPortfolio(props: Partial<React.ComponentProps<typeof ProjectPortfolioView>> = {}) {
  const onFiltersChange = vi.fn();
  const onOpenProject = vi.fn();
  const onBackToOverview = vi.fn();
  render(
    <ProjectPortfolioView
      source={FakeProjectPortfolioSource.ok(portfolio())}
      filters={{}}
      onFiltersChange={onFiltersChange}
      onOpenProject={onOpenProject}
      onBackToOverview={onBackToOverview}
      {...props}
    />,
  );
  return { onFiltersChange, onOpenProject, onBackToOverview };
}

describe('ProjectPortfolioView', () => {
  afterEach(cleanup);

  it('shows a loading state before the source resolves', () => {
    render(
      <ProjectPortfolioView
        source={new PendingProjectPortfolioSource()}
        filters={{}}
        onFiltersChange={vi.fn()}
        onOpenProject={vi.fn()}
        onBackToOverview={vi.fn()}
      />,
    );
    expect(screen.getByText('Đang tải danh mục dự án…')).toBeInTheDocument();
  });

  it('renders the heading, illustrative-data badge and total result count once loaded', async () => {
    renderPortfolio();
    await screen.findByRole('heading', { name: 'Danh mục dự án trọng điểm' });
    expect(screen.getByText(/DỮ LIỆU MINH HỌA/)).toBeInTheDocument();
    const resultCount = document.querySelector('.project-portfolio__result-count');
    expect(resultCount?.textContent).toContain(
      `${MOCK_PROJECT_BUNDLES.length} / ${MOCK_PROJECT_BUNDLES.length}`,
    );
  });

  it('renders every project row (desktop table has one row per project)', async () => {
    renderPortfolio();
    await screen.findByRole('heading', { name: 'Danh mục dự án trọng điểm' });
    for (const bundle of MOCK_PROJECT_BUNDLES) {
      expect(
        screen.getAllByText((_, el) => el?.textContent?.includes(bundle.project.code) ?? false)
          .length,
      ).toBeGreaterThan(0);
    }
  });

  it('calls onFiltersChange with an updated status when the status filter changes', async () => {
    const { onFiltersChange } = renderPortfolio();
    await screen.findByRole('heading', { name: 'Danh mục dự án trọng điểm' });
    fireEvent.change(screen.getByLabelText('Trạng thái'), { target: { value: 'delayed' } });
    expect(onFiltersChange).toHaveBeenCalledWith({ status: 'delayed' });
  });

  it('shows an empty-filtered-result state with a way to clear filters', async () => {
    renderPortfolio({ filters: { query: 'zzzzz-no-such-project-zzzzz' } });
    await screen.findByRole('heading', { name: 'Danh mục dự án trọng điểm' });
    expect(screen.getByText(/Không có dự án nào khớp/)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Xoá bộ lọc' }).length).toBeGreaterThan(0);
  });

  it('calls onOpenProject when a project row is activated', async () => {
    const { onOpenProject } = renderPortfolio();
    await screen.findByRole('heading', { name: 'Danh mục dự án trọng điểm' });
    const firstProject = MOCK_PROJECT_BUNDLES[0];
    const [button] = screen.getAllByRole('button', {
      name: (name) => name.includes(firstProject.project.code),
    });
    fireEvent.click(button);
    expect(onOpenProject).toHaveBeenCalledWith(firstProject.project.id);
  });

  it('shows a degraded banner and still renders the partial data when the source is degraded', async () => {
    renderPortfolio({
      source: FakeProjectPortfolioSource.degraded(portfolio(), ['progress dataset unavailable']),
    });
    const banner = await screen.findByRole('alert');
    expect(banner.textContent).toContain('progress dataset unavailable');
    expect(screen.getByRole('heading', { name: 'Danh mục dự án trọng điểm' })).toBeInTheDocument();
  });

  it('shows a friendly message and a retry button on error', async () => {
    renderPortfolio({ source: FakeProjectPortfolioSource.error('backend unreachable', 'network') });
    await screen.findByRole('heading', { name: 'Không thể tải danh mục dự án' });
    expect(screen.getByText('Không thể kết nối tới nguồn dữ liệu.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
  });
});
