import { useCallback, useEffect, useRef, useState } from 'react';
import { useMapStore } from '../../stores/mapStore';
import { hasWebGLSupport } from '../map/webglLifecycle';
import { MapFallback, MapLoading } from '../map/MapFallback';
import { FakeMapProvider } from './FakeMapProvider';
import { MapLibreProvider } from './MapLibreProvider';
import { MapLayerPanel } from './MapLayerPanel';
import { DistanceMeasureTool } from './DistanceMeasureTool';
import { LocalSearch } from './LocalSearch';
import { useDetailMapCameraSync } from './useDetailMapCameraSync';
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

type LoadStatus = 'loading' | 'ready' | 'error';

function readSourceAvailability(): DetailMapSourceAvailability {
  const env = import.meta.env;
  return {
    roads: Boolean(env.VITE_DETAIL_MAP_SOURCE_URL),
    administrativeBoundaries: Boolean(env.VITE_DETAIL_MAP_SOURCE_URL),
    terrain: Boolean(env.VITE_TERRAIN_SOURCE_URL),
    satellite: Boolean(env.VITE_SATELLITE_TILE_URL),
  };
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
  const layers = useMapStore((state) => state.detailMapLayers);
  const camera = useMapStore((state) => state.detailMapCamera);
  const selectedCode = useMapStore((state) => state.selectedCode);
  const select = useMapStore((state) => state.select);
  const setViewMode = useMapStore((state) => state.setViewMode);
  const setDetailMapBaseMap = useMapStore((state) => state.setDetailMapBaseMap);
  const toggleDetailMapLayer = useMapStore((state) => state.toggleDetailMapLayer);
  const setDetailMapCamera = useMapStore((state) => state.setDetailMapCamera);

  const [webGLSupported] = useState(() => hasWebGLSupport());
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [generation, setGeneration] = useState(0);
  const [interactionMode, setInteractionMode] = useState<MapInteractionMode>('browse');
  const [measurementPoints, setMeasurementPoints] = useState<MeasurementPoint[]>([]);
  const [sourceAvailability] = useState(() => readSourceAvailability());
  const containerRef = useRef<HTMLDivElement | null>(null);
  const providerRef = useRef<DetailedMapProvider | null>(null);
  const handleCameraChange = useDetailMapCameraSync();
  const interactionModeRef = useRef(interactionMode);
  useEffect(() => {
    interactionModeRef.current = interactionMode;
  }, [interactionMode]);

  useEffect(() => {
    if (!webGLSupported) return;
    let cancelled = false;
    const provider = createProvider();
    providerRef.current = provider;
    const container = containerRef.current;
    if (!container) return;

    provider
      .initialize(container, { camera, layers, sourceAvailability })
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

  useEffect(() => {
    providerRef.current?.setSelectedWard(selectedCode);
  }, [selectedCode]);

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
  const openDirectory = useCallback(() => setViewMode('table'), [setViewMode]);

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
      <MapFallback
        reason="Trình duyệt hoặc thiết bị này không hỗ trợ WebGL nên không thể mở bản đồ chi tiết. Danh sách 2D vẫn khả dụng."
        actionLabel="Mở danh sách 2D"
        onRetry={openDirectory}
      />
    );
  }

  if (status === 'error') {
    return (
      <div className="detail-map-error" role="alert">
        <h2>Không thể tải bản đồ chi tiết</h2>
        <p>Đã có lỗi khi khởi tạo bản đồ chi tiết. Bạn có thể thử lại hoặc chọn chế độ khác.</p>
        <div className="detail-map-error__actions">
          <button type="button" onClick={retry}>
            Thử lại
          </button>
          <button type="button" onClick={backToOverview}>
            Quay về tổng quan 3D
          </button>
          <button type="button" onClick={openDirectory}>
            Mở danh sách 2D
          </button>
        </div>
      </div>
    );
  }

  return (
    <section
      id="detail-map-viewport"
      className="detail-map-viewport"
      aria-label="Bản đồ chi tiết"
      tabIndex={-1}
    >
      <div ref={containerRef} className="detail-map-canvas" key={generation} />
      {status === 'loading' && <MapLoading />}
      {status === 'ready' && (
        <MapLayerPanel
          layers={layers}
          sourceAvailability={sourceAvailability}
          onBaseMapChange={setDetailMapBaseMap}
          onToggleLayer={toggleDetailMapLayer}
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
    </section>
  );
}
