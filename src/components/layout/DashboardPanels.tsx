import { lazy, Suspense, useEffect, useState } from 'react';
import { useMapStore } from '../../stores/mapStore';
import { DetailPanel } from '../dashboard/DetailPanel';
import { SceneToolsPanel } from '../dashboard/SceneToolsPanel';
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
  // The scene tools sit beside the sheet, not inside it. Closed — which is how the sheet starts
  // — its content is `display: none`, so anything in there leaves the accessibility tree as well
  // as the screen: a reduced-motion user could no longer find the auto-rotate control at all
  // (caught by e2e/dashboard.spec.ts's reduced-motion check on mobile-chromium). These controls
  // were always reachable in the header row before; they stay always reachable here.
  if (mobilePortrait)
    return (
      <>
        <SceneToolsPanel />
        <MobileDashboardSheet />
      </>
    );
  return (
    <div className="desktop-panels">
      <Suspense fallback={null}>
        <StatPanel />
      </Suspense>
      {/* One column, not two free-floating panels: the detail card is pinned to the top of the
          rail and the tools to the bottom, so the tools keep one position instead of sliding up
          and down as the card grows and shrinks with the hovered ward. */}
      <div className="scene-right-rail">
        <DetailPanel />
        <SceneToolsPanel />
      </div>
    </div>
  );
}
