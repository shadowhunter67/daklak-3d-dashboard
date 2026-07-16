import { lazy, Suspense } from 'react';
import { useMapStore } from '../../stores/mapStore';
import { AccessibleDirectory } from '../dashboard/AccessibleDirectory';
import { DetailPanel } from '../dashboard/DetailPanel';

const StatPanel = lazy(() =>
  import('../dashboard/StatPanel').then((module) => ({ default: module.StatPanel })),
);

export function DashboardPanels() {
  const viewMode = useMapStore((state) => state.viewMode);
  if (viewMode === 'table') return <AccessibleDirectory />;
  return (
    <>
      <Suspense fallback={null}>
        <StatPanel />
      </Suspense>
      <DetailPanel />
    </>
  );
}
