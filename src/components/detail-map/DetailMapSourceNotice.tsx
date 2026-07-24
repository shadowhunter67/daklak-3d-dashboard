import { useTranslation } from '../../i18n/useTranslation';

/**
 * A permanent, honest explanation shown over the (currently empty) map canvas when no real
 * PMTiles/vector source is configured — see readSourceAvailability() in DetailMapViewport.tsx.
 * Without this, the map background alone (see detailMapStyle.ts) is indistinguishable from a
 * rendering failure. `pointer-events: none` keeps it from blocking map panning/zooming or the
 * layer-panel trigger underneath/around it.
 */
export function DetailMapSourceNotice() {
  const { t } = useTranslation();
  return (
    <div className="detail-map-source-notice">
      <p className="eyebrow">{t('detailMapSourceNotice.eyebrow')}</p>
      <p>
        {t('detailMapSourceNotice.bodyBeforeLink')}{' '}
        <strong>{t('detailMapSourceNotice.layerPanelLink')}</strong>{' '}
        {t('detailMapSourceNotice.bodyAfterLink')}
      </p>
    </div>
  );
}
