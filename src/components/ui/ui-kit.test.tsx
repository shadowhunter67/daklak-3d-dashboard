import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  DataTable,
  DonutChart,
  GaugeChart,
  KpiTile,
  PageHeader,
  PanelHeader,
  ProgressBar,
  SegmentedControl,
  StatList,
  StatusChip,
} from './';

describe('UI kit smoke render', () => {
  it('renders display components with accessible content', () => {
    render(
      <>
        <PanelHeader title="Panel" icon="i" />
        <KpiTile label="Units" value={12} tone="blue" />
        <StatusChip label="Ready" tone="success" dot />
        <ProgressBar value={42} />
        <DonutChart
          segments={[{ label: 'A', value: 2, tone: '#123' }]}
          totalLabel="total"
          ariaLabel="Breakdown"
        />
        <GaugeChart value={70} label="Score" />
        <StatList items={[{ label: 'One', value: 1 }]} />
        <PageHeader title="Overview" badge="Illustrative data" breadcrumbLabel="Trail" />
      </>,
    );
    expect(screen.getByRole('heading', { name: 'Panel' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '42');
    expect(screen.getByRole('img', { name: 'Breakdown' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Score: 70%' })).toBeInTheDocument();
    expect(screen.getByText('Illustrative data')).toBeInTheDocument();
  });
  it('supports controls and semantic table', () => {
    const change = vi.fn();
    render(
      <>
        <SegmentedControl
          options={[{ value: 'a', label: 'A' }]}
          value="a"
          onChange={change}
          label="Mode"
        />
        <DataTable
          caption="Rows"
          columns={[{ key: 'name', header: 'Name' }]}
          rows={[{ name: 'Alpha' }]}
        />
      </>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'A' }));
    expect(change).toHaveBeenCalledWith('a');
    expect(screen.getByRole('table', { name: 'Rows' })).toBeInTheDocument();
  });
});
