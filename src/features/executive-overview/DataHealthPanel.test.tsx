import { cleanup, fireEvent, screen } from '@testing-library/react';
import { renderWithI18n } from '../../i18n/tests/renderWithI18n';
import { afterEach, describe, expect, it } from 'vitest';
import { useMapStore } from '../../stores/mapStore';
import type { ProjectPortfolioProvenance } from '../../entities/project/adapters/ProjectPortfolioSource';
import { DataHealthPanel } from './DataHealthPanel';
import type { DataHealthSummary } from './model/executiveOverviewTypes';

const asOf = new Date('2026-07-23T00:00:00.000Z');

const dataTimeline: ProjectPortfolioProvenance = {
  effectiveAt: '2026-07-23T00:00:00.000Z',
  sourcePublishedAt: '2026-07-20T00:00:00.000Z',
  retrievedAt: '2026-07-21T00:00:00.000Z',
  publishedToDashboardAt: '2026-07-23T00:00:00.000Z',
  loadedInBrowserAt: asOf.toISOString(),
};

const dataHealth: DataHealthSummary = {
  totalProjects: 9,
  validProjects: 8,
  invalidProjects: 1,
  staleProjectCount: 1,
  duplicateRecordCount: 0,
  unmappedAdministrativeCodeCount: 0,
  missingRequiredFieldIssueCount: 2,
  totalDataQualityIssues: 3,
  sourceAvailable: true,
  calculatedAt: asOf.toISOString(),
  confidenceBreakdown: { verified: 0, high: 3, medium: 4, low: 2, unknown: 0 },
};

describe('DataHealthPanel', () => {
  afterEach(cleanup);

  it('renders record counts and confidence breakdown', () => {
    renderWithI18n(<DataHealthPanel dataHealth={dataHealth} dataTimeline={dataTimeline} />);
    expect(screen.getByText('8 / 9')).toBeInTheDocument();
    expect(screen.getByText('Cao: 3 dự án')).toBeInTheDocument();
    expect(screen.getByText('Trung bình: 4 dự án')).toBeInTheDocument();
  });

  it('opens the provenance panel via the store action, without navigating away', () => {
    useMapStore.setState({ provenancePanelOpen: false });
    renderWithI18n(<DataHealthPanel dataHealth={dataHealth} dataTimeline={dataTimeline} />);
    fireEvent.click(screen.getByRole('button', { name: 'Xem chi tiết nguồn dữ liệu' }));
    expect(useMapStore.getState().provenancePanelOpen).toBe(true);
  });
});
