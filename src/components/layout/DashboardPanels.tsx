import { lazy, Suspense, useEffect, useState } from 'react';
import { useMapStore } from '../../stores/mapStore';
import { DetailPanel } from '../dashboard/DetailPanel';
import { MobileDashboardSheet } from './MobileDashboardSheet';

const StatPanel = lazy(() =>
  import('../dashboard/StatPanel').then((module) => ({ default: module.StatPanel })),
);

export function DashboardPanels() {
  const viewMode = useMapStore((state) => state.viewMode);
  const [mobilePortrait, setMobilePortrait] = useState(
    () => window.matchMedia?.('(max-width: 767px) and (orientation: portrait)').matches ?? false,
  );
  useEffect(() => {
    if (!window.matchMedia) return;
    const media = window.matchMedia('(max-width: 767px) and (orientation: portrait)');
    const update = () => setMobilePortrait(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  // Executive Overview owns its own full-screen content (see App.tsx) — the floating 3D
  // stat/detail panels below are specific to the 3D experience.
  if (viewMode === 'overview') return null;
  if (viewMode === 'map') return null;
  // Phase T1 world-exploration owns its own full-screen scene (see App.tsx) — the floating 3D
  // stat/detail panels below are specific to the `3d` analytical view and read admin-unit
  // selection state the world scene deliberately does not touch (see WorldTerrainMesh.tsx).
  if (viewMode === 'world') return null;
  if (mobilePortrait) return <MobileDashboardSheet />;
  return (
    <div className="desktop-panels">
      <Suspense fallback={null}>
        <StatPanel />
      </Suspense>
      <DetailPanel />
    </div>
  );
}
