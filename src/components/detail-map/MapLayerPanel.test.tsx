import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_DETAIL_MAP_LAYER_STATE } from './detailMapTypes';
import { MapLayerPanel } from './MapLayerPanel';

const availableSources = {
  roads: true,
  administrativeBoundaries: true,
  terrain: false,
  satellite: false,
};

const noSources = {
  roads: false,
  administrativeBoundaries: false,
  terrain: false,
  satellite: false,
};

function renderPanel(sourceAvailability: typeof availableSources) {
  const onToggleLayer = vi.fn();
  const onBaseMapChange = vi.fn();
  render(
    <MapLayerPanel
      layers={DEFAULT_DETAIL_MAP_LAYER_STATE}
      sourceAvailability={sourceAvailability}
      onBaseMapChange={onBaseMapChange}
      onToggleLayer={onToggleLayer}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Lớp bản đồ' }));
  return { onToggleLayer, onBaseMapChange };
}

describe('MapLayerPanel', () => {
  afterEach(cleanup);

  it('keeps the exact label as the accessible name even when a layer is unavailable', () => {
    renderPanel(noSources);
    // A wordy accessible name (label text + hidden explanation concatenated) would make this
    // exact-match query fail — regressions here mean the explanation leaked into the name.
    expect(screen.getByRole('checkbox', { name: 'Heatmap' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Đường' })).toBeInTheDocument();
  });

  it('does not disable layer toggles when no source is configured, so URL preferences still round-trip', () => {
    const { onToggleLayer } = renderPanel(noSources);
    const heatmap = screen.getByRole('checkbox', { name: 'Heatmap' });
    expect(heatmap).not.toBeDisabled();
    fireEvent.click(heatmap);
    expect(onToggleLayer).toHaveBeenCalledWith('heatmapVisible');
  });

  it('describes why an unavailable layer has no visible effect yet', () => {
    renderPanel(noSources);
    const heatmap = screen.getByRole('checkbox', { name: 'Heatmap' });
    const describedById = heatmap.getAttribute('aria-describedby');
    expect(describedById).toBeTruthy();
    expect(document.getElementById(describedById as string)?.textContent).toMatch(
      /chưa có dữ liệu/,
    );
  });

  it('shows no unavailable explanation once sources are configured', () => {
    renderPanel(availableSources);
    const heatmap = screen.getByRole('checkbox', { name: 'Heatmap' });
    expect(heatmap).not.toHaveAttribute('aria-describedby');
  });
});
