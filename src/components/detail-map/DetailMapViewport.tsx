import { useCallback, useEffect, useRef, useState } from 'react';
import { useMapStore } from '../../stores/mapStore';
import { hasWebGLSupport } from '../map/webglLifecycle';
import { MapFallback, MapLoading } from '../map/MapFallback';
import { AccessibleDirectory } from '../dashboard/AccessibleDirectory';
import { FakeMapProvider } from './FakeMapProvider';
import { MapLibreProvider } from './MapLibreProvider';
import { MapLayerPanel } from './MapLayerPanel';
import { DetailMapSourceNotice } from './DetailMapSourceNotice';
import { DistanceMeasureTool } from './DistanceMeasureTool';
import { LocalSearch } from './LocalSearch';
import { useDetailMapCameraSync } from './useDetailMapCameraSync';
import { getWardBounds } from './wardBounds';
import { WARD_FLY_DURATION_MS } from './wardHighlightAnimation';
import {
  addMeasurementPoint,
  undoLastMeasurementPoint,
  type MeasurementPoint,
} from './distanceMeasurement';
import type {
  DetailedMapProvider,
  DetailMapSourceAvailability,
  MapInteractionMode,
} from './detailMapTypes';
import type { LocalSearchEntry } from './localSearchIndex';
import { useTranslation } from '../../i18n/useTranslation';

type LoadStatus = 'loading' | 'ready' | 'error';

function readSourceAvailability(): DetailMapSourceAvailability {
  const env = import.meta.env;
  return {
    roads: Boolean(env.VITE_DETAIL_MAP_SOURCE_URL),
    // Ranh giới hành chính đến từ GeoJSON đóng gói sẵn trong repo (daklak-wards-render.json,
    // xem wardBoundaryLayers.ts), không phụ thuộc nguồn PMTiles theo env như các lớp còn lại.
    administrativeBoundaries: true,
    // Layer "Chỉ số dashboard"/"Heatmap" (dashboard-metrics-fill/dashboard-heatmap) vẫn CHƯA tồn
    // tại trong style — đây là dữ liệu minh hoạ riêng (commune-demographic-illustrative/
    // heatmap-illustrative), không phải dữ liệu OSM roads/buildings mà VITE_DETAIL_MAP_SOURCE_URL
    // giờ trỏ tới. Cố tình KHÔNG khoá theo cùng biến env đó nữa (khác PR trước) — nếu không, đặt
    // VITE_DETAIL_MAP_SOURCE_URL cho OSM sẽ khiến Layer Panel nói sai là 2 layer này đã có dữ liệu.
    dashboardOverlays: false,
    terrain: Boolean(env.VITE_TERRAIN_SOURCE_URL),
    satellite: Boolean(env.VITE_SATELLITE_TILE_URL),
  };
}

/** Real PMTiles/vector source URL, when configured — see roadLayers.ts/detailMapStyle.ts for how
 * this becomes the style's actual vector source. `readSourceAvailability()` above only derives a
 * boolean from the same env var; `buildDetailMapStyle` needs the URL string itself.
 *
 * The env var itself is a relative filename (`.env.production`: `maps/daklak.pmtiles`, no leading
 * slash) joined with `BASE_URL` here — same convention as `src/data/loadRoads.ts`'s
 * `${import.meta.env.BASE_URL}data/...` and `MapLibreLoader.ts`'s worker URL. This app deploys
 * under a GitHub Pages subpath (`base: '/daklak-3d-dashboard/'` in vite.config.ts), so a
 * root-relative `/maps/daklak.pmtiles` value would 404 there — only a `BASE_URL`-prefixed path
 * resolves correctly in both dev and the deployed subpath. */
function readSourceUrl(): string | undefined {
  const url = import.meta.env.VITE_DETAIL_MAP_SOURCE_URL;
  return typeof url === 'string' && url.length > 0
    ? `${import.meta.env.BASE_URL}${url}`
    : undefined;
}

function createProvider(): DetailedMapProvider {
  const mode = import.meta.env.VITE_DETAIL_MAP_PROVIDER ?? 'maplibre';
  if (mode === 'fake') {
    if (import.meta.env.PROD) {
      console.warn(
        'VITE_DETAIL_MAP_PROVIDER=fake is set in a production build — the detail map is ' +
          'showing a placeholder, not a real map. This should only happen in development/CI.',
      );
    }
    return new FakeMapProvider();
  }
  return new MapLibreProvider();
}

export function DetailMapViewport() {
  const { t } = useTranslation();
  const layers = useMapStore((state) => state.detailMapLayers);
  const camera = useMapStore((state) => state.detailMapCamera);
  const selectedCode = useMapStore((state) => state.selectedCode);
  const reducedMotion = useMapStore((state) => state.reducedMotion);
  const select = useMapStore((state) => state.select);
  const setViewMode = useMapStore((state) => state.setViewMode);
  const setDetailMapBaseMap = useMapStore((state) => state.setDetailMapBaseMap);
  const toggleDetailMapLayer = useMapStore((state) => state.toggleDetailMapLayer);
  const setDetailMapPlanningOverlay = useMapStore((state) => state.setDetailMapPlanningOverlay);
  const setDetailMapCamera = useMapStore((state) => state.setDetailMapCamera);

  const [webGLSupported] = useState(() => hasWebGLSupport());
  // Sidebar directory (formerly the standalone 'table' view): open by default on desktop, closed
  // by default on narrow/portrait viewports so it doesn't cover the map on first load — same
  // matchMedia-on-mount idiom as DashboardPanels.tsx's mobilePortrait state. The user can toggle it
  // either way afterwards.
  const [directoryOpen, setDirectoryOpen] = useState(
    () => !(window.matchMedia?.('(max-width: 767px)').matches ?? false),
  );
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [generation, setGeneration] = useState(0);
  const [interactionMode, setInteractionMode] = useState<MapInteractionMode>('browse');
  const [measurementPoints, setMeasurementPoints] = useState<MeasurementPoint[]>([]);
  const [sourceAvailability] = useState(() => readSourceAvailability());
  const [sourceUrl] = useState(() => readSourceUrl());
  const containerRef = useRef<HTMLDivElement | null>(null);
  const providerRef = useRef<DetailedMapProvider | null>(null);
  const handleCameraChange = useDetailMapCameraSync();
  const interactionModeRef = useRef(interactionMode);
  useEffect(() => {
    interactionModeRef.current = interactionMode;
  }, [interactionMode]);
  // Đọc reducedMotion qua ref (không subscribe trực tiếp trong effect chọn ward bên dưới) để
  // việc bật/tắt hiệu ứng chuyển động của hệ điều hành giữa chừng không tự kích hoạt lại
  // animation trên ward đang được chọn — cùng nguyên tắc với AdministrativeMap2D.tsx.
  const reducedMotionRef = useRef(reducedMotion);
  useEffect(() => {
    reducedMotionRef.current = reducedMotion;
  }, [reducedMotion]);

  // This component only exists in the tree while `viewMode === 'map'` (see App.tsx) — it's fully
  // mounted/unmounted per entry into the detail map, unlike MapViewport/DashboardPanels which stay
  // mounted across view switches. So "just mounted" here always means "the user just entered the
  // detail map," which used to be decided by App.tsx's viewMode-change effect; that effect can no
  // longer reliably do it now that this component is lazy-loaded (its rAF could fire before the
  // chunk resolves and this element even exists).
  useEffect(() => {
    requestAnimationFrame(() => document.getElementById('detail-map-viewport')?.focus());
  }, []);

  useEffect(() => {
    if (!webGLSupported) return;
    let cancelled = false;
    const provider = createProvider();
    providerRef.current = provider;
    const container = containerRef.current;
    if (!container) return;

    provider
      .initialize(container, { camera, layers, sourceAvailability, sourceUrl })
      .then(() => {
        if (cancelled) return;
        provider.setSelectedWard(selectedCode);
        // Interaction priority: measurement mode owns clicks (adds a point, never selects a
        // ward); browse mode selects a ward. Read via ref so this closure (registered once)
        // always sees the current mode without re-subscribing on every mode change.
        provider.onWardClick((code) => {
          if (interactionModeRef.current === 'browse') select(code);
        });
        provider.onMapClick((point) => {
          if (interactionModeRef.current === 'measure') {
            setMeasurementPoints((points) => addMeasurementPoint(points, point));
          }
        });
        provider.onCameraChange(handleCameraChange);
        setStatus('ready');
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.error('Không thể khởi tạo bản đồ chi tiết', error);
        setStatus('error');
      });

    return () => {
      cancelled = true;
      provider.destroy();
      providerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately runs once per generation
  }, [generation]);

  // Chọn một ward: vừa làm nổi ranh giới (hiệu ứng sáng dần) vừa bay camera tới khung vừa vặn
  // quanh đơn vị đó — kiểu bản đồ động mapeffect.app. Gate theo status==='ready' để
  // ?view=map&ward=<code> cũng tự động frame/highlight ngay khi trang vừa tải xong.
  useEffect(() => {
    const provider = providerRef.current;
    if (!provider || status !== 'ready') return;
    const animate = !reducedMotionRef.current;
    provider.setSelectedWard(selectedCode, { animate });
    if (!selectedCode) return;
    const bounds = getWardBounds(selectedCode);
    if (bounds) provider.fitBounds(bounds, { animate, durationMs: WARD_FLY_DURATION_MS });
  }, [selectedCode, status]);

  // Keeps the mounted provider in sync with every layer-panel change (base map, roads, labels,
  // boundaries, metrics, heatmap). `detailMapLayers` in the store is always replaced as a whole
  // object, so it's always safe to hand the provider the complete state via setLayers() rather
  // than tracking which individual field changed. This also re-applies once, harmlessly, right
  // when `status` first becomes 'ready' — MapLibreProvider.initialize() already applied the
  // initial state itself by then, so this is a no-op re-application for it, but it's what
  // actually applies the initial state for any future provider that doesn't do that internally.
  useEffect(() => {
    if (status !== 'ready') return;
    providerRef.current?.setLayers(layers);
  }, [layers, status]);

  useEffect(() => {
    if (interactionMode !== 'measure') return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setInteractionMode('browse');
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [interactionMode]);

  const retry = useCallback(() => {
    setStatus('loading');
    setGeneration((value) => value + 1);
  }, []);
  const backToOverview = useCallback(() => setViewMode('3d'), [setViewMode]);

  const toggleMeasureMode = useCallback(() => {
    setInteractionMode((mode) => (mode === 'measure' ? 'browse' : 'measure'));
    setMeasurementPoints([]);
  }, []);

  const onSelectSearchResult = useCallback(
    (entry: LocalSearchEntry) => {
      const nextCamera = {
        latitude: entry.latitude,
        longitude: entry.longitude,
        zoom: 13,
        bearing: 0,
        pitch: 0,
      };
      providerRef.current?.setCamera(nextCamera);
      setDetailMapCamera(nextCamera);
      select(entry.code);
    },
    [select, setDetailMapCamera],
  );

  if (!webGLSupported) {
    return (
      <MapFallback reason={t('detailMapViewport.webglUnsupportedReason')}>
        <AccessibleDirectory />
      </MapFallback>
    );
  }

  if (status === 'error') {
    return (
      <div className="detail-map-error" role="alert">
        <h2>{t('detailMapViewport.errorHeading')}</h2>
        <p>{t('detailMapViewport.errorBody')}</p>
        <div className="detail-map-error__actions">
          <button type="button" onClick={retry}>
            {t('detailMapViewport.retry')}
          </button>
          <button type="button" onClick={backToOverview}>
            {t('detailMapViewport.backTo3d')}
          </button>
        </div>
        <div className="detail-map-error__directory">
          <AccessibleDirectory />
        </div>
      </div>
    );
  }

  return (
    <section
      id="detail-map-viewport"
      className="detail-map-viewport"
      aria-label={t('detailMapViewport.aria')}
      tabIndex={-1}
    >
      <div className={`detail-map-viewport__sidebar${directoryOpen ? '' : ' is-collapsed'}`}>
        {directoryOpen && <AccessibleDirectory />}
      </div>
      <button
        type="button"
        className="detail-map-viewport__sidebar-toggle"
        aria-expanded={directoryOpen}
        aria-controls="directory-title"
        onClick={() => setDirectoryOpen((open) => !open)}
      >
        {directoryOpen
          ? t('detailMapViewport.hideDirectory')
          : t('detailMapViewport.showDirectory')}
      </button>
      <div className="detail-map-stage">
        <div ref={containerRef} className="detail-map-canvas" key={generation} />
        {status === 'loading' && <MapLoading />}
        {status === 'ready' && !sourceAvailability.roads && <DetailMapSourceNotice />}
        {status === 'ready' && (
          <MapLayerPanel
            layers={layers}
            sourceAvailability={sourceAvailability}
            onBaseMapChange={setDetailMapBaseMap}
            onToggleLayer={toggleDetailMapLayer}
            onPlanningOverlayChange={setDetailMapPlanningOverlay}
            suppressEscapeClose={interactionMode === 'measure'}
            toolsSlot={
              <>
                <LocalSearch onSelect={onSelectSearchResult} />
                <DistanceMeasureTool
                  active={interactionMode === 'measure'}
                  points={measurementPoints}
                  onToggle={toggleMeasureMode}
                  onUndo={() => setMeasurementPoints((points) => undoLastMeasurementPoint(points))}
                  onClear={() => setMeasurementPoints([])}
                />
              </>
            }
          />
        )}
      </div>
    </section>
  );
}
