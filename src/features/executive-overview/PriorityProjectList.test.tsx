import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithI18n } from '../../i18n/tests/renderWithI18n';
import { afterEach, describe, expect, it } from 'vitest';
import { useMapStore } from '../../stores/mapStore';
import type { ProjectAttentionItem } from './model/executiveOverviewTypes';
import { PriorityProjectList } from './PriorityProjectList';

const asOf = new Date('2026-07-23T00:00:00.000Z');

function makeItem(overrides: Partial<ProjectAttentionItem> = {}): ProjectAttentionItem {
  return {
    projectId: 'prj-001',
    projectName: 'Dự án minh hoạ',
    projectCode: 'DL-1',
    sector: 'transport',
    status: 'delayed',
    statusLabel: 'Chậm tiến độ',
    overallProgress: 40,
    disbursementRate: {
      value: 40,
      unit: '%',
      status: 'ok',
      calculatedAt: asOf.toISOString(),
      sourceDatasetIds: [],
      missingInputs: [],
      explanation: '',
    },
    primaryReason: 'Đang chậm tiến độ',
    reasonCategory: 'delayed',
    dataUpdatedAt: '2026-07-01T00:00:00.000Z',
    administrativeAreaCodes: ['24133'],
    ...overrides,
  };
}

describe('PriorityProjectList', () => {
  afterEach(cleanup);

  it('shows a message when there are no priority projects', () => {
    renderWithI18n(<PriorityProjectList items={[]} asOf={asOf} />);
    expect(
      screen.getByText('Không có dự án nào cần chú ý đặc biệt tại thời điểm này.'),
    ).toBeInTheDocument();
  });

  it('opens a project summary dialog and moves focus into it', async () => {
    renderWithI18n(<PriorityProjectList items={[makeItem()]} asOf={asOf} />);
    const trigger = screen.getByRole('button', { name: 'Xem tóm tắt' });
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = await screen.findByRole('dialog', { name: 'Dự án minh hoạ' });
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: 'Đóng tóm tắt dự án' }),
      ),
    );
    expect(dialog).toBeInTheDocument();
  });

  it('returns focus to the trigger button when the summary dialog closes', async () => {
    renderWithI18n(<PriorityProjectList items={[makeItem()]} asOf={asOf} />);
    const trigger = screen.getByRole('button', { name: 'Xem tóm tắt' });
    // fireEvent.click alone does not move real DOM focus in jsdom — prime it explicitly, matching
    // the convention already used by DataProvenancePanel.test.tsx's equivalent focus-restore test.
    trigger.focus();
    fireEvent.click(trigger);
    await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('button', { name: 'Đóng tóm tắt dự án' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it('closes the summary dialog on Escape', async () => {
    renderWithI18n(<PriorityProjectList items={[makeItem()]} asOf={asOf} />);
    fireEvent.click(screen.getByRole('button', { name: 'Xem tóm tắt' }));
    await screen.findByRole('dialog');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('offers a "Xem trên bản đồ" action only when the project has Point geometry', async () => {
    renderWithI18n(
      <PriorityProjectList
        items={[makeItem({ geometry: { type: 'Point', coordinates: [108.03, 12.66] } })]}
        asOf={asOf}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Xem tóm tắt' }));
    await screen.findByRole('dialog');
    expect(screen.getByRole('button', { name: 'Xem trên bản đồ' })).toBeInTheDocument();
  });

  it('does not offer a map action for a project without geometry', async () => {
    renderWithI18n(<PriorityProjectList items={[makeItem({ geometry: undefined })]} asOf={asOf} />);
    fireEvent.click(screen.getByRole('button', { name: 'Xem tóm tắt' }));
    await screen.findByRole('dialog');
    expect(screen.queryByRole('button', { name: 'Xem trên bản đồ' })).not.toBeInTheDocument();
    expect(
      screen.getByText('Dự án này chưa có toạ độ để hiển thị trên bản đồ.'),
    ).toBeInTheDocument();
  });

  it('navigates to the detail map centered on the project when "Xem trên bản đồ" is clicked', async () => {
    useMapStore.setState({ viewMode: 'overview' });
    renderWithI18n(
      <PriorityProjectList
        items={[makeItem({ geometry: { type: 'Point', coordinates: [108.03, 12.66] } })]}
        asOf={asOf}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Xem tóm tắt' }));
    await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('button', { name: 'Xem trên bản đồ' }));
    expect(useMapStore.getState().viewMode).toBe('map');
    expect(useMapStore.getState().detailMapCamera.longitude).toBeCloseTo(108.03);
    expect(useMapStore.getState().detailMapCamera.latitude).toBeCloseTo(12.66);
  });
});
