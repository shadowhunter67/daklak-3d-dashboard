import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { renderWithI18n } from '../../i18n/tests/renderWithI18n';
import type { ProjectAttentionItem } from './model/executiveOverviewTypes';
import { PriorityProjectsTable } from './PriorityProjectsTable';

const item: ProjectAttentionItem = {
  projectId: 'project-1',
  projectName: 'Dự án đường thử nghiệm',
  projectCode: 'DA-001',
  sector: 'transport',
  status: 'delayed',
  statusLabel: 'Chậm tiến độ',
  overallProgress: 42,
  disbursementRate: {
    value: 25,
    unit: '%',
    status: 'ok',
    calculatedAt: '2026-01-01T00:00:00Z',
    sourceDatasetIds: [],
    missingInputs: [],
    explanation: 'test',
  },
  primaryReason: 'Chậm tiến độ',
  reasonCategory: 'delayed',
  dataUpdatedAt: '2026-01-01T00:00:00Z',
  administrativeAreaCodes: ['daklak-buon-ma-thuot'],
};

describe('PriorityProjectsTable', () => {
  afterEach(cleanup);

  it('renders the requested table columns and localized status controls', () => {
    renderWithI18n(
      <PriorityProjectsTable
        items={[item]}
        attentionProjectCount={3}
        asOf={new Date('2026-01-01')}
      />,
    );
    expect(screen.getByRole('columnheader', { name: 'Tên dự án' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Xã, phường' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Lĩnh vực' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Tiến độ' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Trạng thái' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Tiến độ 42%' })).toBeInTheDocument();
    expect(screen.getByText('Chậm tiến độ')).toBeInTheDocument();
  });

  it('opens the summary from the project name and restores focus after Escape', () => {
    renderWithI18n(
      <PriorityProjectsTable
        items={[item]}
        attentionProjectCount={1}
        asOf={new Date('2026-01-01')}
      />,
    );
    const trigger = screen.getByRole('button', { name: 'Dự án đường thử nghiệm' });
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(document.activeElement).toBe(trigger);
  });
});
