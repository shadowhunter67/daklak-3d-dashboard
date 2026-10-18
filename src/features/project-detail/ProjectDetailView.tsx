import { useEffect, useMemo, useRef, useState } from 'react';
import labels from '#province-assets/daklak-labels.json';
import { defaultProjectPortfolioSource } from '../../app/createProjectPortfolioSource';
import {
  AlertIcon,
  ChartIcon,
  CheckCircleIcon,
  ClockIcon,
  CoinsIcon,
  DocumentIcon,
  FolderIcon,
  MapIcon,
  TargetIcon,
} from '../../components/layout/icons';
import {
  Card,
  DataTable,
  KpiTile,
  PageHeader,
  PanelHeader,
  ProgressBar,
  StatList,
  StatusChip,
} from '../../components/ui';
import type { ProjectPortfolioSource } from '../../entities/project/adapters/ProjectPortfolioSource';
import type {
  Milestone,
  ProjectGeometry,
  ProjectIssue,
  ProjectStatus,
  WorkPackage,
} from '../../entities/project/types';
import { useTranslation } from '../../i18n/useTranslation';
import type { MessageKey } from '../../i18n/messages';
import { formatDate, formatDateTime, formatVnd } from '../../i18n/formatters';
import {
  formatAbsoluteDateTime,
  formatKpiValueLocalized,
} from '../executive-overview/model/executiveOverviewSelectors';
import { resolveLocalizedText } from '../../i18n/resolveLocalizedText';
import { useProjectDetail } from './data/useProjectDetail';
import { ProgressHistorySparkline } from './ProgressHistorySparkline';

const labelMap = labels as Record<string, { name: string }>;

function areaName(code: string): string {
  return labelMap[code]?.name ?? code;
}

function statusTone(
  status: ProjectStatus | WorkPackage['status'],
): 'danger' | 'warning' | 'info' | 'success' | 'neutral' | 'progress' {
  if (status === 'completed' || status === 'active') return 'success';
  if (status === 'delayed' || status === 'suspended' || status === 'cancelled') return 'danger';
  if (status === 'at-risk') return 'warning';
  if (status === 'unknown') return 'neutral';
  return 'progress';
}

function progressTone(status: ProjectStatus): 'gold' | 'orange' | 'green' | 'blue' | 'red' {
  if (status === 'completed' || status === 'active') return 'green';
  if (status === 'delayed' || status === 'suspended' || status === 'cancelled') return 'red';
  if (status === 'at-risk') return 'orange';
  if (status === 'unknown') return 'gold';
  return 'blue';
}

function issueTone(status: ProjectIssue['status']): 'danger' | 'warning' | 'info' | 'success' {
  if (status === 'blocked') return 'danger';
  if (status === 'open' || status === 'acknowledged') return 'warning';
  if (status === 'resolved' || status === 'closed') return 'success';
  return 'info';
}

function milestoneTone(status: Milestone['status']): 'danger' | 'warning' | 'success' | 'progress' {
  if (status === 'delayed') return 'danger';
  if (status === 'at-risk') return 'warning';
  if (status === 'achieved' || status === 'on-track') return 'success';
  return 'progress';
}

function renderDate(
  value: string | null | undefined,
  locale: Parameters<typeof formatDate>[1],
  fallback: string,
) {
  return value ? formatDate(value, locale) : fallback;
}

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
  const effectiveSource = useMemo(() => source ?? defaultProjectPortfolioSource, [source]);
  const state = useProjectDetail(effectiveSource, projectId, retryToken);
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [projectId]);

  if (state.status === 'loading') {
    return (
      <section
        id="project-detail"
        className="project-detail ui-page-root"
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
      <section id="project-detail" className="project-detail ui-page-root" tabIndex={-1}>
        <Card className="project-detail__state" role="alert">
          <h2 ref={headingRef} tabIndex={-1}>
            {t('detail.notFoundHeading')}
          </h2>
          <p>{t('detail.notFoundBody', { projectId })}</p>
          <button type="button" className="ui-primary-button" onClick={onBackToPortfolio}>
            {t('detail.backToPortfolio')}
          </button>
        </Card>
      </section>
    );
  }

  if (state.status === 'error') {
    return (
      <section id="project-detail" className="project-detail ui-page-root" tabIndex={-1}>
        <Card className="project-detail__state" role="alert">
          <h2 ref={headingRef} tabIndex={-1}>
            {t('detail.loadErrorHeading')}
          </h2>
          <p>{t(`errorKind.${state.error.kind}` as MessageKey)}</p>
          <p className="project-detail__error-detail">{state.error.message}</p>
          <div className="project-detail__state-actions">
            <button
              type="button"
              className="ui-primary-button"
              onClick={() => setRetryToken((n) => n + 1)}
            >
              {t('detail.retry')}
            </button>
            <button type="button" onClick={onBackToPortfolio}>
              {t('detail.backToPortfolio')}
            </button>
          </div>
        </Card>
      </section>
    );
  }

  const { model } = state;
  const disbursement = formatKpiValueLocalized(model.summary.disbursementRate, locale, t);
  const scheduleVariance = formatKpiValueLocalized(model.summary.scheduleVariance, locale, t);
  const overdueIssues = formatKpiValueLocalized(model.issues.overdueIssueCount, locale, t);
  const openIssues = model.issues.all.filter(
    (issue) => issue.status !== 'resolved' && issue.status !== 'closed',
  ).length;
  const geometry = model.geography.geometry;
  const canViewOnMap = geometry?.type === 'Point';
  const areas = model.geography.administrativeAreaCodes.map(areaName);
  const evidenceIds = [...new Set(model.issues.all.flatMap((issue) => issue.evidenceIds))];
  const evidence = evidenceIds
    .map((id) => model.referenceData.evidence.find((item) => item.id === id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const hasApproximateLocation =
    model.header.geometryMetadata?.approximate === true ||
    (model.isIllustrative && geometry?.type === 'Point');
  const locationAccuracy = model.header.geometryMetadata
    ? model.header.geometryMetadata.approximate
      ? t('detail.location.approximate')
      : t('detail.location.provided')
    : hasApproximateLocation
      ? t('detail.location.approximate')
      : t('detail.location.unknown');

  const detailStats = [
    { label: t('detail.header.code'), value: model.header.code },
    { label: t('detail.header.sector'), value: t(`sector.${model.header.sector}` as MessageKey) },
    { label: t('detail.header.status'), value: t(`status.${model.header.status}` as MessageKey) },
    {
      label: t('detail.header.priority'),
      value: t(`issueSeverity.${model.header.priority}` as MessageKey),
    },
    {
      label: t('detail.header.managingAuthority'),
      value: model.header.managingAuthority ?? t('detail.notAvailable'),
    },
    {
      label: t('detail.header.investor'),
      value: model.header.investor ?? t('detail.notAvailable'),
    },
    {
      label: t('detail.header.approvalDecision'),
      value: model.header.approvalDecision ?? t('detail.notAvailable'),
    },
    {
      label: t('detail.header.startDate'),
      value: renderDate(model.header.startDate, locale, t('detail.notAvailable')),
    },
    {
      label: t('detail.summary.plannedCompletion'),
      value: renderDate(model.summary.plannedCompletionDate, locale, t('portfolio.notDetermined')),
    },
    { label: t('detail.summary.disbursementRate'), value: disbursement.text },
    {
      label: t('detail.summary.forecastCompletion'),
      value: renderDate(
        model.summary.forecastCompletionDate,
        locale,
        t('detail.summary.forecastCompletionNone'),
      ),
    },
    {
      label: t('detail.header.confidence'),
      value: t(`confidence.${model.header.confidence}` as MessageKey),
    },
    {
      label: t('detail.header.verificationStatus'),
      value: t(`progressVerificationStatus.${model.header.verificationStatus}` as MessageKey),
    },
    { label: t('detail.header.dataOwner'), value: model.header.dataOwner },
    {
      label: t('detail.header.updatedAt'),
      value: formatDateTime(model.header.dataUpdatedAt, locale),
    },
  ];

  const workPackageColumns = [
    {
      key: 'name',
      header: t('detail.table.name'),
      render: (row: WorkPackage) => <strong>{row.name}</strong>,
    },
    {
      key: 'status',
      header: t('detail.table.status'),
      render: (row: WorkPackage) => (
        <StatusChip
          label={t(`workPackageStatus.${row.status}` as MessageKey)}
          tone={statusTone(row.status)}
        />
      ),
    },
    {
      key: 'progress',
      header: t('detail.table.progress'),
      render: (row: WorkPackage) => (
        <ProgressBar
          value={row.actualProgress}
          tone={progressTone(model.header.status)}
          label={t('detail.workPackage.progressAria', {
            name: row.name,
            value: row.actualProgress,
          })}
          valueText={t('detail.workPackage.progressShort', {
            actual: row.actualProgress,
            planned: row.plannedProgress,
          })}
        />
      ),
    },
    {
      key: 'planned',
      header: t('detail.table.schedule'),
      render: (row: WorkPackage) => (
        <span>
          {formatDate(row.plannedStart, locale)} – {formatDate(row.plannedEnd, locale)}
        </span>
      ),
    },
    {
      key: 'budget',
      header: t('detail.table.budget'),
      render: (row: WorkPackage) => <span>{formatVnd(row.budget, locale)}</span>,
    },
  ];

  const milestoneColumns = [
    {
      key: 'name',
      header: t('detail.table.name'),
      render: (row: Milestone) => (
        <span>
          <strong>{row.name}</strong>{' '}
          {row.critical && (
            <StatusChip label={t('detail.milestone.criticalBadge')} tone="warning" />
          )}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('detail.table.status'),
      render: (row: Milestone) => (
        <StatusChip
          label={t(`milestoneStatus.${row.status}` as MessageKey)}
          tone={milestoneTone(row.status)}
        />
      ),
    },
    {
      key: 'plannedDate',
      header: t('detail.milestone.planned'),
      render: (row: Milestone) => formatDate(row.plannedDate, locale),
    },
    {
      key: 'forecastDate',
      header: t('detail.milestone.forecast'),
      render: (row: Milestone) => renderDate(row.forecastDate, locale, t('detail.notAvailable')),
    },
    {
      key: 'actualDate',
      header: t('detail.milestone.actual'),
      render: (row: Milestone) => renderDate(row.actualDate, locale, t('detail.notAvailable')),
    },
  ];

  const issueColumns = [
    {
      key: 'title',
      header: t('detail.table.name'),
      render: (row: ProjectIssue) => <strong>{row.title}</strong>,
    },
    {
      key: 'severity',
      header: t('detail.header.priority'),
      render: (row: ProjectIssue) => (
        <StatusChip
          label={t(`issueSeverity.${row.severity}` as MessageKey)}
          tone={row.severity === 'critical' || row.severity === 'high' ? 'danger' : 'warning'}
        />
      ),
    },
    {
      key: 'status',
      header: t('detail.table.status'),
      render: (row: ProjectIssue) => (
        <StatusChip
          label={t(`issueStatus.${row.status}` as MessageKey)}
          tone={issueTone(row.status)}
        />
      ),
    },
    {
      key: 'openedAt',
      header: t('detail.issue.openedAt'),
      render: (row: ProjectIssue) => formatDate(row.openedAt, locale),
    },
    {
      key: 'dueAt',
      header: t('detail.issue.dueAt'),
      render: (row: ProjectIssue) => renderDate(row.dueAt, locale, t('detail.notAvailable')),
    },
  ];

  return (
    <section
      id="project-detail"
      className="project-detail ui-page-root"
      aria-labelledby="project-detail-heading"
      tabIndex={-1}
    >
      <PageHeader
        headingId="project-detail-heading"
        headingRef={headingRef}
        title={model.header.name}
        badge={model.isIllustrative ? t('detail.illustrativeBadge') : undefined}
        badgeClassName="project-detail__mock-badge"
        breadcrumb={
          <>
            <span>{t('common.home')}</span>
            <span>{t('common.projects')}</span>
            <strong>{model.header.name}</strong>
          </>
        }
        breadcrumbLabel={t('common.breadcrumb')}
        actions={
          <>
            <button type="button" className="project-detail__back" onClick={onBackToPortfolio}>
              {t('detail.backToPortfolioShort')}
            </button>
            {canViewOnMap && (
              <button
                type="button"
                className="ui-primary-button"
                onClick={() => onViewOnMap(geometry)}
              >
                <MapIcon /> {t('detail.geography.viewOnMap')}
              </button>
            )}
          </>
        }
      />

      {state.status === 'degraded' && (
        <p role="alert" className="project-detail__degraded-banner">
          {t('detail.degradedBanner', { issues: state.sourceIssues.join('; ') })}
        </p>
      )}

      <div className="project-detail__identity-meta">
        <StatusChip
          label={t(`status.${model.header.status}` as MessageKey)}
          tone={statusTone(model.header.status)}
          dot
        />
        <span>{t(`sector.${model.header.sector}` as MessageKey)}</span>
        <span>{t('detail.lifecycleLabel')}</span>
      </div>

      <ul className="ui-kpi-grid project-detail__kpis" aria-label={t('detail.kpiLabel')}>
        <KpiTile
          label={t('detail.kpi.progress')}
          value={`${model.summary.overallProgress}%`}
          detail={t('portfolio.plannedProgress', { value: model.summary.plannedProgress })}
          tone={progressTone(model.header.status) === 'red' ? 'red' : 'blue'}
          icon={<ChartIcon />}
        />
        <KpiTile
          label={t('detail.summary.disbursementRate')}
          value={disbursement.text}
          detail={t('detail.kpi.financialProgress', { value: model.summary.financialProgress })}
          tone="green"
          icon={<CoinsIcon />}
        />
        <KpiTile
          label={t('detail.summary.approvedBudget')}
          value={formatVnd(model.summary.approvedBudget, locale)}
          tone="gold"
          icon={<DocumentIcon />}
        />
        <KpiTile
          label={t('detail.summary.scheduleVariance')}
          value={scheduleVariance.text}
          detail={t('detail.kpi.scheduleHint')}
          tone={
            model.summary.scheduleVariance.value !== null &&
            model.summary.scheduleVariance.value < 0
              ? 'red'
              : 'blue'
          }
          icon={<ClockIcon />}
        />
        <KpiTile
          label={t('detail.kpi.openIssues')}
          value={openIssues}
          detail={t('detail.kpi.overdueIssues', { value: overdueIssues.text })}
          tone={openIssues > 0 ? 'orange' : 'green'}
          icon={openIssues > 0 ? <AlertIcon /> : <CheckCircleIcon />}
        />
      </ul>

      <div className="project-detail__content-grid">
        {model.attentionReasons.length > 0 && (
          <Card
            className="project-detail__attention"
            aria-labelledby="project-detail-attention-heading"
          >
            <PanelHeader
              title={t('detail.attentionHeading')}
              icon={<AlertIcon />}
              headingId="project-detail-attention-heading"
            />
            <div className="project-detail__attention-status">
              <StatusChip label={t('detail.attentionStatus')} tone="warning" dot />
            </div>
            <ul>
              {model.attentionReasons.map((reason) => (
                <li key={reason.category}>{t(`reason.${reason.category}` as MessageKey)}</li>
              ))}
            </ul>
          </Card>
        )}

        <Card className="project-detail__summary" aria-labelledby="project-detail-summary-heading">
          <PanelHeader
            title={t('detail.summaryHeading')}
            icon={<FolderIcon />}
            headingId="project-detail-summary-heading"
          />
          <StatList items={detailStats} />
        </Card>
      </div>

      <div className="project-detail__two-column">
        <Card
          className="project-detail__work-packages"
          aria-labelledby="project-detail-workpackages-heading"
        >
          <PanelHeader
            title={t('detail.workPackagesHeading', { count: model.workPackages.length })}
            icon={<DocumentIcon />}
            headingId="project-detail-workpackages-heading"
          />
          {model.workPackages.length === 0 ? (
            <p>{t('detail.workPackagesEmpty')}</p>
          ) : (
            <DataTable
              caption={t('detail.workPackagesTableCaption')}
              rows={model.workPackages}
              getRowKey={(row) => row.id}
              columns={workPackageColumns}
            />
          )}
        </Card>
        <Card
          className="project-detail__milestones"
          aria-labelledby="project-detail-milestones-heading"
        >
          <PanelHeader
            title={t('detail.milestonesHeading', { count: model.milestones.length })}
            icon={<TargetIcon />}
            headingId="project-detail-milestones-heading"
          />
          {model.milestones.length === 0 ? (
            <p>{t('detail.milestonesEmpty')}</p>
          ) : (
            <DataTable
              caption={t('detail.milestonesTableCaption')}
              rows={model.milestones}
              getRowKey={(row) => row.id}
              columns={milestoneColumns}
            />
          )}
        </Card>
      </div>

      <div className="project-detail__two-column">
        <Card
          className="project-detail__progress-history"
          aria-labelledby="project-detail-progress-history-heading"
        >
          <PanelHeader
            title={t('detail.progressHistoryHeading')}
            icon={<ChartIcon />}
            headingId="project-detail-progress-history-heading"
          />
          <ProgressHistorySparkline points={model.progressHistory} />
        </Card>
        <Card className="project-detail__issues" aria-labelledby="project-detail-issues-heading">
          <PanelHeader
            title={t('detail.issuesHeading', {
              count: model.issues.all.length,
              overdue: overdueIssues.text,
            })}
            icon={<AlertIcon />}
            headingId="project-detail-issues-heading"
          />
          {model.issues.all.length === 0 ? (
            <p>{t('detail.issuesEmpty')}</p>
          ) : (
            <DataTable
              caption={t('detail.issuesTableCaption')}
              rows={model.issues.all}
              getRowKey={(row) => row.id}
              columns={issueColumns}
            />
          )}
        </Card>
      </div>

      <Card
        className="project-detail__snapshot-explanation"
        aria-labelledby="project-detail-snapshot-explanation-heading"
      >
        <PanelHeader
          title={t('detail.snapshotExplanation.heading')}
          icon={<CheckCircleIcon />}
          headingId="project-detail-snapshot-explanation-heading"
        />
        {(() => {
          const explanation = model.snapshotExplanation;
          if (explanation.observedAt === null) return <p>{t('detail.snapshotExplanation.none')}</p>;
          const selected = explanation.selectedSnapshot;
          return (
            <div className="project-detail__snapshot-body">
              <p>
                {t('detail.snapshotExplanation.selectedObservedAt', {
                  observedAt: formatDate(explanation.observedAt, locale),
                })}
              </p>
              {selected ? (
                <>
                  <p>
                    {t('detail.snapshotExplanation.selectedStatus', {
                      status: t(
                        `progressVerificationStatus.${selected.verificationStatus}` as MessageKey,
                      ),
                    })}
                  </p>
                  {selected.confidence && (
                    <p>
                      {t('detail.snapshotExplanation.selectedConfidence', {
                        confidence: t(`confidence.${selected.confidence}` as MessageKey),
                      })}
                    </p>
                  )}
                  {explanation.selectedReason && (
                    <p>
                      {t('detail.snapshotExplanation.reason', {
                        reason: t(
                          `detail.snapshotExplanation.selectionReasonCode.${explanation.selectedReason.code}` as MessageKey,
                          {
                            status: t(
                              `progressVerificationStatus.${explanation.selectedReason.verificationStatus}` as MessageKey,
                            ),
                            count: explanation.selectedReason.competingCount,
                          },
                        ),
                      })}
                    </p>
                  )}
                  {explanation.affectedKpis.length > 0 && (
                    <p>
                      {t('detail.snapshotExplanation.affectedKpis', {
                        kpis: explanation.affectedKpis
                          .map((kpi) => t(`affectedKpiLabel.${kpi}` as MessageKey))
                          .join(', '),
                      })}
                    </p>
                  )}
                </>
              ) : (
                <p role="note">
                  {t('detail.snapshotExplanation.noneSelectedFor', {
                    observedAt: formatDate(explanation.observedAt, locale),
                  })}
                </p>
              )}
              {explanation.otherObservationDates.length > 0 && (
                <p>
                  {t('detail.snapshotExplanation.otherObservations', {
                    dates: explanation.otherObservationDates
                      .map((date) => formatDate(date, locale))
                      .join(', '),
                  })}
                </p>
              )}
              {explanation.competingSnapshots.length > 1 && (
                <details>
                  <summary>
                    {t('detail.snapshotExplanation.competingToggle', {
                      count: explanation.competingSnapshots.length,
                    })}
                  </summary>
                  <ul className="project-detail__card-list">
                    {explanation.competingSnapshots.map((entry) => (
                      <li key={entry.snapshot.sourceRecordId} className="project-detail__card">
                        <p>
                          {entry.selected && (
                            <strong>
                              {t('detail.snapshotExplanation.competingSelectedBadge')}{' '}
                            </strong>
                          )}
                          {t('detail.snapshotExplanation.competingRecord', {
                            sourceRecordId: entry.snapshot.sourceRecordId,
                            status: t(
                              `progressVerificationStatus.${entry.snapshot.verificationStatus}` as MessageKey,
                            ),
                            importedAt: formatDateTime(entry.snapshot.importedAt, locale),
                          })}
                        </p>
                        {entry.exclusionReason && (
                          <p>
                            {t(
                              `detail.snapshotExplanation.exclusionReasonCode.${entry.exclusionReason.code}` as MessageKey,
                            )}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          );
        })()}
      </Card>

      <div className="project-detail__two-column">
        <Card
          className="project-detail__geography"
          aria-labelledby="project-detail-geography-heading"
        >
          <PanelHeader
            title={t('detail.geographyHeading')}
            icon={<MapIcon />}
            headingId="project-detail-geography-heading"
          />
          <StatList
            items={[
              {
                label: t('detail.geography.areaLabel'),
                value: areas.join(', ') || t('detail.geography.areaNone'),
              },
              { label: t('detail.geography.accuracyLabel'), value: locationAccuracy },
            ]}
          />
          {hasApproximateLocation && (
            <p className="project-detail__approximate-note">
              {t('detail.location.approximateNote')}
            </p>
          )}
          {!canViewOnMap && <p>{t('detail.geography.noGeometry')}</p>}
        </Card>

        <Card
          className="project-detail__provenance"
          aria-labelledby="project-detail-provenance-heading"
        >
          <PanelHeader
            title={t('detail.provenanceHeading')}
            icon={<DocumentIcon />}
            headingId="project-detail-provenance-heading"
          />
          <div className="project-detail__provenance-list">
            <div className="project-detail__provenance-entry">
              <strong>{t('detail.provenance.projectRecord')}</strong>
              <span>
                {t('detail.provenance.sourceDataset', { id: model.header.sourceDatasetId })}
              </span>
              <span>
                {t('detail.provenance.verification', {
                  value: t(
                    `progressVerificationStatus.${model.header.verificationStatus}` as MessageKey,
                  ),
                })}
              </span>
              <span>
                {t('detail.provenance.confidence', {
                  value: t(`confidence.${model.header.confidence}` as MessageKey),
                })}
              </span>
              <span>{t('detail.provenance.dataOwner', { value: model.header.dataOwner })}</span>
            </div>
            {model.provenance.map((entry) => {
              if (!entry.dataset)
                return (
                  <div key={entry.sourceDatasetId} className="project-detail__provenance-entry">
                    <strong>{entry.sourceDatasetId}</strong>
                    <span>
                      {t('detail.provenance.missing', { datasetId: entry.sourceDatasetId })}
                    </span>
                  </div>
                );
              const title = resolveLocalizedText(entry.dataset.title, locale);
              return (
                <div key={entry.sourceDatasetId} className="project-detail__provenance-entry">
                  <strong>{title.text}</strong>
                  <span>{t('detail.provenance.sourceDataset', { id: entry.sourceDatasetId })}</span>
                  <span>
                    {t('detail.provenance.quality', {
                      status: entry.dataset.quality.status,
                      version: entry.dataset.version,
                    })}
                  </span>
                </div>
              );
            })}
          </div>
          <h3>{t('detail.provenance.evidenceHeading')}</h3>
          {evidence.length === 0 ? (
            <p>{t('detail.provenance.noEvidence')}</p>
          ) : (
            <ul className="project-detail__evidence-list">
              {evidence.map((item) => (
                <li key={item.id}>
                  <strong>{item.title}</strong>
                  <span>
                    {t('detail.provenance.evidenceKind', {
                      kind: t(`evidenceKind.${item.kind}` as MessageKey),
                    })}
                  </span>
                  {item.capturedAt && (
                    <span>
                      {t('detail.provenance.evidenceCapturedAt', {
                        date: formatDate(item.capturedAt, locale),
                      })}
                    </span>
                  )}
                  {item.sourceDatasetId && (
                    <span>
                      {t('detail.provenance.sourceDataset', { id: item.sourceDatasetId })}
                    </span>
                  )}
                  {item.dataOwner && (
                    <span>{t('detail.provenance.dataOwner', { value: item.dataOwner })}</span>
                  )}
                  {item.note && <span>{item.note}</span>}
                </li>
              ))}
            </ul>
          )}
          <dl className="project-detail__timeline">
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
        </Card>
      </div>
    </section>
  );
}
