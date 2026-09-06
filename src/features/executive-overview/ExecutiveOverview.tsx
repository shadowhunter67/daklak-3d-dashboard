import { useMemo, useState } from 'react';
import { defaultProjectPortfolioSource } from '../../app/createProjectPortfolioSource';
import type { ProjectPortfolioSource } from '../../entities/project/adapters/ProjectPortfolioSource';
import { formatAbsoluteDateTime } from './model/executiveOverviewSelectors';
import { useTranslation } from '../../i18n/useTranslation';
import type { MessageKey } from '../../i18n/messages';
import { AlertList } from './AlertList';
import { DataHealthPanel } from './DataHealthPanel';
import { ExecutiveStatusHero } from './ExecutiveStatusHero';
import { KpiCardGrid } from './KpiCardGrid';
import { PortfolioStatusChart } from './PortfolioStatusChart';
import { PriorityProjectList } from './PriorityProjectList';
import { useExecutiveOverview } from './data/useExecutiveOverview';

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
      <h2 id="executive-overview-heading">{t('executiveOverview.heading')}</h2>
      {!isEmpty && <ExecutiveStatusHero model={model} />}
      {(model.isIllustrative || onOpenPortfolio) && (
        <div className="executive-overview__notice">
          {model.isIllustrative && (
            <p className="executive-overview__mock-badge" role="note">
              {t('executiveOverview.mockBadge')}
            </p>
          )}
          {onOpenPortfolio && (
            <button
              type="button"
              className="executive-overview__portfolio-link"
              onClick={onOpenPortfolio}
            >
              {t('executiveOverview.openPortfolio')}
            </button>
          )}
        </div>
      )}
      {/* Chữ "Trạng thái danh mục: X" trước đây lặp lại đúng thông tin Executive Status Hero ở
          trên đã nói to và rõ hơn nhiều — chỉ còn giữ lại mốc "dữ liệu có hiệu lực" (vẫn cần cho
          minh bạch nguồn dữ liệu), tránh nói hai lần cùng một điều theo hai cách khác nhau. */}
      <p className="executive-overview__status">
        {t('executiveOverview.dataEffectiveLabel')}{' '}
        {formatAbsoluteDateTime(model.dataTimeline.effectiveAt, locale)}
      </p>
      {state.status === 'degraded' && (
        <p role="alert" className="executive-overview__degraded-banner">
          {t('executiveOverview.degradedBanner', { issues: state.sourceIssues.join('; ') })}
        </p>
      )}
      {isEmpty ? (
        <p className="executive-overview__empty">{t('executiveOverview.empty')}</p>
      ) : (
        <>
          <KpiCardGrid kpis={model.kpis} disbursementRateTrend={model.disbursementRateTrend} />
          <div className="executive-overview__columns">
            {/* Main column (~65%): the two things a leader acts on — which projects need
                attention, and how the whole portfolio is distributed across the pipeline. */}
            <div className="executive-overview__main-column">
              <PriorityProjectList items={model.priorityProjects} asOf={asOf} />
              <PortfolioStatusChart statusDistribution={model.statusDistribution} />
            </div>
            {/* Sidebar (~35%): supporting context — active alerts and whether the underlying data
                can be trusted. */}
            <div className="executive-overview__side-column">
              <AlertList alerts={model.alerts} />
              <DataHealthPanel dataHealth={model.dataHealth} dataTimeline={model.dataTimeline} />
            </div>
          </div>
        </>
      )}
    </section>
  );
}
