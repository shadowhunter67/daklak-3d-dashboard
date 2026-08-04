import { useState } from 'react';
import { hasWebGLSupport } from '../../components/map/webglLifecycle';
import { MapErrorBoundary, MapFallback } from '../../components/map/MapFallback';
import { useMapStore } from '../../stores/mapStore';
import { useTranslation } from '../../i18n/useTranslation';
import { WorldScene } from './WorldScene';

/**
 * Phase T1 — "Khám phá Đắk Lắk 3D" / "Explore Đắk Lắk 3D" (`?view=world`).
 *
 * Vertical-slice foundation for the eventual Tourism Digital Twin (reports/tourism-digital-twin/
 * world-engine-adr.md). Purely additive: does not read or write any of the other views' state
 * (Executive Overview, `3d`, `table`, `map`), does not touch `src/entities/project/*`, and reuses
 * only the terrain/camera/GIS assets that already exist in the repo — see WorldTerrainMesh.tsx
 * and WorldFlyInCamera.tsx for exactly what is reused vs. newly written.
 *
 * "Stand Here" ground-level camera mode (viewshed-style "what can I see from here") is explicitly
 * OUT OF SCOPE for this slice — the existing terrain height data only lives in a GPU displacement
 * map sampled by the vertex shader, with no honest, already-available CPU-side elevation query the
 * task rules would allow faking. See reports/tourism-digital-twin/phase-status.md, "Deferred to
 * T2+".
 */
export function WorldExplorationView() {
  const { t } = useTranslation();
  const reducedMotion = useMapStore((state) => state.reducedMotion);
  const setViewMode = useMapStore((state) => state.setViewMode);
  const [webGLSupported] = useState(() => hasWebGLSupport());

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
