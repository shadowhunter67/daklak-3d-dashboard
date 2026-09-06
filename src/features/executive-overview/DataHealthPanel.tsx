import { captureProvenanceFocusTrigger } from '../../components/provenance/provenanceFocusTrigger';
import { useMapStore } from '../../stores/mapStore';
import { useTranslation } from '../../i18n/useTranslation';
import type { MessageKey } from '../../i18n/messages';
import type { ProjectPortfolioProvenance } from '../../entities/project/adapters/ProjectPortfolioSource';
import { serializeDataReadinessHash } from '../../routing/hashRoute';
import { useHashRoute } from '../../routing/useHashRoute';
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
  const { navigate } = useHashRoute();

  return (
    <section aria-labelledby="data-health-heading" className="data-health-panel">
      <h3 id="data-health-heading">{t('dataHealth.heading')}</h3>
      {/* "15/15 hợp lệ" đứng riêng, nổi bật — đây là con số một lãnh đạo cần thấy trước tiên để
          biết có thể tin dữ liệu hay không (spec §12), trước khi đọc các chỉ số phụ khác. */}
      <div
        className="data-health-panel__headline"
        data-positive={dataHealth.invalidProjects === 0 || undefined}
      >
        <span className="data-health-panel__headline-value">
          {dataHealth.validProjects} / {dataHealth.totalProjects}
        </span>
        <span className="data-health-panel__headline-label">{t('dataHealth.validRecords')}</span>
      </div>
      <dl className="data-health-panel__grid">
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
      </dl>
      <div className="data-health-panel__divider" role="presentation" />
      <dl className="data-health-panel__grid data-health-panel__grid--timeline">
        <div>
          <dt>{t('dataHealth.sourceStatus')}</dt>
          <dd data-positive={dataHealth.sourceAvailable || undefined}>
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
      <h4>{t('dataHealth.confidenceHeading')}</h4>
      <ul className="confidence-breakdown">
        {Object.entries(dataHealth.confidenceBreakdown)
          .filter(([, count]) => count > 0)
          .map(([confidence, count]) => (
            <li key={confidence} data-confidence={confidence}>
              {t('dataHealth.confidenceItem', {
                label: t(`confidence.${confidence}` as MessageKey),
                count,
              })}
            </li>
          ))}
      </ul>
      <div className="data-health-panel__actions">
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
        <button
          type="button"
          onClick={() => navigate(serializeDataReadinessHash())}
          className="data-health-panel__data-readiness-link"
        >
          {t('dataHealth.viewDataReadiness')}
        </button>
      </div>
    </section>
  );
}
