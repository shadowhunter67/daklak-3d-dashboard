import { lazy, Suspense, useState } from 'react';
import { datasetManifest } from '../../data/datasetManifest';
import { useMapStore } from '../../stores/mapStore';
import { MapFallback, MapLoading } from '../map/MapFallback';
import { hasWebGLSupport } from '../map/webglLifecycle';
import { useTranslation } from '../../i18n/useTranslation';

const AdministrativeMap = lazy(() =>
  import('../map/AdministrativeMap').then((module) => ({ default: module.AdministrativeMap })),
);

export function MapViewport() {
  const { t } = useTranslation();
  const dataMode = useMapStore((state) => state.dataMode);
  const viewMode = useMapStore((state) => state.viewMode);
  const setViewMode = useMapStore((state) => state.setViewMode);
  const [webGLSupported] = useState(() => hasWebGLSupport());
  if (viewMode !== '3d') return null;
  return (
    <section
      id="map-viewport"
      className="map-stage"
      aria-label={t('mapViewport.aria')}
      tabIndex={-1}
    >
      {webGLSupported ? (
        <Suspense fallback={<MapLoading />}>
          <AdministrativeMap />
        </Suspense>
      ) : (
        <MapFallback
          reason={t('mapViewport.webglUnsupportedReason')}
          actionLabel={t('mapViewport.open2dList')}
          onRetry={() => setViewMode('table')}
        />
      )}
      {datasetManifest.metricStatus[dataMode] === 'illustrative' && (
        <div className="illustrative-watermark" aria-label={t('mapViewport.illustrativeAria')}>
          {t('mapViewport.illustrativeBadge')}
        </div>
      )}
      <div className="map-caption">
        <span>{t('mapViewport.coordinates')}</span>
        <p>{t('mapViewport.tagline')}</p>
      </div>
      <div className="compass" aria-hidden="true">
        N<br />
        <i>↑</i>
      </div>
    </section>
  );
}
