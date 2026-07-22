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

const layerToggles: Array<{
  key: ToggleableLayer;
  label: string;
  /** Which sourceAvailability flag gates this layer's actual rendering (see MapLibreProvider.ts). */
  unavailableWhen: keyof DetailMapSourceAvailability;
}> = [
  { key: 'roadsVisible', label: 'Đường', unavailableWhen: 'roads' },
  { key: 'roadLabelsVisible', label: 'Tên đường', unavailableWhen: 'roads' },
  { key: 'placeLabelsVisible', label: 'Địa danh', unavailableWhen: 'roads' },
  {
    key: 'administrativeBoundariesVisible',
    label: 'Ranh giới hành chính',
    unavailableWhen: 'administrativeBoundaries',
  },
  {
    key: 'dashboardMetricsVisible',
    label: 'Chỉ số dashboard',
    unavailableWhen: 'administrativeBoundaries',
  },
  { key: 'heatmapVisible', label: 'Heatmap', unavailableWhen: 'administrativeBoundaries' },
];

export function MapLayerPanel({
  layers,
  sourceAvailability,
  onBaseMapChange,
  onToggleLayer,
  toolsSlot,
  suppressEscapeClose = false,
}: {
  layers: DetailMapLayerState;
  sourceAvailability: DetailMapSourceAvailability;
  onBaseMapChange: (baseMap: DetailBaseMap) => void;
  onToggleLayer: (layer: ToggleableLayer) => void;
  toolsSlot?: ReactNode;
  /**
   * True while a child tool (distance measurement) owns Escape for its own exit. Without this,
   * Escape would both exit the tool AND close this whole panel in the same keypress, since both
   * listen at the document level and neither should have to guess at the other's DOM order.
   */
  suppressEscapeClose?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const firstControl = panelRef.current?.querySelector<HTMLElement>('input, button, [tabindex]');
    firstControl?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !suppressEscapeClose) {
        event.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, suppressEscapeClose]);

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
            {layerToggles.map((toggle) => {
              const unavailable = !sourceAvailability[toggle.unavailableWhen];
              const reasonId = `layer-${toggle.key}-unavailable-reason`;
              return (
                // The unavailable-reason text below is a SIBLING of the label, not nested inside
                // it — nesting it would make it part of the checkbox's accessible NAME (via the
                // native label-wraps-control "name from content" rule), not just its description,
                // turning "Heatmap" into a full sentence for every assistive-tech/query lookup.
                <div key={toggle.key}>
                  <label
                    className={
                      unavailable ? 'layer-toggle layer-toggle--unavailable' : 'layer-toggle'
                    }
                    title={
                      unavailable
                        ? 'Lựa chọn vẫn được lưu và áp dụng ngay khi có nguồn dữ liệu; hiện chưa hiển thị trên bản đồ.'
                        : undefined
                    }
                  >
                    <input
                      type="checkbox"
                      checked={layers[toggle.key] as boolean}
                      onChange={() => onToggleLayer(toggle.key)}
                      aria-describedby={unavailable ? reasonId : undefined}
                    />
                    {toggle.label}
                    {unavailable && (
                      <span aria-hidden="true" className="layer-toggle__note">
                        (chưa có dữ liệu)
                      </span>
                    )}
                  </label>
                  {unavailable && (
                    <span id={reasonId} className="visually-hidden">
                      Lựa chọn vẫn được lưu và áp dụng ngay khi có nguồn dữ liệu; hiện chưa có dữ
                      liệu để hiển thị trên bản đồ.
                    </span>
                  )}
                </div>
              );
            })}
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
