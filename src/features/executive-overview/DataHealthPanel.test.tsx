import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useMapStore } from '../../stores/mapStore';
import { DataHealthPanel } from './DataHealthPanel';
import type { DataHealthSummary } from './model/executiveOverviewTypes';

const asOf = new Date('2026-07-23T00:00:00.000Z');

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
    render(<DataHealthPanel dataHealth={dataHealth} asOf={asOf} />);
    expect(screen.getByText('8 / 9')).toBeInTheDocument();
    expect(screen.getByText('Cao: 3 dự án')).toBeInTheDocument();
    expect(screen.getByText('Trung bình: 4 dự án')).toBeInTheDocument();
  });

  it('opens the provenance panel via the store action, without navigating away', () => {
    useMapStore.setState({ provenancePanelOpen: false });
    render(<DataHealthPanel dataHealth={dataHealth} asOf={asOf} />);
    fireEvent.click(screen.getByRole('button', { name: 'Xem chi tiết nguồn dữ liệu' }));
    expect(useMapStore.getState().provenancePanelOpen).toBe(true);
  });
});
