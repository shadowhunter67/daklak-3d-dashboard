import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useMapStore } from '../../stores/mapStore';
import { DataProvenancePanel } from './DataProvenancePanel';

describe('DataProvenancePanel', () => {
  beforeEach(() => {
    useMapStore.setState({ provenancePanelSignal: 0 });
  });
  afterEach(cleanup);

  it('stays closed until requested', () => {
    render(<DataProvenancePanel />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens on requestProvenancePanel and lists the catalog datasets with their classification/source', () => {
    render(<DataProvenancePanel />);
    act(() => useMapStore.getState().requestProvenancePanel());
    expect(screen.getByRole('dialog', { name: 'Nguồn và chất lượng dữ liệu' })).toBeInTheDocument();
    expect(screen.getByText('Đơn vị hành chính cấp xã Đắk Lắk 2025')).toBeInTheDocument();
    expect(
      screen.getByText('Chỉ tiêu kinh tế - xã hội tổng quan tỉnh Đắk Lắk 2025'),
    ).toBeInTheDocument();
  });

  it('marks illustrative datasets distinctly from official ones', () => {
    render(<DataProvenancePanel />);
    act(() => useMapStore.getState().requestProvenancePanel());
    const illustrativeCard = screen
      .getByText('Dân số, độ phủ, tăng trưởng theo xã/phường (minh họa)')
      .closest('li');
    const officialCard = screen
      .getByText('Chỉ tiêu kinh tế - xã hội tổng quan tỉnh Đắk Lắk 2025')
      .closest('li');
    expect(illustrativeCard?.textContent).toMatch(/Minh họa/);
    expect(officialCard?.textContent).toMatch(/Chính thức/);
  });

  it('closes with Escape and returns focus to the header trigger', async () => {
    const trigger = document.createElement('button');
    trigger.id = 'open-data-provenance-panel';
    document.body.append(trigger);
    trigger.focus();
    render(<DataProvenancePanel />);
    act(() => useMapStore.getState().requestProvenancePanel());
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    trigger.remove();
  });

  it('closes via the close button', () => {
    render(<DataProvenancePanel />);
    act(() => useMapStore.getState().requestProvenancePanel());
    fireEvent.click(screen.getByRole('button', { name: 'Đóng bảng nguồn dữ liệu' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders a data-status summary with a total count matching the catalog', () => {
    render(<DataProvenancePanel />);
    act(() => useMapStore.getState().requestProvenancePanel());
    expect(screen.getByLabelText('Tóm tắt trạng thái dữ liệu')).toBeInTheDocument();
  });

  it('lists document references distinctly from datasets', () => {
    render(<DataProvenancePanel />);
    act(() => useMapStore.getState().requestProvenancePanel());
    expect(
      screen.getByText(
        'Điều chỉnh Quy hoạch tỉnh Đắk Lắk thời kỳ 2021-2030, tầm nhìn đến năm 2050',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Cần xác minh thêm')).toBeInTheDocument();
  });
});
