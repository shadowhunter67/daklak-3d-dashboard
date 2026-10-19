import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { renderWithI18n } from '../../i18n/tests/renderWithI18n';
import { useMapStore } from '../../stores/mapStore';
import type { DataHealthSummary } from './model/executiveOverviewTypes';
import { DataHealthCard } from './DataHealthCard';

const dataHealth: DataHealthSummary = {
  totalProjects: 10,
  validProjects: 9,
  invalidProjects: 1,
  staleProjectCount: 1,
  duplicateRecordCount: 1,
  unmappedAdministrativeCodeCount: 0,
  missingRequiredFieldIssueCount: 1,
  totalDataQualityIssues: 3,
  sourceAvailable: true,
  calculatedAt: '2026-01-01T00:00:00Z',
  confidenceBreakdown: { verified: 4, high: 3, medium: 1, low: 1, unknown: 1 },
};

describe('DataHealthCard', () => {
  afterEach(cleanup);
  beforeEach(() => {
    useMapStore.setState({ provenancePanelOpen: false });
    window.location.hash = '';
  });

  it('renders the honest score, level, computable metrics and issue count', () => {
    renderWithI18n(<DataHealthCard dataHealth={dataHealth} isIllustrative />);
    expect(screen.getByRole('img', { name: /Điểm tổng/ })).toBeInTheDocument();
    expect(screen.getByText('Cần chú ý')).toBeInTheDocument();
    expect(screen.getByText('Đã phát hiện 3 vấn đề cần xử lý')).toBeInTheDocument();
    expect(screen.getByText('DỮ LIỆU MINH HỌA')).toBeInTheDocument();
    expect(screen.getByText('Độ mới')).toBeInTheDocument();
  });

  it('keeps the provenance trigger distinct and opens the store panel', () => {
    renderWithI18n(<DataHealthCard dataHealth={dataHealth} isIllustrative={false} />);
    const trigger = screen.getByRole('button', { name: 'Danh mục bộ dữ liệu' });
    expect(trigger.id).toBe('open-overview-data-provenance-panel');
    expect(document.getElementById('open-data-provenance-panel')).toBeNull();
    fireEvent.click(trigger);
    expect(useMapStore.getState().provenancePanelOpen).toBe(true);
  });

  it('navigates to data readiness from the panel action', () => {
    renderWithI18n(<DataHealthCard dataHealth={dataHealth} isIllustrative={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Xem chi tiết →' }));
    expect(window.location.hash).toBe('#/data-readiness');
  });
});
