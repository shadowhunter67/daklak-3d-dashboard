import { useEffect, useState } from 'react';
import { hasWebGLSupport } from '../../components/map/webglLifecycle';
import { MapErrorBoundary, MapFallback } from '../../components/map/MapFallback';
import { useMapStore } from '../../stores/mapStore';
import { useTranslation } from '../../i18n/useTranslation';
import { WorldScene } from './WorldScene';
import { WorldHud } from './hud/WorldHud';
import { useWorldExplorationStore } from './state/worldExplorationStore';

/**
 * "Khám phá Đắk Lắk 3D" / "Explore Đắk Lắk 3D" (`?view=world`) — Phase T1's illustrative fly-in
 * foundation, Phase T2's real sourced destination markers, and Phase T3's interactive Walk/Fly
 * /Tour exploration (`reports/tourism-digital-twin/`) all live under this one route. Purely
 * additive throughout: does not read or write any of the other views' state (Executive Overview,
 * `3d`, `table`, `map`), does not touch `src/entities/project/*`, and reuses the terrain/camera
 * /GIS assets and app-wide nav (`DashboardHeader`, mounted once in `App.tsx` regardless of
 * `viewMode` — this route has no separate "back to overview" button of its own) that already
 * exist in the repo. See `WorldScene.tsx` for the Phase T1 intro -> Phase T3 handoff, and
 * `docs/world-exploration.md` for the full architecture writeup.
 */
export function WorldExplorationView() {
  const { t } = useTranslation();
  const reducedMotion = useMapStore((state) => state.reducedMotion);
  const setViewMode = useMapStore((state) => state.setViewMode);
  const setWorldReducedMotion = useWorldExplorationStore((state) => state.setReducedMotion);
  const [webGLSupported] = useState(() => hasWebGLSupport());

  // Mirrored into world-exploration's own store (not read directly from `useMapStore` inside
  // `tourEngine.ts`/`TourRig.tsx`) — same isolation rationale as every other world-exploration
  // state decision: this scene's internals depend only on its own store.
  useEffect(() => {
    setWorldReducedMotion(reducedMotion);
  }, [reducedMotion, setWorldReducedMotion]);

  return (
    <section
      id="world-viewport"
      className="map-stage world-exploration"
      aria-label={t('worldExploration.aria')}
      tabIndex={-1}
    >
      {webGLSupported ? (
        <MapErrorBoundary>
          <WorldScene reducedMotion={reducedMotion} />
          <WorldHud />
        </MapErrorBoundary>
      ) : (
        <MapFallback
          reason={t('worldExploration.webglUnsupportedReason')}
          actionLabel={t('worldExploration.backToOverview')}
          onRetry={() => setViewMode('overview')}
        />
      )}
      <div
        className="illustrative-watermark world-exploration__badge"
        aria-label={t('worldExploration.illustrativeAria')}
      >
        {t('worldExploration.illustrativeBadge')}
      </div>
      <div className="map-caption world-exploration__caption">
        <span>{t('worldExploration.title')}</span>
        <p>{t('worldExploration.tagline')}</p>
      </div>
    </section>
  );
}
