import { useEffect, useMemo, useRef, useState } from 'react';
import { BundledProjectPortfolioSource } from '../../data/projectPortfolioSource';
import type { ProjectPortfolioSource } from '../../entities/project/adapters/ProjectPortfolioSource';
import type { ProjectGeometry } from '../../entities/project/types';
import { useTranslation } from '../../i18n/useTranslation';
import type { MessageKey } from '../../i18n/messages';
import { formatDate, formatDateTime, formatVnd } from '../../i18n/formatters';
import {
  formatAbsoluteDateTime,
  formatKpiValueLocalized,
} from '../executive-overview/model/executiveOverviewSelectors';
import { useProjectDetail } from './data/useProjectDetail';
import { ProgressHistorySparkline } from './ProgressHistorySparkline';
import { resolveLocalizedText } from '../../i18n/resolveLocalizedText';

const ISSUE_SEVERITIES = ['critical', 'high', 'medium', 'low'] as const;

export function ProjectDetailView({
  source,
  projectId,
  onBackToPortfolio,
  onViewOnMap,
}: {
  source?: ProjectPortfolioSource;
  projectId: string;
  onBackToPortfolio: () => void;
  onViewOnMap: (geometry: ProjectGeometry) => void;
}) {
  const { t, locale } = useTranslation();
  const [retryToken, setRetryToken] = useState(0);
  const effectiveSource = useMemo(() => source ?? new BundledProjectPortfolioSource(), [source]);
  const state = useProjectDetail(effectiveSource, projectId, retryToken);
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [projectId]);

  if (state.status === 'loading') {
    return (
      <section
        id="project-detail"
        className="project-detail"
        aria-live="polite"
        aria-busy="true"
        tabIndex={-1}
      >
        <span className="map-loading__spinner" aria-hidden="true" />
        <p>{t('detail.loading')}</p>
      </section>
    );
  }

  if (state.status === 'not-found') {
    return (
      <section id="project-detail" className="project-detail" tabIndex={-1}>
        <div className="project-detail__not-found" role="alert">
          <h2 ref={headingRef} tabIndex={-1}>
            {t('detail.notFoundHeading')}
          </h2>
          <p>{t('detail.notFoundBody', { projectId })}</p>
          <button type="button" onClick={onBackToPortfolio}>
            {t('detail.backToPortfolio')}
          </button>
        </div>
      </section>
    );
  }

  if (state.status === 'error') {
    return (
      <section id="project-detail" className="project-detail" tabIndex={-1}>
        <div className="project-detail__error" role="alert">
          <h2 ref={headingRef} tabIndex={-1}>
            {t('detail.loadErrorHeading')}
          </h2>
          <p>{t(`errorKind.${state.error.kind}` as MessageKey)}</p>
          <p className="project-detail__error-detail">{state.error.message}</p>
          <button type="button" onClick={() => setRetryToken((n) => n + 1)}>
            {t('detail.retry')}
          </button>
          <button type="button" onClick={onBackToPortfolio}>
            {t('detail.backToPortfolio')}
          </button>
        </div>
      </section>
    );
  }

  const { model } = state;
  const disbursement = formatKpiValueLocalized(model.summary.disbursementRate, locale, t);
  const scheduleVariance = formatKpiValueLocalized(model.summary.scheduleVariance, locale, t);
  const budgetVariance = formatKpiValueLocalized(model.summary.budgetVariance, locale, t);
  const forecastDelay = formatKpiValueLocalized(model.summary.forecastDelayInDays, locale, t);
  const overdueIssues = formatKpiValueLocalized(model.issues.overdueIssueCount, locale, t);

  return (
    <section
      id="project-detail"
      className="project-detail"
      aria-labelledby="project-detail-heading"
      tabIndex={-1}
    >
      <button type="button" className="project-detail__back" onClick={onBackToPortfolio}>
        {t('detail.backToPortfolioShort')}
      </button>

      {state.status === 'degraded' && (
        <p role="alert" className="project-detail__degraded-banner">
          {t('detail.degradedBanner', { issues: state.sourceIssues.join('; ') })}
        </p>
      )}

      {/* A plain <div>, not <header>: the bare `header { position: absolute; top: 0; ... }`
          selector in global.css is reserved for DashboardHeader's own top bar — an actual
          <header> element here would silently inherit that layout and float on top of the page
          instead of flowing normally inside .project-detail. */}
      <div className="project-detail__header">
        <h2 id="project-detail-heading" ref={headingRef} tabIndex={-1}>
          {model.header.name}
        </h2>
        <p className="project-detail__mock-badge" role="note">
          {t('detail.illustrativeBadge')}
        </p>
        <dl className="project-detail__header-grid">
          <div>
            <dt>{t('detail.header.code')}</dt>
            <dd>{model.header.code}</dd>
          </div>
          <div>
            <dt>{t('detail.header.sector')}</dt>
            <dd>{t(`sector.${model.header.sector}` as MessageKey)}</dd>
          </div>
          <div>
            <dt>{t('detail.header.status')}</dt>
            <dd>{t(`status.${model.header.status}` as MessageKey)}</dd>
          </div>
          <div>
            <dt>{t('detail.header.priority')}</dt>
            {/* ProjectPriority and issue severity share the same critical/high/medium/low values —
                reusing issueSeverity.* rather than a duplicate priority.* dictionary entry per value. */}
            <dd>{t(`issueSeverity.${model.header.priority}` as MessageKey)}</dd>
          </div>
          <div>
            <dt>{t('detail.header.updatedAt')}</dt>
            <dd>{formatDateTime(model.header.dataUpdatedAt, locale)}</dd>
          </div>
          <div>
            <dt>{t('detail.header.confidence')}</dt>
            <dd>{t(`confidence.${model.header.confidence}` as MessageKey)}</dd>
          </div>
        </dl>
      </div>

      {model.attentionReasons.length > 0 && (
        <section
          aria-labelledby="project-detail-attention-heading"
          className="project-detail__attention"
        >
          <h3 id="project-detail-attention-heading">{t('detail.attentionHeading')}</h3>
          <ul>
            {model.attentionReasons.map((reason) => (
              <li key={reason.category}>{t(`reason.${reason.category}` as MessageKey)}</li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="project-detail-summary-heading" className="project-detail__summary">
        <h3 id="project-detail-summary-heading">{t('detail.summaryHeading')}</h3>
        <dl className="project-detail__summary-grid">
          <div>
            <dt>{t('detail.summary.approvedBudget')}</dt>
            <dd>{formatVnd(model.summary.approvedBudget, locale)}</dd>
          </div>
          <div>
            <dt>{t('detail.summary.adjustedBudget')}</dt>
            <dd>
              {model.summary.adjustedBudget !== null
                ? formatVnd(model.summary.adjustedBudget, locale)
                : t('detail.summary.adjustedBudgetNone')}
            </dd>
          </div>
          <div>
            <dt>{t('detail.summary.disbursedAmount')}</dt>
            <dd>{formatVnd(model.summary.disbursedAmount, locale)}</dd>
          </div>
          <div>
            <dt>{t('detail.summary.disbursementRate')}</dt>
            <dd>{disbursement.text}</dd>
          </div>
          <div>
            <dt>{t('detail.summary.progress')}</dt>
            <dd>
              {model.summary.overallProgress}% / {model.summary.plannedProgress}%
            </dd>
          </div>
          <div>
            <dt>{t('detail.summary.scheduleVariance')}</dt>
            <dd>{scheduleVariance.text}</dd>
          </div>
          <div>
            <dt>{t('detail.summary.budgetVariance')}</dt>
            <dd>{budgetVariance.text}</dd>
          </div>
          <div>
            <dt>{t('detail.summary.plannedCompletion')}</dt>
            <dd>
              {model.summary.plannedCompletionDate
                ? formatDate(model.summary.plannedCompletionDate, locale)
                : t('portfolio.notDetermined')}
            </dd>
          </div>
          <div>
            <dt>{t('detail.summary.forecastCompletion')}</dt>
            <dd>
              {model.summary.forecastCompletionDate
                ? formatDate(model.summary.forecastCompletionDate, locale)
                : t('detail.summary.forecastCompletionNone')}
            </dd>
          </div>
          <div>
            <dt>{t('detail.summary.forecastDelay')}</dt>
            <dd>{forecastDelay.text}</dd>
          </div>
        </dl>
      </section>

      <section
        aria-labelledby="project-detail-workpackages-heading"
        className="project-detail__work-packages"
      >
        <h3 id="project-detail-workpackages-heading">
          {t('detail.workPackagesHeading', { count: model.workPackages.length })}
        </h3>
        {model.workPackages.length === 0 ? (
          <p>{t('detail.workPackagesEmpty')}</p>
        ) : (
          <ul className="project-detail__card-list">
            {model.workPackages.map((wp) => (
              <li key={wp.id} className="project-detail__card">
                <p className="project-detail__card-title">
                  {wp.name} <span className="project-portfolio__code">({wp.code})</span>
                </p>
                <p>
                  {t('detail.workPackage.status', {
                    status: t(`workPackageStatus.${wp.status}` as MessageKey),
                  })}
                </p>
                <p>
                  {t('detail.workPackage.progress', {
                    actual: wp.actualProgress,
                    planned: wp.plannedProgress,
                  })}
                </p>
                <p>
                  {t('detail.workPackage.planned', {
                    start: formatDate(wp.plannedStart, locale),
                    end: formatDate(wp.plannedEnd, locale),
                  })}
                </p>
                <p>
                  {t('detail.workPackage.budget', {
                    budget: formatVnd(wp.budget, locale),
                    paid: formatVnd(wp.paidAmount, locale),
                  })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        aria-labelledby="project-detail-milestones-heading"
        className="project-detail__milestones"
      >
        <h3 id="project-detail-milestones-heading">
          {t('detail.milestonesHeading', { count: model.milestones.length })}
        </h3>
        {model.milestones.length === 0 ? (
          <p>{t('detail.milestonesEmpty')}</p>
        ) : (
          <ul className="project-detail__card-list">
            {model.milestones.map((m) => (
              <li key={m.id} className="project-detail__card">
                <p className="project-detail__card-title">
                  {m.name}{' '}
                  {m.critical && (
                    <span aria-label={t('detail.milestone.criticalAria')}>
                      {t('detail.milestone.criticalBadge')}
                    </span>
                  )}
                </p>
                <p>
                  {t('detail.milestone.status', {
                    status: t(`milestoneStatus.${m.status}` as MessageKey),
                  })}
                </p>
                <p>{t('detail.milestone.planned', { date: formatDate(m.plannedDate, locale) })}</p>
                {m.forecastDate && (
                  <p>
                    {t('detail.milestone.forecast', { date: formatDate(m.forecastDate, locale) })}
                  </p>
                )}
                {m.actualDate && (
                  <p>{t('detail.milestone.actual', { date: formatDate(m.actualDate, locale) })}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        aria-labelledby="project-detail-progress-history-heading"
        className="project-detail__progress-history"
      >
        <h3 id="project-detail-progress-history-heading">{t('detail.progressHistoryHeading')}</h3>
        <ProgressHistorySparkline points={model.progressHistory} />
      </section>

      <section aria-labelledby="project-detail-issues-heading" className="project-detail__issues">
        <h3 id="project-detail-issues-heading">
          {t('detail.issuesHeading', {
            count: model.issues.all.length,
            overdue: overdueIssues.text,
          })}
        </h3>
        {model.issues.all.length === 0 ? (
          <p>{t('detail.issuesEmpty')}</p>
        ) : (
          ISSUE_SEVERITIES.map((severity) => {
            const issues = model.issues.bySeverity[severity];
            if (issues.length === 0) return null;
            return (
              <div key={severity} className="project-detail__issue-group">
                <h4>
                  {t('detail.issueGroupHeading', {
                    severity: t(`issueSeverity.${severity}` as MessageKey),
                    count: issues.length,
                  })}
                </h4>
                <ul className="project-detail__card-list">
                  {issues.map((issue) => (
                    <li key={issue.id} className="project-detail__card">
                      <p className="project-detail__card-title">{issue.title}</p>
                      <p>{issue.description}</p>
                      <p>
                        {t('detail.issue.statusOpened', {
                          status: t(`issueStatus.${issue.status}` as MessageKey),
                          openedAt: formatDate(issue.openedAt, locale),
                        })}
                        {issue.dueAt &&
                          t('detail.issue.due', { dueAt: formatDate(issue.dueAt, locale) })}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })
        )}
      </section>

      <section
        aria-labelledby="project-detail-geography-heading"
        className="project-detail__geography"
      >
        <h3 id="project-detail-geography-heading">{t('detail.geographyHeading')}</h3>
        <p>
          {t('detail.geography.area', {
            areas:
              model.geography.administrativeAreaCodes.length > 0
                ? model.geography.administrativeAreaCodes.join(', ')
                : t('detail.geography.areaNone'),
          })}
        </p>
        {model.geography.hasGeometry && model.geography.geometry ? (
          <button type="button" onClick={() => onViewOnMap(model.geography.geometry!)}>
            {t('detail.geography.viewOnMap')}
          </button>
        ) : (
          <p>{t('detail.geography.noGeometry')}</p>
        )}
      </section>

      <section
        aria-labelledby="project-detail-provenance-heading"
        className="project-detail__provenance"
      >
        <h3 id="project-detail-provenance-heading">{t('detail.provenanceHeading')}</h3>
        <ul className="project-detail__card-list">
          {model.provenance.map((entry) => {
            if (!entry.dataset) {
              return (
                <li key={entry.sourceDatasetId} className="project-detail__card">
                  <p>{t('detail.provenance.missing', { datasetId: entry.sourceDatasetId })}</p>
                </li>
              );
            }
            // Dataset title/description are Vietnamese-only publisher content today — resolved via
            // resolveLocalizedText rather than a MessageKey, since these are not this app's own UI
            // copy (see src/i18n/resolveLocalizedText.ts).
            const title = resolveLocalizedText(entry.dataset.title, locale);
            const description = resolveLocalizedText(entry.dataset.description, locale);
            return (
              <li key={entry.sourceDatasetId} className="project-detail__card">
                <p className="project-detail__card-title">
                  {title.text}
                  {title.isFallback && (
                    <span className="project-detail__localized-fallback-note">
                      {' '}
                      ({t('resolveLocalizedText.fallbackNote')})
                    </span>
                  )}
                </p>
                <p>{description.text}</p>
                <p>
                  {t('detail.provenance.quality', {
                    status: entry.dataset.quality.status,
                    version: entry.dataset.version,
                  })}
                </p>
                {entry.dataset.quality.knownLimitations && (
                  <ul>
                    {entry.dataset.quality.knownLimitations.map((limitation) => (
                      <li key={limitation}>{limitation}</li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
        <dl className="project-detail__header-grid">
          <div>
            <dt>{t('detail.dataTimeline.effectiveAt')}</dt>
            <dd>{formatAbsoluteDateTime(model.dataTimeline.effectiveAt, locale)}</dd>
          </div>
          <div>
            <dt>{t('detail.dataTimeline.sourcePublishedAt')}</dt>
            <dd>{formatAbsoluteDateTime(model.dataTimeline.sourcePublishedAt, locale)}</dd>
          </div>
          <div>
            <dt>{t('detail.dataTimeline.retrievedAt')}</dt>
            <dd>{formatAbsoluteDateTime(model.dataTimeline.retrievedAt, locale)}</dd>
          </div>
        </dl>
      </section>
    </section>
  );
}
