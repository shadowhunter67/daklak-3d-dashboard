import { captureProvenanceFocusTrigger } from '../../components/provenance/provenanceFocusTrigger';
import { useMapStore } from '../../stores/mapStore';
import { useTranslation } from '../../i18n/useTranslation';
import type { MessageKey } from '../../i18n/messages';
import { serializeDataReadinessHash } from '../../routing/hashRoute';
import { useHashRoute } from '../../routing/useHashRoute';
import { Card, GaugeChart, PanelHeader } from '../../components/ui';
import { DatabaseIcon } from '../../components/layout/icons';
import { calculateDataHealthScore } from './model/dataHealthScore';
import type { DataHealthSummary } from './model/executiveOverviewTypes';

function healthLevel(score: number): 'good' | 'attention' | 'action' {
  if (score >= 90) return 'good';
  if (score >= 70) return 'attention';
  return 'action';
}

export function DataHealthCard({
  dataHealth,
  isIllustrative,
}: {
  dataHealth: DataHealthSummary;
  isIllustrative: boolean;
}) {
  const { t } = useTranslation();
  const { navigate } = useHashRoute();
  const openProvenancePanel = useMapStore((state) => state.openProvenancePanel);
  const health = calculateDataHealthScore(dataHealth);
  const level = healthLevel(health.score);

  return (
    <Card className="data-health-card" aria-labelledby="data-health-heading">
      <PanelHeader
        title={t('dataHealth.heading')}
        icon={<DatabaseIcon />}
        headingId="data-health-heading"
        action={
          <button
            type="button"
            className="ui-panel-link"
            onClick={() => navigate(serializeDataReadinessHash())}
          >
            {t('dataHealth.viewDetails')}
          </button>
        }
      />
      <div className="data-health-card__summary">
        <GaugeChart
          value={health.score}
          label={t('dataHealth.scoreLabel')}
          thresholds={[
            { at: 0, color: '#e5484d' },
            { at: 70, color: '#e4b94a' },
            { at: 90, color: '#22a06b' },
          ]}
          ariaLabel={`${t('dataHealth.scoreLabel')}: ${health.score}% — ${t(`dataHealth.level.${level}` as MessageKey)}`}
        />
        <div>
          <strong className={`data-health-card__level data-health-card__level--${level}`}>
            {t(`dataHealth.level.${level}` as MessageKey)}
          </strong>
          <p>{t('dataHealth.issues', { count: String(dataHealth.totalDataQualityIssues) })}</p>
        </div>
      </div>
      <ul className="data-health-card__metrics">
        {health.metrics.map((metric) => (
          <li key={metric.key}>
            <span className="data-health-card__metric-dot" data-level={level} aria-hidden="true" />
            <span>{t(`dataHealth.metric.${metric.key}` as MessageKey)}</span>
            <strong>{Math.round(Math.max(0, Math.min(1, metric.value)) * 100)}%</strong>
          </li>
        ))}
      </ul>
      <p className="data-health-card__formula">{t('dataHealth.formula')}</p>
      <div className="data-health-card__footer">
        {isIllustrative && (
          <span className="ui-illustrative-badge">{t('dataHealth.illustrativeBadge')}</span>
        )}
        <button
          type="button"
          id="open-overview-data-provenance-panel"
          data-provenance-trigger="true"
          className="ui-text-button"
          onClick={(event) => {
            captureProvenanceFocusTrigger(event.currentTarget);
            openProvenancePanel();
          }}
        >
          {t('dataHealth.viewProvenanceShort')}
        </button>
      </div>
    </Card>
  );
}
