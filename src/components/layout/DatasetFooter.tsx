import { datasetManifest, formatSnapshotDate } from '../../data/datasetManifest';
import { useMapStore } from '../../stores/mapStore';
import { useTranslation } from '../../i18n/useTranslation';

export function DatasetFooter() {
  const { t } = useTranslation();
  const dataMode = useMapStore((state) => state.dataMode);
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
      <span title={t('datasetFooter.cacheVersionTitle', { version: datasetManifest.cacheVersion })}>
        SNAPSHOT {formatSnapshotDate(datasetManifest.snapshotDate)}
      </span>
    </footer>
  );
}
