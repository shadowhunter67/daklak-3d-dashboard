import { useEffect, useRef, useState, type ReactNode } from 'react';
import { getLayerDescriptor } from '../../data-platform/catalog/layers';
import { BaseMapSelector } from './BaseMapSelector';
import { PlanningOverlaySelector } from './PlanningOverlaySelector';
import {
  KEY_PROJECT_STATUS_COLOR,
  KEY_PROJECT_STATUS_LABEL,
  type KeyProjectStatus,
} from './keyProjects';
import { useTranslation } from '../../i18n/useTranslation';
import type {
  DetailBaseMap,
  DetailMapLayerState,
  DetailMapSourceAvailability,
  PlanningOverlay,
} from './detailMapTypes';

type ToggleableLayer = Exclude<
  keyof DetailMapLayerState,
  'baseMap' | 'terrainVisible' | 'satelliteVisible' | 'planningOverlay'
>;

/**
 * Toggle order/availability-gating stays local (it depends on this map's own
 * `DetailMapSourceAvailability` shape, which is specific to this renderer — not something the
 * renderer-agnostic `MapLayerDescriptor` schema should encode). Only the display copy comes from
 * the layer registry (`src/data-platform/catalog/layers.ts`), so a title/legend change has one
 * source of truth instead of being hand-duplicated here.
 */
const KEY_PROJECT_STATUS_ORDER: KeyProjectStatus[] = [
  'chuan-bi',
  'sap-khoi-cong',
  'dang-thi-cong',
  'hoan-thanh',
];

function KeyProjectsLegend() {
  const { t } = useTranslation();
  return (
    <div className="key-projects-legend">
      <ul aria-label={t('layerPanel.keyProjectsLegendLabel')}>
        {KEY_PROJECT_STATUS_ORDER.map((status) => (
          <li key={status}>
            <span
              className="key-projects-legend__dot"
              style={{ background: KEY_PROJECT_STATUS_COLOR[status] }}
              aria-hidden="true"
            />
            {KEY_PROJECT_STATUS_LABEL[status]}
          </li>
        ))}
      </ul>
      <p className="key-projects-legend__note">{t('layerPanel.keyProjectsNote')}</p>
    </div>
  );
}

/** Progressive disclosure (spec §X): a non-technical viewer opens the panel to "Cơ bản" — the 5
 * layers a leader actually reasons about (place names, roads, key projects, approved planning
 * zones). Everything else (street names, POI labels, buildings, dashboard metric overlays,
 * heatmap) only appears once they switch to "Nâng cao". Toggle order/availability-gating stays
 * local (depends on this map's own `DetailMapSourceAvailability` shape) — only the display copy
 * comes from the layer registry. */
const basicLayerToggles: Array<{
  key: ToggleableLayer;
  /** Which sourceAvailability flag gates this layer's actual rendering (see MapLibreProvider.ts). */
  unavailableWhen: keyof DetailMapSourceAvailability;
}> = [
  { key: 'administrativeBoundariesVisible', unavailableWhen: 'administrativeBoundaries' },
  // Ward names ship from the same bundled data as the boundaries, so they gate on the same
  // always-true availability flag.
  { key: 'wardLabelsVisible', unavailableWhen: 'administrativeBoundaries' },
  { key: 'roadsVisible', unavailableWhen: 'roads' },
  // Bundled, externally-sourced reference layer — always available.
  { key: 'keyProjectsVisible', unavailableWhen: 'administrativeBoundaries' },
  { key: 'planningZonesVisible', unavailableWhen: 'administrativeBoundaries' },
];
const advancedLayerToggles: typeof basicLayerToggles = [
  { key: 'roadLabelsVisible', unavailableWhen: 'roads' },
  { key: 'placeLabelsVisible', unavailableWhen: 'roads' },
  { key: 'buildingsVisible', unavailableWhen: 'roads' },
  { key: 'dashboardMetricsVisible', unavailableWhen: 'dashboardOverlays' },
  { key: 'heatmapVisible', unavailableWhen: 'dashboardOverlays' },
];

function LayerToggleRow({
  toggle,
  layers,
  sourceAvailability,
  onToggleLayer,
}: {
  toggle: { key: ToggleableLayer; unavailableWhen: keyof DetailMapSourceAvailability };
  layers: DetailMapLayerState;
  sourceAvailability: DetailMapSourceAvailability;
  onToggleLayer: (layer: ToggleableLayer) => void;
}) {
  const { t } = useTranslation();
  const unavailable = !sourceAvailability[toggle.unavailableWhen];
  const reasonId = `layer-${toggle.key}-unavailable-reason`;
  const label = getLayerDescriptor(toggle.key)?.title ?? toggle.key;
  return (
    // The unavailable-reason text below is a SIBLING of the label, not nested inside it — nesting
    // it would make it part of the checkbox's accessible NAME (via the native label-wraps-control
    // "name from content" rule), not just its description, turning "Heatmap" into a full sentence
    // for every assistive-tech/query lookup.
    <div>
      <label
        className={unavailable ? 'layer-toggle layer-toggle--unavailable' : 'layer-toggle'}
        title={unavailable ? t('layerPanel.unavailableTitle') : undefined}
      >
        <input
          type="checkbox"
          checked={layers[toggle.key] as boolean}
          onChange={() => onToggleLayer(toggle.key)}
          aria-describedby={unavailable ? reasonId : undefined}
        />
        {label}
        {unavailable && (
          <span aria-hidden="true" className="layer-toggle__note">
            {t('layerPanel.unavailableNote')}
          </span>
        )}
      </label>
      {unavailable && (
        <span id={reasonId} className="visually-hidden">
          {t('layerPanel.unavailableReason')}
        </span>
      )}
    </div>
  );
}

export function MapLayerPanel({
  layers,
  sourceAvailability,
  onBaseMapChange,
  onToggleLayer,
  onPlanningOverlayChange,
  toolsSlot,
  suppressEscapeClose = false,
}: {
  layers: DetailMapLayerState;
  sourceAvailability: DetailMapSourceAvailability;
  onBaseMapChange: (baseMap: DetailBaseMap) => void;
  onToggleLayer: (layer: ToggleableLayer) => void;
  onPlanningOverlayChange: (overlay: PlanningOverlay) => void;
  toolsSlot?: ReactNode;
  /**
   * True while a child tool (distance measurement) owns Escape for its own exit. Without this,
   * Escape would both exit the tool AND close this whole panel in the same keypress, since both
   * listen at the document level and neither should have to guess at the other's DOM order.
   */
  suppressEscapeClose?: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'basic' | 'advanced'>('basic');
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
        {t('layerPanel.trigger')}
      </button>
      {open && (
        <div
          id="detail-map-layer-panel-content"
          ref={panelRef}
          className="detail-map-layer-panel__content"
          aria-label={t('layerPanel.contentAria')}
        >
          <section aria-labelledby="detail-map-layer-panel-layers-heading">
            <div
              className="detail-map-layer-panel__mode"
              role="group"
              aria-label={t('layerPanel.modeGroupLabel')}
            >
              <button
                type="button"
                aria-pressed={mode === 'basic'}
                onClick={() => setMode('basic')}
              >
                {t('layerPanel.modeBasic')}
              </button>
              <button
                type="button"
                aria-pressed={mode === 'advanced'}
                onClick={() => setMode('advanced')}
              >
                {t('layerPanel.modeAdvanced')}
              </button>
            </div>
            <h3 id="detail-map-layer-panel-layers-heading">{t('layerPanel.layersHeading')}</h3>
            {basicLayerToggles.map((toggle) => (
              <LayerToggleRow
                key={toggle.key}
                toggle={toggle}
                layers={layers}
                sourceAvailability={sourceAvailability}
                onToggleLayer={onToggleLayer}
              />
            ))}
            {layers.keyProjectsVisible && <KeyProjectsLegend />}
            {mode === 'advanced' && (
              <>
                <h3 id="detail-map-layer-panel-advanced-layers-heading">
                  {t('layerPanel.advancedLayersHeading')}
                </h3>
                {advancedLayerToggles.map((toggle) => (
                  <LayerToggleRow
                    key={toggle.key}
                    toggle={toggle}
                    layers={layers}
                    sourceAvailability={sourceAvailability}
                    onToggleLayer={onToggleLayer}
                  />
                ))}
              </>
            )}
          </section>
          <section aria-labelledby="detail-map-layer-panel-basemap-heading">
            <h3 id="detail-map-layer-panel-basemap-heading">{t('layerPanel.baseMapHeading')}</h3>
            <BaseMapSelector
              value={layers.baseMap}
              sourceAvailability={sourceAvailability}
              onChange={onBaseMapChange}
            />
          </section>
          <section aria-labelledby="detail-map-layer-panel-planning-heading">
            <h3 id="detail-map-layer-panel-planning-heading">{t('layerPanel.planningHeading')}</h3>
            <PlanningOverlaySelector
              value={layers.planningOverlay}
              onChange={onPlanningOverlayChange}
            />
          </section>
          {toolsSlot && (
            <section aria-labelledby="detail-map-layer-panel-tools-heading">
              <h3 id="detail-map-layer-panel-tools-heading">{t('layerPanel.toolsHeading')}</h3>
              {toolsSlot}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
