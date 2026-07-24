import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithI18n } from '../../i18n/tests/renderWithI18n';
import { DataSourcesPanel } from './DataSourcesPanel';

describe('DataSourcesPanel', () => {
  afterEach(cleanup);

  it('renders the registered source with its publisher, record count and risk level', () => {
    renderWithI18n(<DataSourcesPanel onClose={() => {}} />);
    expect(screen.getByText(/Sở Kế hoạch và Đầu tư/)).toBeInTheDocument();
    expect(screen.getByText('Thấp — đủ điều kiện tự động cập nhật')).toBeInTheDocument();
  });

  it('shows the source maturity label and the internal-fixture notice for a recorded fixture', () => {
    renderWithI18n(<DataSourcesPanel onClose={() => {}} />);
    expect(screen.getByText('Thử nghiệm')).toBeInTheDocument();
    expect(screen.getByText('Nguồn kiểm thử nội bộ — không gọi mạng.')).toBeInTheDocument();
  });

  it('describes the refresh cadence as scheduled, never as real-time', () => {
    renderWithI18n(<DataSourcesPanel onClose={() => {}} />);
    expect(screen.getByText('Cập nhật định kỳ (không phải thời gian thực)')).toBeInTheDocument();
    expect(screen.queryByText(/thời gian thực$/)).not.toBeInTheDocument();
  });

  it('calls onClose when the close button is activated', () => {
    const onClose = vi.fn();
    renderWithI18n(<DataSourcesPanel onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Đóng panel tình trạng nguồn dữ liệu' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('has an accessible region label', () => {
    renderWithI18n(<DataSourcesPanel onClose={() => {}} />);
    expect(
      screen.getByRole('region', { name: 'Tình trạng nguồn dữ liệu tự động' }),
    ).toBeInTheDocument();
  });
});
