import { captureProvenanceFocusTrigger } from '../../components/provenance/provenanceFocusTrigger';
import { useMapStore } from '../../stores/mapStore';
import { useTranslation } from '../../i18n/useTranslation';
import type { MessageKey } from '../../i18n/messages';
import type { ProjectPortfolioProvenance } from '../../entities/project/adapters/ProjectPortfolioSource';
import { formatAbsoluteDateTime } from './model/executiveOverviewSelectors';
import type { DataHealthSummary } from './model/executiveOverviewTypes';

export function DataHealthPanel({
  dataHealth,
  dataTimeline,
}: {
  dataHealth: DataHealthSummary;
  dataTimeline: ProjectPortfolioProvenance;
}) {
  const { t, locale } = useTranslation();
  const openProvenancePanel = useMapStore((state) => state.openProvenancePanel);

  return (
    <section aria-labelledby="data-health-heading" className="data-health-panel">
      <h3 id="data-health-heading">{t('dataHealth.heading')}</h3>
      <dl className="data-health-panel__grid">
        <div>
          <dt>{t('dataHealth.validRecords')}</dt>
          <dd>
            {dataHealth.validProjects} / {dataHealth.totalProjects}
          </dd>
        </div>
        <div>
          <dt>{t('dataHealth.invalidRecords')}</dt>
          <dd>{dataHealth.invalidProjects}</dd>
        </div>
        <div>
          <dt>{t('dataHealth.staleRecords')}</dt>
          <dd>{dataHealth.staleProjectCount}</dd>
        </div>
        <div>
          <dt>{t('dataHealth.duplicates')}</dt>
          <dd>{dataHealth.duplicateRecordCount}</dd>
        </div>
        <div>
          <dt>{t('dataHealth.unmappedCodes')}</dt>
          <dd>{dataHealth.unmappedAdministrativeCodeCount}</dd>
        </div>
        <div>
          <dt>{t('dataHealth.sourceStatus')}</dt>
          <dd>
            {dataHealth.sourceAvailable
              ? t('dataHealth.sourceReady')
              : t('dataHealth.sourceNotReady')}
          </dd>
        </div>
        <div>
          <dt>{t('dataHealth.effectiveAt')}</dt>
          <dd>{formatAbsoluteDateTime(dataTimeline.effectiveAt, locale)}</dd>
        </div>
        <div>
          <dt>{t('dataHealth.sourcePublished')}</dt>
          <dd>{formatAbsoluteDateTime(dataTimeline.sourcePublishedAt, locale)}</dd>
        </div>
        <div>
          <dt>{t('dataHealth.retrieved')}</dt>
          <dd>{formatAbsoluteDateTime(dataTimeline.retrievedAt, locale)}</dd>
        </div>
      </dl>
      <h3>{t('dataHealth.confidenceHeading')}</h3>
      <ul className="confidence-breakdown">
        {Object.entries(dataHealth.confidenceBreakdown)
          .filter(([, count]) => count > 0)
          .map(([confidence, count]) => (
            <li key={confidence}>
              {t('dataHealth.confidenceItem', {
                label: t(`confidence.${confidence}` as MessageKey),
                count,
              })}
            </li>
          ))}
      </ul>
      <button
        type="button"
        onClick={(event) => {
          captureProvenanceFocusTrigger(event.currentTarget);
          openProvenancePanel();
        }}
        className="data-health-panel__provenance-link"
      >
        {t('dataHealth.viewProvenance')}
      </button>
    </section>
  );
}
