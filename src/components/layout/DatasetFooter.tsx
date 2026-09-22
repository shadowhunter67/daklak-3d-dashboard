import { datasetManifest, formatSnapshotDate } from '../../data/datasetManifest';
import { useMapStore } from '../../stores/mapStore';
import { useTranslation } from '../../i18n/useTranslation';
import { captureAboutFocusTrigger } from '../about/aboutFocusTrigger';

export function DatasetFooter() {
  const { t } = useTranslation();
  const dataMode = useMapStore((state) => state.dataMode);
  const openAboutPanel = useMapStore((state) => state.openAboutPanel);
  return (
    <footer>
      <span title="Contains modified Copernicus Sentinel data 2016">SENTINEL-2 · EOX</span>
      <p>
        {dataMode === 'overview' ? (
          <>
            {t('datasetFooter.provincialIndicators')}{' '}
            <a href={datasetManifest.sourceUrl} target="_blank" rel="noopener noreferrer">
              {t('datasetFooter.publishedSource', { version: datasetManifest.sourceVersion })}
            </a>{' '}
            {t('datasetFooter.communeIllustrative')}
          </>
        ) : (
          t('datasetFooter.thematicIllustrative')
        )}
      </p>
      <span className="dataset-footer-end">
        <span
          title={t('datasetFooter.cacheVersionTitle', { version: datasetManifest.cacheVersion })}
        >
          SNAPSHOT {formatSnapshotDate(datasetManifest.snapshotDate)}
        </span>
        <button
          id="open-about-panel"
          type="button"
          className="dataset-footer-about"
          aria-haspopup="dialog"
          onClick={(event) => {
            captureAboutFocusTrigger(event.currentTarget);
            openAboutPanel();
          }}
          aria-label={t('datasetFooter.about.ariaLabel')}
          title={t('datasetFooter.about.title')}
        >
          i
        </button>
      </span>
    </footer>
  );
}
