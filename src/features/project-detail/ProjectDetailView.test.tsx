import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import labels from '../../assets/maps/daklak/daklak-labels.json';
import { MOCK_PROJECT_BUNDLES } from '../../entities/project/mockPortfolio';
import type { ProjectPortfolio } from '../../entities/project/adapters/ProjectPortfolioSource';
import {
  FakeProjectPortfolioSource,
  PendingProjectPortfolioSource,
} from '../executive-overview/data/FakeProjectPortfolioSource';
import { ProjectDetailView } from './ProjectDetailView';

const validAdministrativeCodes = new Set(Object.keys(labels));

function portfolio(bundles = MOCK_PROJECT_BUNDLES): ProjectPortfolio {
  return { bundles, validAdministrativeCodes, loadedAt: new Date().toISOString() };
}

describe('ProjectDetailView', () => {
  afterEach(cleanup);

  it('shows a loading state before the source resolves', () => {
    render(
      <ProjectDetailView
        source={new PendingProjectPortfolioSource()}
        projectId={MOCK_PROJECT_BUNDLES[0].project.id}
        onBackToPortfolio={vi.fn()}
        onViewOnMap={vi.fn()}
      />,
    );
    expect(screen.getByText('Đang tải chi tiết dự án…')).toBeInTheDocument();
  });

  it('renders header, summary and the illustrative-data disclaimer for a valid project', async () => {
    const target = MOCK_PROJECT_BUNDLES[0];
    render(
      <ProjectDetailView
        source={FakeProjectPortfolioSource.ok(portfolio())}
        projectId={target.project.id}
        onBackToPortfolio={vi.fn()}
        onViewOnMap={vi.fn()}
      />,
    );
    await screen.findByRole('heading', { name: target.project.name });
    expect(screen.getByText(/DỮ LIỆU MINH HỌA/)).toBeInTheDocument();
    expect(screen.getByText(target.project.code)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Tóm tắt ngân sách và tiến độ' }),
    ).toBeInTheDocument();
  });

  it('shows a not-found state with a way back to Portfolio for an unknown id', async () => {
    const onBackToPortfolio = vi.fn();
    render(
      <ProjectDetailView
        source={FakeProjectPortfolioSource.ok(portfolio())}
        projectId="does-not-exist"
        onBackToPortfolio={onBackToPortfolio}
        onViewOnMap={vi.fn()}
      />,
    );
    await screen.findByRole('heading', { name: 'Không tìm thấy dự án' });
    fireEvent.click(screen.getByRole('button', { name: /Danh mục dự án/ }));
    expect(onBackToPortfolio).toHaveBeenCalled();
  });

  it('shows "Chưa có dữ liệu vị trí." for a project without geometry, never a dead map button', async () => {
    const noGeometryProject = MOCK_PROJECT_BUNDLES.find((b) => !b.project.geometry);
    expect(noGeometryProject).toBeDefined();
    if (!noGeometryProject) return;
    render(
      <ProjectDetailView
        source={FakeProjectPortfolioSource.ok(portfolio())}
        projectId={noGeometryProject.project.id}
        onBackToPortfolio={vi.fn()}
        onViewOnMap={vi.fn()}
      />,
    );
    await screen.findByRole('heading', { name: noGeometryProject.project.name });
    expect(screen.getByText('Chưa có dữ liệu vị trí.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Xem trên bản đồ' })).not.toBeInTheDocument();
  });

  it('calls onViewOnMap with the project geometry for a project that has one', async () => {
    const withGeometry = MOCK_PROJECT_BUNDLES.find((b) => b.project.geometry);
    expect(withGeometry).toBeDefined();
    if (!withGeometry) return;
    const onViewOnMap = vi.fn();
    render(
      <ProjectDetailView
        source={FakeProjectPortfolioSource.ok(portfolio())}
        projectId={withGeometry.project.id}
        onBackToPortfolio={vi.fn()}
        onViewOnMap={onViewOnMap}
      />,
    );
    await screen.findByRole('heading', { name: withGeometry.project.name });
    fireEvent.click(screen.getByRole('button', { name: 'Xem trên bản đồ' }));
    expect(onViewOnMap).toHaveBeenCalledWith(withGeometry.project.geometry);
  });

  it('renders work packages, milestones and grouped issues for a project that has them', async () => {
    const withEverything = MOCK_PROJECT_BUNDLES.find(
      (b) => b.workPackages.length > 0 && b.milestones.length > 0 && b.issues.length > 0,
    );
    expect(withEverything).toBeDefined();
    if (!withEverything) return;
    render(
      <ProjectDetailView
        source={FakeProjectPortfolioSource.ok(portfolio())}
        projectId={withEverything.project.id}
        onBackToPortfolio={vi.fn()}
        onViewOnMap={vi.fn()}
      />,
    );
    await screen.findByRole('heading', { name: withEverything.project.name });
    expect(
      screen.getByRole('heading', { name: `Gói thầu (${withEverything.workPackages.length})` }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: `Mốc tiến độ (${withEverything.milestones.length})` }),
    ).toBeInTheDocument();
  });

  it('renders unavailable KPI values as explanatory text, never a bare 0', async () => {
    const base = MOCK_PROJECT_BUNDLES.find((b) => b.project.id === 'prj-004')!;
    const zeroBudgetProject = {
      ...base,
      project: { ...base.project, approvedBudget: 0, disbursedAmount: 0 },
    };
    render(
      <ProjectDetailView
        source={FakeProjectPortfolioSource.ok(portfolio([zeroBudgetProject]))}
        projectId={zeroBudgetProject.project.id}
        onBackToPortfolio={vi.fn()}
        onViewOnMap={vi.fn()}
      />,
    );
    await screen.findByRole('heading', { name: zeroBudgetProject.project.name });
    const disbursementRow = screen.getByText('Tỷ lệ giải ngân').closest('div');
    expect(disbursementRow!.textContent).toContain('Chưa đủ dữ liệu');
  });

  it('shows a friendly message and a retry button on error', async () => {
    render(
      <ProjectDetailView
        source={FakeProjectPortfolioSource.error('backend unreachable', 'network')}
        projectId="any-id"
        onBackToPortfolio={vi.fn()}
        onViewOnMap={vi.fn()}
      />,
    );
    await screen.findByRole('heading', { name: 'Không thể tải chi tiết dự án' });
    expect(screen.getByText('Không thể kết nối tới nguồn dữ liệu.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
  });
});
