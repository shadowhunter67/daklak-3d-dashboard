import { useEffect, useRef, useState, type ReactNode } from 'react';
import { BaseMapSelector } from './BaseMapSelector';
import type {
  DetailBaseMap,
  DetailMapLayerState,
  DetailMapSourceAvailability,
} from './detailMapTypes';

type ToggleableLayer = Exclude<
  keyof DetailMapLayerState,
  'baseMap' | 'terrainVisible' | 'satelliteVisible'
>;

const layerToggles: Array<{ key: ToggleableLayer; label: string }> = [
  { key: 'roadsVisible', label: 'Đường' },
  { key: 'roadLabelsVisible', label: 'Tên đường' },
  { key: 'placeLabelsVisible', label: 'Địa danh' },
  { key: 'administrativeBoundariesVisible', label: 'Ranh giới hành chính' },
  { key: 'dashboardMetricsVisible', label: 'Chỉ số dashboard' },
  { key: 'heatmapVisible', label: 'Heatmap' },
];

export function MapLayerPanel({
  layers,
  sourceAvailability,
  onBaseMapChange,
  onToggleLayer,
  toolsSlot,
}: {
  layers: DetailMapLayerState;
  sourceAvailability: DetailMapSourceAvailability;
  onBaseMapChange: (baseMap: DetailBaseMap) => void;
  onToggleLayer: (layer: ToggleableLayer) => void;
  toolsSlot?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const firstControl = panelRef.current?.querySelector<HTMLElement>('input, button, [tabindex]');
    firstControl?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <div className="detail-map-layer-panel">
      <button
        type="button"
        ref={triggerRef}
        aria-expanded={open}
        aria-controls="detail-map-layer-panel-content"
        onClick={() => setOpen((value) => !value)}
      >
        Lớp bản đồ
      </button>
      {open && (
        <div
          id="detail-map-layer-panel-content"
          ref={panelRef}
          className="detail-map-layer-panel__content"
          aria-label="Tùy chọn lớp bản đồ"
        >
          <section aria-labelledby="detail-map-layer-panel-layers-heading">
            <h3 id="detail-map-layer-panel-layers-heading">Lớp thông tin</h3>
            {layerToggles.map((toggle) => (
              <label key={toggle.key} className="layer-toggle">
                <input
                  type="checkbox"
                  checked={layers[toggle.key] as boolean}
                  onChange={() => onToggleLayer(toggle.key)}
                />
                {toggle.label}
              </label>
            ))}
          </section>
          <section aria-labelledby="detail-map-layer-panel-basemap-heading">
            <h3 id="detail-map-layer-panel-basemap-heading">Loại bản đồ</h3>
            <BaseMapSelector
              value={layers.baseMap}
              sourceAvailability={sourceAvailability}
              onChange={onBaseMapChange}
            />
          </section>
          {toolsSlot && (
            <section aria-labelledby="detail-map-layer-panel-tools-heading">
              <h3 id="detail-map-layer-panel-tools-heading">Công cụ</h3>
              {toolsSlot}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
