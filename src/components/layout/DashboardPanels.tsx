import { lazy, Suspense, useEffect, useState } from 'react';
import { useMapStore } from '../../stores/mapStore';
import { DetailPanel } from '../dashboard/DetailPanel';
import { MobileDashboardSheet } from './MobileDashboardSheet';
import { TwoDimensionalView } from './TwoDimensionalView';

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
  if (viewMode === 'table') return <TwoDimensionalView />;
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
