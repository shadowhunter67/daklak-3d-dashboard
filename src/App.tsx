import { lazy, Suspense, useEffect, useRef } from 'react';
import labels from './assets/maps/daklak/daklak-labels.json';
import { DashboardHeader } from './components/layout/DashboardHeader';
import { DashboardPanels } from './components/layout/DashboardPanels';
import { DatasetFooter } from './components/layout/DatasetFooter';
import { MapViewport } from './components/layout/MapViewport';
import { MapLoading } from './components/map/MapFallback';
import { OnboardingOverlay } from './components/layout/OnboardingOverlay';
import { datasetManifestIssues } from './data/datasetManifest';
import { ExecutiveOverview } from './features/executive-overview/ExecutiveOverview';
import { useDashboardUrlSync } from './hooks/useDashboardUrlSync';
import { useMapStore } from './stores/mapStore';

// Lazy: the detail map's own orchestration code (camera sync, search, distance measurement, the
// layer panel) has no reason to sit in the eager main chunk for a user who never opens it — only
// the maplibre-gl/pmtiles *library* itself was previously deferred (via MapLibreLoader.ts inside
// this module); this defers the orchestration component too.
const DetailMapViewport = lazy(() =>
  import('./components/detail-map/DetailMapViewport').then((module) => ({
    default: module.DetailMapViewport,
  })),
);

// Lazy, safely: `provenancePanelOpen` is a plain boolean in the always-loaded store (see
// mapStore.ts), not a signal counter — this component only mounts while that's true, so a click
// that fires before the chunk resolves can't be missed the way it could be with a counter-based
// "have I seen this value" ref that only starts existing once the lazy component itself mounts.
const DataProvenancePanel = lazy(() =>
  import('./components/provenance/DataProvenancePanel').then((module) => ({
    default: module.DataProvenancePanel,
  })),
);

function ProvenancePanelLoading() {
  return (
    <div className="provenance-panel-backdrop" role="status" aria-live="polite">
      Đang tải…
    </div>
  );
}

export default function App() {
  const viewMode = useMapStore((state) => state.viewMode);
  const selectedCode = useMapStore((state) => state.selectedCode);
  const setReducedMotion = useMapStore((state) => state.setReducedMotion);
  const provenancePanelOpen = useMapStore((state) => state.provenancePanelOpen);
  const previousView = useRef(viewMode);
  useDashboardUrlSync();

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [setReducedMotion]);

  useEffect(() => {
    if (previousView.current === viewMode) return;
    previousView.current = viewMode;
    // 'map' is handled inside DetailMapViewport itself (see there) — it's now a lazy boundary, so
    // an immediate rAF here could fire before its chunk has resolved and the element even exists.
    if (viewMode === 'map') return;
    const targetId =
      viewMode === 'table'
        ? 'map-2d-title'
        : viewMode === 'overview'
          ? 'executive-overview'
          : 'map-viewport';
    requestAnimationFrame(() => document.getElementById(targetId)?.focus());
  }, [viewMode]);

  if (datasetManifestIssues.length)
    return (
      <main className="app-fallback" role="alert">
        <h1>Dữ liệu cấu hình không hợp lệ</h1>
        <p>{datasetManifestIssues.join('. ')}</p>
      </main>
    );

  const selectedName = selectedCode
    ? (labels[selectedCode as keyof typeof labels]?.name ?? selectedCode)
    : null;
  const skipLinkTargetId =
    viewMode === 'table'
      ? 'map-2d-title'
      : viewMode === 'map'
        ? 'detail-map-viewport'
        : viewMode === 'overview'
          ? 'executive-overview'
          : 'map-viewport';
  return (
    <main className="app-shell">
      <a href={`#${skipLinkTargetId}`} className="skip-link">
        Bỏ qua để tới nội dung chính
      </a>
      <DashboardHeader />
      <MapViewport />
      {viewMode === 'map' && (
        <Suspense fallback={<MapLoading />}>
          <DetailMapViewport />
        </Suspense>
      )}
      {viewMode === 'overview' && <ExecutiveOverview />}
      <DashboardPanels />
      <OnboardingOverlay />
      {provenancePanelOpen && (
        <Suspense fallback={<ProvenancePanelLoading />}>
          <DataProvenancePanel />
        </Suspense>
      )}
      <p className="visually-hidden" aria-live="polite" aria-atomic="true">
        {viewMode === 'table'
          ? 'Đã mở danh sách 2D.'
          : viewMode === 'map'
            ? 'Đã mở bản đồ chi tiết.'
            : viewMode === 'overview'
              ? 'Đã mở tổng quan điều hành.'
              : 'Đã mở bản đồ 3D.'}{' '}
        {selectedName ? `Đã chọn ${selectedName}.` : ''}
      </p>
      <DatasetFooter />
    </main>
  );
}
