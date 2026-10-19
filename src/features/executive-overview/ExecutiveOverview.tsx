import { useMemo, useState } from 'react';
import { defaultProjectPortfolioSource } from '../../app/createProjectPortfolioSource';
import type { ProjectPortfolioSource } from '../../entities/project/adapters/ProjectPortfolioSource';
import {
  formatAbsoluteDateTime,
  formatKpiValueLocalized,
} from './model/executiveOverviewSelectors';
import { useTranslation } from '../../i18n/useTranslation';
import type { MessageKey } from '../../i18n/messages';
import { formatPercentagePointsDelta } from '../../i18n/formatters';
import { AlertList } from './AlertList';
import { DataHealthCard } from './DataHealthCard';
import { OverviewWorkspace } from './OverviewWorkspace';
import { PriorityProjectsTable } from './PriorityProjectsTable';
import { RecentUpdatesCard } from './RecentUpdatesCard';
import { PortfolioStatusChart } from './PortfolioStatusChart';
import { useExecutiveOverview } from './data/useExecutiveOverview';
import { PageHeader, KpiTile, StatusChip } from '../../components/ui';
import {
  AlertIcon,
  ClockIcon,
  CoinsIcon,
  DocumentIcon,
  TargetIcon,
  TrendIcon,
} from '../../components/layout/icons';

const ERROR_KIND_MESSAGE_KEY: Record<string, MessageKey> = {
  unauthorized: 'executiveOverview.error.kind.unauthorized',
  forbidden: 'executiveOverview.error.kind.forbidden',
  network: 'executiveOverview.error.kind.network',
  timeout: 'executiveOverview.error.kind.timeout',
  'schema-invalid': 'executiveOverview.error.kind.schemaInvalid',
  'source-unavailable': 'executiveOverview.error.kind.sourceUnavailable',
  'rate-limited': 'executiveOverview.error.kind.rateLimited',
  unknown: 'executiveOverview.error.kind.unknown',
};

/**
 * Executive Overview — landing mặc định mới (Phase 2A). Component chỉ render `ExecutiveOverviewModel`
 * (từ `buildExecutiveOverview` qua `useExecutiveOverview`), không tự tính KPI. `source` cho phép
 * test/story tiêm `FakeProjectPortfolioSource` để mô phỏng loading/degraded/error mà
 * `defaultProjectPortfolioSource` (luôn ok) không tự tạo ra được.
 */
export function ExecutiveOverview({
  source,
  onOpenPortfolio,
}: {
  source?: ProjectPortfolioSource;
  /** Phase 2B1: navigates to the Project Portfolio route (`#/projects`). Optional so existing
   * tests/stories that only exercise Executive Overview in isolation keep working unchanged. */
  onOpenPortfolio?: () => void;
}) {
  const { t, locale } = useTranslation();
  const [retryToken, setRetryToken] = useState(0);
  const effectiveSource = useMemo(() => source ?? defaultProjectPortfolioSource, [source]);
  const state = useExecutiveOverview(effectiveSource, retryToken);

  if (state.status === 'loading') {
    return (
      <section
        id="executive-overview"
        className="executive-overview"
        aria-live="polite"
        aria-busy="true"
        tabIndex={-1}
      >
        <span className="map-loading__spinner" aria-hidden="true" />
        <p>{t('executiveOverview.loading')}</p>
      </section>
    );
  }

  if (state.status === 'error') {
    return (
      <section id="executive-overview" className="executive-overview" tabIndex={-1}>
        <div className="executive-overview__error" role="alert">
          <h2>{t('executiveOverview.error.title')}</h2>
          <p>{t(ERROR_KIND_MESSAGE_KEY[state.error.kind] ?? ERROR_KIND_MESSAGE_KEY.unknown)}</p>
          <p className="executive-overview__error-detail">{state.error.message}</p>
          {state.error.requestId && (
            <p>{t('executiveOverview.error.requestId', { id: state.error.requestId })}</p>
          )}
          <button type="button" onClick={() => setRetryToken((token) => token + 1)}>
            {t('executiveOverview.error.retry')}
          </button>
        </div>
      </section>
    );
  }

  const { model } = state;
  const asOf = new Date(model.generatedAt);
  const isEmpty = model.kpis.totalProjects.value === 0;

  return (
    <section
      id="executive-overview"
      className="executive-overview"
      aria-labelledby="executive-overview-heading"
      tabIndex={-1}
    >
      <PageHeader
        title={t('executiveOverview.heading')}
        description={t('executiveOverview.description')}
        badge={model.isIllustrative ? t('executiveOverview.mockBadge') : undefined}
        actions={
          <div className="executive-overview__header-meta">
            <span>{t('executiveOverview.dataEffectiveLabel')}</span>
            <strong>{formatAbsoluteDateTime(model.dataTimeline.effectiveAt, locale)}</strong>
            <StatusChip
              label={t(`portfolioStatus.${model.portfolioStatus}` as MessageKey)}
              tone={
                model.portfolioStatus === 'healthy'
                  ? 'success'
                  : model.portfolioStatus === 'critical'
                    ? 'danger'
                    : 'warning'
              }
              dot
            />
            {onOpenPortfolio && (
              <button
                type="button"
                className="executive-overview__open-portfolio"
                onClick={onOpenPortfolio}
              >
                {t('executiveOverview.openPortfolio')}
              </button>
            )}
          </div>
        }
      />
      {state.status === 'degraded' && (
        <p role="alert" className="executive-overview__degraded-banner">
          {t('executiveOverview.degradedBanner', { issues: state.sourceIssues.join('; ') })}
        </p>
      )}
      {isEmpty ? (
        <p className="executive-overview__empty">{t('executiveOverview.empty')}</p>
      ) : (
        <>
          <section aria-labelledby="kpi-grid-heading" className="executive-overview__kit-kpis">
            <h2 id="kpi-grid-heading" className="ui-visually-hidden">
              {t('kpi.heading')}
            </h2>
            <ul className="ui-kpi-grid">
              {(
                [
                  ['totalProjects', 'kpi.totalProjects', 'blue', DocumentIcon],
                  ['totalApprovedBudget', 'kpi.totalApprovedBudget', 'gold', CoinsIcon],
                  ['disbursementRate', 'kpi.disbursementRate', 'green', TrendIcon],
                  ['onTrackProjects', 'kpi.onTrackProjects', 'blue', TargetIcon],
                  ['atRiskProjects', 'kpi.atRiskProjects', 'orange', AlertIcon],
                  ['delayedProjects', 'kpi.delayedProjects', 'red', ClockIcon],
                  ['overdueIssues', 'kpi.overdueIssues', 'red', AlertIcon],
                ] as const
              ).map(([key, labelKey, tone, Icon]) => {
                const formatted = formatKpiValueLocalized(model.kpis[key], locale, t);
                const trend =
                  key === 'disbursementRate' && model.disbursementRateTrend.status === 'ok'
                    ? formatPercentagePointsDelta(
                        model.disbursementRateTrend.deltaPercentagePoints ?? 0,
                        locale,
                      )
                    : undefined;
                return (
                  <KpiTile
                    key={key}
                    label={t(labelKey)}
                    value={formatted.text}
                    tone={tone}
                    icon={<Icon />}
                    detail={trend}
                  />
                );
              })}
              <KpiTile
                label={t('kpi.attentionProjects')}
                value={model.attentionProjectCount}
                tone="purple"
                icon={<TargetIcon />}
                detail={t('kpi.attentionProjectsOf', {
                  total: String(model.kpis.totalProjects.value ?? 0),
                })}
              />
            </ul>
          </section>
          <OverviewWorkspace
            projectCountByAdministrativeArea={model.projectCountByAdministrativeArea}
          />
          <section className="executive-overview__panel-grid" aria-label={t('overview.panelsAria')}>
            <PriorityProjectsTable
              items={model.priorityProjects}
              attentionProjectCount={model.attentionProjectCount}
              asOf={asOf}
              onOpenPortfolio={onOpenPortfolio}
            />
            <DataHealthCard dataHealth={model.dataHealth} isIllustrative={model.isIllustrative} />
            <RecentUpdatesCard timeline={model.dataTimeline} />
            <AlertList alerts={model.alerts} />
            <PortfolioStatusChart statusDistribution={model.statusDistribution} />
          </section>
        </>
      )}
    </section>
  );
}
