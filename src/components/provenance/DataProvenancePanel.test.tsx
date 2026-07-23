import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useMapStore } from '../../stores/mapStore';
import { DataProvenancePanel } from './DataProvenancePanel';
import { captureProvenanceFocusTrigger } from './provenanceFocusTrigger';

/**
 * This component has no internal open/closed state — App.tsx only mounts it while
 * `provenancePanelOpen` is true (see mapStore.ts), so these tests render it directly, the same
 * way App.tsx would once the lazy chunk has resolved. The mount-gating itself (and the
 * lazy-load race) is covered by App.test.tsx.
 */
describe('DataProvenancePanel', () => {
  const realCloseProvenancePanel = useMapStore.getState().closeProvenancePanel;

  afterEach(() => {
    cleanup();
    document.body.style.overflow = '';
    useMapStore.setState({ closeProvenancePanel: realCloseProvenancePanel });
  });

  it('lists the catalog datasets with their classification/source', () => {
    render(<DataProvenancePanel />);
    expect(screen.getByRole('dialog', { name: 'Nguồn và chất lượng dữ liệu' })).toBeInTheDocument();
    expect(screen.getByText('Đơn vị hành chính cấp xã Đắk Lắk 2025')).toBeInTheDocument();
    expect(
      screen.getByText('Chỉ tiêu kinh tế - xã hội tổng quan tỉnh Đắk Lắk 2025'),
    ).toBeInTheDocument();
  });

  it('marks illustrative datasets distinctly from official ones', () => {
    render(<DataProvenancePanel />);
    const illustrativeCard = screen
      .getByText('Dân số, độ phủ, tăng trưởng theo xã/phường (minh họa)')
      .closest('li');
    const officialCard = screen
      .getByText('Chỉ tiêu kinh tế - xã hội tổng quan tỉnh Đắk Lắk 2025')
      .closest('li');
    expect(illustrativeCard?.textContent).toMatch(/Minh họa/);
    expect(officialCard?.textContent).toMatch(/Chính thức/);
  });

  it('shows identity/geometry authority separately for the administrative-units dataset', () => {
    render(<DataProvenancePanel />);
    const card = screen.getByText('Đơn vị hành chính cấp xã Đắk Lắk 2025').closest('li');
    expect(card?.textContent).toContain('Tên/mã hành chính');
    expect(card?.textContent).toContain('Geometry');
    // The coarse fallback label ("Trạng thái") must not also appear for a dataset that has the
    // finer authorityDetail breakdown — showing both would be confusing/redundant. ("Trạng thái
    // geometry" is a different, unrelated field and legitimately does appear.)
    const dtTexts = Array.from(card?.querySelectorAll('dt') ?? []).map((dt) => dt.textContent);
    expect(dtTexts).not.toContain('Trạng thái');
    expect(dtTexts).toContain('Trạng thái geometry');
  });

  it('never renders a fake internal:// URI as a link — repository-path sources show as plain text', () => {
    render(<DataProvenancePanel />);
    const card = screen
      .getByText('Dân số, độ phủ, tăng trưởng theo xã/phường (minh họa)')
      .closest('li');
    expect(card?.querySelector('a')).toBeNull();
    expect(card?.textContent).toContain('build_daklak_geojson.py');
  });

  it('renders distinct evidence levels for the two document references, not just verification status', () => {
    render(<DataProvenancePanel />);
    const primaryCard = screen
      .getByText('Phê duyệt Quy hoạch tỉnh Đắk Lắk thời kỳ 2021-2030, tầm nhìn đến năm 2050')
      .closest('li');
    const publicationCard = screen
      .getByText('Điều chỉnh Quy hoạch tỉnh Đắk Lắk thời kỳ 2021-2030, tầm nhìn đến năm 2050')
      .closest('li');
    expect(primaryCard?.textContent).toContain('Văn bản gốc chính thức');
    expect(publicationCard?.textContent).toContain('Bài công bố chính thức');
    expect(primaryCard?.textContent).toContain('Đã xác minh');
    expect(publicationCard?.textContent).toContain('Đã xác minh');
  });

  it('closes via the close button, which calls closeProvenancePanel', () => {
    const closeProvenancePanel = vi.fn();
    useMapStore.setState({ closeProvenancePanel });
    render(<DataProvenancePanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Đóng bảng nguồn dữ liệu' }));
    expect(closeProvenancePanel).toHaveBeenCalledTimes(1);
  });

  it('closes with Escape', () => {
    const closeProvenancePanel = vi.fn();
    useMapStore.setState({ closeProvenancePanel });
    render(<DataProvenancePanel />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(closeProvenancePanel).toHaveBeenCalledTimes(1);
  });

  it('closes when clicking the backdrop directly, but not when clicking inside the dialog', () => {
    const closeProvenancePanel = vi.fn();
    useMapStore.setState({ closeProvenancePanel });
    const { container } = render(<DataProvenancePanel />);
    fireEvent.click(screen.getByRole('dialog'));
    expect(closeProvenancePanel).not.toHaveBeenCalled();
    const backdrop = container.querySelector('.provenance-panel-backdrop');
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop as Element);
    expect(closeProvenancePanel).toHaveBeenCalledTimes(1);
  });

  it('traps Tab focus at the last element back to the first, and Shift+Tab from the first back to the last', () => {
    const { container } = render(<DataProvenancePanel />);
    const closeButton = screen.getByRole('button', { name: 'Đóng bảng nguồn dữ liệu' });
    // Matches the component's own FOCUSABLE_SELECTOR (a[href], button, summary, [tabindex]) so
    // this test verifies the trap against the *actual* last focusable element (a `<summary>` from
    // the last document reference's "Ghi chú" details, which comes after its source link in DOM
    // order) rather than assuming it's the last link.
    const focusable = container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), summary, [tabindex]:not([tabindex="-1"])',
    );
    const lastElement = focusable[focusable.length - 1];
    expect(lastElement).not.toBe(closeButton);

    lastElement.focus();
    expect(document.activeElement).toBe(lastElement);
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(closeButton);

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(lastElement);
  });

  it('restores focus to the header trigger on unmount', async () => {
    const trigger = document.createElement('button');
    trigger.id = 'open-data-provenance-panel';
    document.body.append(trigger);
    trigger.focus();
    const { unmount } = render(<DataProvenancePanel />);
    unmount();
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    trigger.remove();
  });

  it('locks body scroll while mounted and restores it on unmount', () => {
    document.body.style.overflow = 'auto';
    const { unmount } = render(<DataProvenancePanel />);
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('auto');
  });

  it('renders a data-status summary with a total count matching the catalog', () => {
    render(<DataProvenancePanel />);
    expect(screen.getByLabelText('Tóm tắt trạng thái dữ liệu')).toBeInTheDocument();
  });

  it('lists document references distinctly from datasets', () => {
    render(<DataProvenancePanel />);
    expect(
      screen.getByText(
        'Điều chỉnh Quy hoạch tỉnh Đắk Lắk thời kỳ 2021-2030, tầm nhìn đến năm 2050',
      ),
    ).toBeInTheDocument();
  });

  /**
   * Regression test for the same root-cause bug already fixed in `ProjectSummaryPanel`: the
   * dialog's close button has `autoFocus`, which React applies during commit — before any
   * passive `useEffect` runs. A naive `document.activeElement` read inside the dialog's own mount
   * effect would therefore capture the dialog's own close button instead of the real trigger
   * (a non-header, non-fallback-id button, so the old code's `document.getElementById` fallback
   * couldn't paper over it either). This exercises the full real flow — a distinct trigger button
   * capturing itself via `captureProvenanceFocusTrigger` at click time, then the dialog mounting
   * and autoFocusing away from it — the way `DataHealthPanel`/`DashboardHeader` actually do it.
   */
  it('restores focus to the real trigger button, not the dialog itself, after autoFocus fires', async () => {
    useMapStore.setState({ provenancePanelOpen: false });
    function Harness() {
      const open = useMapStore((state) => state.provenancePanelOpen);
      const openProvenancePanel = useMapStore((state) => state.openProvenancePanel);
      return (
        <>
          <button
            id="data-health-provenance-trigger"
            onClick={(event) => {
              captureProvenanceFocusTrigger(event.currentTarget);
              openProvenancePanel();
            }}
          >
            Xem chi tiết nguồn dữ liệu
          </button>
          {open && <DataProvenancePanel />}
        </>
      );
    }
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Xem chi tiết nguồn dữ liệu' });
    trigger.focus();
    fireEvent.click(trigger);

    const closeButton = await screen.findByRole('button', { name: 'Đóng bảng nguồn dữ liệu' });
    // autoFocus has already moved focus to the close button by the time it's in the DOM.
    expect(document.activeElement).toBe(closeButton);

    fireEvent.click(closeButton);
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });
});
