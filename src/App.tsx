import { useEffect, useRef } from 'react';
import labels from './assets/maps/daklak/daklak-labels.json';
import { DashboardHeader } from './components/layout/DashboardHeader';
import { DashboardPanels } from './components/layout/DashboardPanels';
import { DatasetFooter } from './components/layout/DatasetFooter';
import { MapViewport } from './components/layout/MapViewport';
import { DetailMapViewport } from './components/detail-map/DetailMapViewport';
import { OnboardingOverlay } from './components/layout/OnboardingOverlay';
import { DataProvenancePanel } from './components/provenance/DataProvenancePanel';
import { datasetManifestIssues } from './data/datasetManifest';
import { useDashboardUrlSync } from './hooks/useDashboardUrlSync';
import { useMapStore } from './stores/mapStore';

// Not lazy, unlike StatPanel: it listens for provenancePanelSignal from first mount, the same
// way OnboardingOverlay listens for helpSignal — lazy-mounting it would race the signal (a click
// that fires before the chunk resolves would be missed, since the ref that tracks "previous
// signal" only starts existing once the component mounts). The JSON it reads is a few KB and
// mostly already bundled elsewhere; see check:budget output in the final report for the actual
// measured impact.

export default function App() {
  const viewMode = useMapStore((state) => state.viewMode);
  const selectedCode = useMapStore((state) => state.selectedCode);
  const setReducedMotion = useMapStore((state) => state.setReducedMotion);
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
    const targetId =
      viewMode === 'table'
        ? 'map-2d-title'
        : viewMode === 'map'
          ? 'detail-map-viewport'
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
  return (
    <main className="app-shell">
      <DashboardHeader />
      <MapViewport />
      {viewMode === 'map' && <DetailMapViewport />}
      <DashboardPanels />
      <OnboardingOverlay />
      <DataProvenancePanel />
      <p className="visually-hidden" aria-live="polite" aria-atomic="true">
        {viewMode === 'table'
          ? 'Đã mở danh sách 2D.'
          : viewMode === 'map'
            ? 'Đã mở bản đồ chi tiết.'
            : 'Đã mở bản đồ 3D.'}{' '}
        {selectedName ? `Đã chọn ${selectedName}.` : ''}
      </p>
      <DatasetFooter />
    </main>
  );
}
