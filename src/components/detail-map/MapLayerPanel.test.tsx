import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithI18n as render } from '../../i18n/tests/renderWithI18n';
import { DEFAULT_DETAIL_MAP_LAYER_STATE } from './detailMapTypes';
import { MapLayerPanel } from './MapLayerPanel';

const availableSources = {
  roads: true,
  administrativeBoundaries: true,
  dashboardOverlays: true,
  terrain: false,
  satellite: false,
};

const noSources = {
  roads: false,
  administrativeBoundaries: false,
  dashboardOverlays: false,
  terrain: false,
  satellite: false,
};

function renderPanel(sourceAvailability: typeof availableSources) {
  const onToggleLayer = vi.fn();
  const onBaseMapChange = vi.fn();
  const onPlanningOverlayChange = vi.fn();
  render(
    <MapLayerPanel
      layers={DEFAULT_DETAIL_MAP_LAYER_STATE}
      sourceAvailability={sourceAvailability}
      onBaseMapChange={onBaseMapChange}
      onToggleLayer={onToggleLayer}
      onPlanningOverlayChange={onPlanningOverlayChange}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Lớp bản đồ' }));
  return { onToggleLayer, onBaseMapChange, onPlanningOverlayChange };
}

/** Heatmap/street-names/POI-labels/buildings/dashboard-metrics only render once "Nâng cao" is
 * selected — the panel opens to "Cơ bản" by default (spec §X: progressive disclosure). */
function switchToAdvanced() {
  fireEvent.click(screen.getByRole('button', { name: 'Nâng cao' }));
}

describe('MapLayerPanel', () => {
  afterEach(cleanup);

  it('keeps the exact label as the accessible name even when a layer is unavailable', () => {
    renderPanel(noSources);
    switchToAdvanced();
    // A wordy accessible name (label text + hidden explanation concatenated) would make this
    // exact-match query fail — regressions here mean the explanation leaked into the name.
    expect(screen.getByRole('checkbox', { name: 'Heatmap' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Đường' })).toBeInTheDocument();
  });

  it('does not disable layer toggles when no source is configured, so URL preferences still round-trip', () => {
    const { onToggleLayer } = renderPanel(noSources);
    switchToAdvanced();
    const heatmap = screen.getByRole('checkbox', { name: 'Heatmap' });
    expect(heatmap).not.toBeDisabled();
    fireEvent.click(heatmap);
    expect(onToggleLayer).toHaveBeenCalledWith('heatmapVisible');
  });

  it('describes why an unavailable layer has no visible effect yet', () => {
    renderPanel(noSources);
    switchToAdvanced();
    const heatmap = screen.getByRole('checkbox', { name: 'Heatmap' });
    const describedById = heatmap.getAttribute('aria-describedby');
    expect(describedById).toBeTruthy();
    expect(document.getElementById(describedById as string)?.textContent).toMatch(
      /chưa có dữ liệu/,
    );
  });

  it('shows no unavailable explanation once sources are configured', () => {
    renderPanel(availableSources);
    switchToAdvanced();
    const heatmap = screen.getByRole('checkbox', { name: 'Heatmap' });
    expect(heatmap).not.toHaveAttribute('aria-describedby');
  });

  it('defaults to Basic mode, hiding advanced-only layers like Heatmap until switched', () => {
    renderPanel(availableSources);
    expect(screen.queryByRole('checkbox', { name: 'Heatmap' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cơ bản' })).toHaveAttribute('aria-pressed', 'true');
    switchToAdvanced();
    expect(screen.getByRole('checkbox', { name: 'Heatmap' })).toBeInTheDocument();
  });

  it('exposes a standalone "Tên xã/phường" toggle wired to wardLabelsVisible', () => {
    const { onToggleLayer } = renderPanel(availableSources);
    const wardNames = screen.getByRole('checkbox', { name: 'Tên xã/phường' });
    expect(wardNames).not.toBeDisabled();
    fireEvent.click(wardNames);
    expect(onToggleLayer).toHaveBeenCalledWith('wardLabelsVisible');
  });

  it('marks the ward-name toggle available on the same bundled-data flag as the boundary toggle', () => {
    // administrativeBoundaries is always true in the real app (bundled GeoJSON), so with it set
    // neither the boundary nor the ward-name toggle carries an "unavailable" explanation.
    renderPanel(availableSources);
    expect(screen.getByRole('checkbox', { name: 'Tên xã/phường' })).not.toHaveAttribute(
      'aria-describedby',
    );
  });

  it('offers the illustrative planning overlays as a radio group, defaulting to "Không hiển thị"', () => {
    const { onPlanningOverlayChange } = renderPanel(availableSources);
    const off = screen.getByRole('radio', { name: 'Không hiển thị' });
    expect(off).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Lâm nghiệp (3 loại rừng)' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Sử dụng đất' }));
    expect(onPlanningOverlayChange).toHaveBeenCalledWith('land-use');
  });

  it('offers the key-projects reference toggle, and reveals its status legend + caveat when on', () => {
    const { onToggleLayer } = renderPanel(availableSources);
    const toggle = screen.getByRole('checkbox', { name: 'Dự án trọng điểm (tham khảo)' });
    expect(toggle).not.toBeChecked();
    fireEvent.click(toggle);
    expect(onToggleLayer).toHaveBeenCalledWith('keyProjectsVisible');

    // legend only renders when the layer is on
    cleanup();
    render(
      <MapLayerPanel
        layers={{ ...DEFAULT_DETAIL_MAP_LAYER_STATE, keyProjectsVisible: true }}
        sourceAvailability={availableSources}
        onBaseMapChange={vi.fn()}
        onToggleLayer={vi.fn()}
        onPlanningOverlayChange={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Lớp bản đồ' }));
    expect(screen.getByText('Đang thi công')).toBeInTheDocument();
    expect(screen.getByText(/chưa kiểm chứng thực địa/i)).toBeInTheDocument();
  });

  it('offers the approved-planning-zone reference toggle', () => {
    const { onToggleLayer } = renderPanel(availableSources);
    const toggle = screen.getByRole('checkbox', { name: 'Ranh quy hoạch đã duyệt (tham khảo)' });
    expect(toggle).not.toBeChecked();
    fireEvent.click(toggle);
    expect(onToggleLayer).toHaveBeenCalledWith('planningZonesVisible');
  });

  it('shows the active planning theme legend and the "no legal validity" disclaimer', () => {
    render(
      <MapLayerPanel
        layers={{ ...DEFAULT_DETAIL_MAP_LAYER_STATE, planningOverlay: 'forestry' }}
        sourceAvailability={availableSources}
        onBaseMapChange={vi.fn()}
        onToggleLayer={vi.fn()}
        onPlanningOverlayChange={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Lớp bản đồ' }));
    expect(screen.getByText('Rừng đặc dụng')).toBeInTheDocument();
    expect(screen.getByText(/không có giá trị pháp lý/i)).toBeInTheDocument();
  });
});
