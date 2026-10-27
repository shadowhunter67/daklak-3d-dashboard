import { useMemo, useState } from 'react';
import labels from '#province-assets/daklak-labels.json';
import { ADMIN_UNIT_MEDIA } from '../../data/adminUnitMedia';
import { imageCoverage } from '../unit-profile/model/unitProfileModel';
import {
  PLANNING_DOCUMENTS,
  PLANNING_REVIEW_PROJECT_IDS,
  PLANNING_TOTAL_PROJECTS,
  PLANNING_UNCITED_PROJECT_IDS,
} from '../../data/planningCitations';
import { summarizePlanning } from '../planning-hub/model/planningModel';
import { defaultProjectPortfolioSource } from '../../app/createProjectPortfolioSource';
import type { ProjectPortfolioSource } from '../../entities/project/adapters/ProjectPortfolioSource';
import { useMapStore } from '../../stores/mapStore';
import { useTranslation } from '../../i18n/useTranslation';
import type { MessageKey } from '../../i18n/messages';
import { formatDateTime } from '../../i18n/formatters';
import {
  dataQualityIssueDetail,
  dataQualityRuleLabelKey,
} from '../../entities/project/dataQualityMessages';
import { useDataReadiness } from './data/useDataReadiness';
import type {
  DataReadinessIssueWithProjectLink,
  DataReadinessModel,
} from './model/dataReadinessTypes';
import { calculateDataHealthScore } from '../executive-overview/model/dataHealthScore';
import { buildDataReadinessSummary } from './model/dataReadinessSummary';
import {
  AlertIcon,
  CheckCircleIcon,
  ClockIcon,
  DatabaseIcon,
  DocumentIcon,
  TargetIcon,
} from '../../components/layout/icons';
import {
  Card,
  DataTable,
  DonutChart,
  GaugeChart,
  KpiTile,
  PageHeader,
  PanelHeader,
  ProgressBar,
  SearchField,
  SelectField,
  StatusChip,
} from '../../components/ui';

function IssueDetails({
  issues,
  headingKey,
  emptyKey,
  idSuffix,
  onOpenProject,
}: {
  issues: readonly DataReadinessIssueWithProjectLink[];
  headingKey: MessageKey;
  emptyKey: MessageKey;
  idSuffix: string;
  onOpenProject: (projectId: string) => void;
}) {
  const { t, locale } = useTranslation();
  const headingId = `data-readiness-${idSuffix}-heading`;
  return (
    <section aria-labelledby={headingId} className="data-readiness__issue-group">
      <h3 id={headingId}>
        {t(headingKey)} ({issues.length})
      </h3>
      {issues.length === 0 ? (
        <p role="status">{t(emptyKey)}</p>
      ) : (
        <ul className="data-readiness__issue-list">
          {issues.map((issue) => (
            <li key={issue.id}>
              <span className="data-readiness__issue-rule">
                {t(dataQualityRuleLabelKey(issue.rule))}
              </span>{' '}
              — {dataQualityIssueDetail(issue, locale)}
              {issue.linkedProjectId && (
                <button
                  type="button"
                  className="data-readiness__issue-link"
                  onClick={() => onOpenProject(issue.linkedProjectId!)}
                >
                  {t('dataReadiness.issue.openProject')}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ReadinessPanels({
  model,
  onOpenProject,
}: {
  model: DataReadinessModel;
  onOpenProject: (projectId: string) => void;
}) {
  const { t, locale } = useTranslation();
  const [severity, setSeverity] = useState<'all' | 'error' | 'warning'>('all');
  const [query, setQuery] = useState('');
  const issues = useMemo(
    () =>
      [...model.dataQualityIssues, ...model.businessAlerts].filter((issue) => {
        const matchesSeverity = severity === 'all' || issue.severity === severity;
        return (
          matchesSeverity &&
          `${issue.message} ${issue.rule} ${issue.entityId}`
            .toLocaleLowerCase()
            .includes(query.toLocaleLowerCase())
        );
      }),
    [model, query, severity],
  );
  const totalRecords = Object.values(model.counts).reduce((sum, value) => sum + value, 0);
  const records = [
    {
      key: 'valid',
      count: Math.max(
        0,
        totalRecords - model.validationErrors.length - model.dataQualityIssues.length,
      ),
      tone: 'green' as const,
    },
    { key: 'review', count: model.businessAlerts.length, tone: 'gold' as const },
    {
      key: 'error',
      count: model.validationErrors.length + model.dataQualityIssues.length,
      tone: 'red' as const,
    },
    { key: 'pending', count: 0, tone: 'blue' as const },
  ];
  const issueSegments = [
    {
      label: t('dataReadiness.distribution.validation'),
      value: model.validationErrors.length,
      tone: '#e5484d',
    },
    {
      label: t('dataReadiness.distribution.quality'),
      value: model.dataQualityIssues.length,
      tone: '#f0b429',
    },
    {
      label: t('dataReadiness.distribution.business'),
      value: model.businessAlerts.length,
      tone: '#3b82f6',
    },
    {
      label: t('dataReadiness.distribution.provenance'),
      value: model.missingProvenanceChildCount,
      tone: '#8b5cf6',
    },
  ].filter((segment) => segment.value > 0);

  return (
    <>
      <div className="data-readiness__operations-grid">
        <Card className="data-readiness__operation-card">
          <PanelHeader
            title={t('dataReadiness.sourcesHeading')}
            icon={<DatabaseIcon />}
            headingId="data-sources-heading"
          />
          <ul className="data-readiness__source-list">
            {model.metadata.datasetIds.map((datasetId) => (
              <li key={datasetId}>
                <span aria-hidden="true">●</span>
                <span>{datasetId}</span>
                <StatusChip label={t('dataReadiness.sourceActive')} tone="success" dot />
              </li>
            ))}
          </ul>
        </Card>
        <Card className="data-readiness__operation-card">
          <PanelHeader
            title={t('dataReadiness.recordStatusHeading')}
            icon={<DocumentIcon />}
            headingId="record-status-heading"
          />
          <p className="data-readiness__record-total">
            {totalRecords.toLocaleString()} {t('dataReadiness.records')}
          </p>
          <ul className="data-readiness__record-bars">
            {records.map((item) => (
              <li key={item.key}>
                <span>{t(`dataReadiness.recordStatus.${item.key}` as MessageKey)}</span>
                <strong>{item.count.toLocaleString()}</strong>
                <ProgressBar
                  value={totalRecords ? (item.count / totalRecords) * 100 : 0}
                  tone={item.tone}
                  valueText={`${totalRecords ? Math.round((item.count / totalRecords) * 100) : 0}%`}
                />
              </li>
            ))}
          </ul>
          <p className="data-readiness__method-note">{t('dataReadiness.recordStatusNote')}</p>
        </Card>
        <Card className="data-readiness__operation-card">
          <PanelHeader
            title={t('dataReadiness.distributionHeading')}
            icon={<AlertIcon />}
            headingId="data-distribution-heading"
          />
          <DonutChart
            segments={issueSegments}
            totalLabel={t('dataReadiness.issuesTotal')}
            ariaLabel={t('dataReadiness.distributionAria')}
          />
        </Card>
      </div>
      <Card className="data-readiness__alerts" aria-labelledby="data-alerts-heading">
        <PanelHeader
          title={t('dataReadiness.alertsHeading')}
          icon={<AlertIcon />}
          headingId="data-alerts-heading"
        />
        <div className="data-readiness__filters">
          <SelectField
            id="data-readiness-severity"
            label={t('dataReadiness.severityFilter')}
            value={severity}
            onChange={(event) => setSeverity(event.target.value as typeof severity)}
            options={[
              { value: 'all', label: t('dataReadiness.all') },
              { value: 'error', label: t('dataReadiness.error') },
              { value: 'warning', label: t('dataReadiness.warning') },
            ]}
          />
          <SearchField
            id="data-readiness-search"
            label={t('dataReadiness.search')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('dataReadiness.searchPlaceholder')}
          />
        </div>
        {issues.length > 0 ? (
          <DataTable
            caption={t('dataReadiness.alertsHeading')}
            rows={issues}
            getRowKey={(row) => row.id}
            columns={[
              {
                key: 'rule',
                header: t('dataReadiness.alertColumn'),
                render: (row) => (
                  <>
                    <strong>{t(dataQualityRuleLabelKey(row.rule))}</strong>
                    <span className="data-readiness__table-message">
                      {dataQualityIssueDetail(row, locale)}
                    </span>
                  </>
                ),
              },
              {
                key: 'severity',
                header: t('dataReadiness.severityFilter'),
                render: (row) => (
                  <StatusChip
                    label={
                      row.severity === 'error'
                        ? t('dataReadiness.error')
                        : t('dataReadiness.warning')
                    }
                    tone={row.severity === 'error' ? 'danger' : 'warning'}
                    dot
                  />
                ),
              },
              {
                key: 'entity',
                header: t('dataReadiness.entityColumn'),
                render: (row) => row.entityId,
              },
              {
                key: 'action',
                header: t('portfolio.col.action'),
                render: (row) =>
                  row.linkedProjectId ? (
                    <button
                      type="button"
                      className="data-readiness__issue-link"
                      onClick={() => onOpenProject(row.linkedProjectId!)}
                    >
                      {t('dataReadiness.issue.openProject')}
                    </button>
                  ) : (
                    '—'
                  ),
              },
            ]}
          />
        ) : (
          <p role="status">{t('dataReadiness.filteredEmpty')}</p>
        )}
      </Card>
      <details className="data-readiness__technical">
        <summary>{t('dataReadiness.technicalDetails')}</summary>
        <div className="data-readiness__technical-body">
          <section aria-labelledby="data-readiness-source-heading">
            <h3 id="data-readiness-source-heading">{t('dataReadiness.sourceHeading')}</h3>
            <dl className="data-readiness__grid">
              <div>
                <dt>{t('dataReadiness.sourceKind')}</dt>
                <dd>{t(`dataReadiness.sourceKind.${model.metadata.sourceKind}` as MessageKey)}</dd>
              </div>
              <div>
                <dt>{t('dataReadiness.isIllustrative')}</dt>
                <dd>
                  {model.metadata.isIllustrative
                    ? t('dataReadiness.isIllustrative.yes')
                    : t('dataReadiness.isIllustrative.no')}
                </dd>
              </div>
              <div>
                <dt>{t('dataReadiness.schemaVersion')}</dt>
                <dd>{model.metadata.schemaVersion ?? t('dataReadiness.notAvailable')}</dd>
              </div>
              <div>
                <dt>{t('dataReadiness.bundleVersion')}</dt>
                <dd>{model.metadata.bundleVersion ?? t('dataReadiness.notAvailable')}</dd>
              </div>
              <div>
                <dt>{t('dataReadiness.asOf')}</dt>
                <dd>
                  {model.metadata.asOf
                    ? formatDateTime(model.metadata.asOf, locale)
                    : t('dataReadiness.notAvailable')}
                </dd>
              </div>
              <div>
                <dt>{t('dataReadiness.generatedAt')}</dt>
                <dd>
                  {model.metadata.generatedAt
                    ? formatDateTime(model.metadata.generatedAt, locale)
                    : t('dataReadiness.notAvailable')}
                </dd>
              </div>
              <div>
                <dt>{t('dataReadiness.datasetCount')}</dt>
                <dd>{model.metadata.datasetIds.length}</dd>
              </div>
            </dl>
          </section>
          <section aria-labelledby="data-readiness-counts-heading">
            <h3 id="data-readiness-counts-heading">{t('dataReadiness.countsHeading')}</h3>
            <dl className="data-readiness__grid">
              {Object.entries(model.counts).map(([key, value]) => (
                <div key={key}>
                  <dt>{t(`dataReadiness.count.${key}` as MessageKey)}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
              <div>
                <dt>{t('dataReadiness.staleCount')}</dt>
                <dd>{model.staleProjectCount}</dd>
              </div>
              <div>
                <dt>{t('dataReadiness.duplicateCount')}</dt>
                <dd>{model.duplicateRecordCount}</dd>
              </div>
              <div>
                <dt>{t('dataReadiness.unmappedAdministrativeCodeCount')}</dt>
                <dd>{model.unmappedAdministrativeCodeCount}</dd>
              </div>
              <div>
                <dt>{t('dataReadiness.lowConfidenceCount')}</dt>
                <dd>{model.lowConfidenceProjectCount}</dd>
              </div>
              <div>
                <dt>{t('dataReadiness.unverifiedCount')}</dt>
                <dd>{model.unverifiedProjectCount}</dd>
              </div>
              <div>
                <dt>{t('dataReadiness.missingProvenanceCount')}</dt>
                <dd>{model.missingProvenanceChildCount}</dd>
              </div>
            </dl>
          </section>
          <p className="data-readiness__note" role="note">
            {t('dataReadiness.classificationNote')}
          </p>
          <section aria-labelledby="data-readiness-validation-heading">
            <h3 id="data-readiness-validation-heading">
              {t('dataReadiness.validationHeading')} ({model.validationErrors.length})
            </h3>
            {model.validationErrors.length === 0 ? (
              <p role="status">{t('dataReadiness.validationEmpty')}</p>
            ) : (
              <ul className="data-readiness__issue-list">
                {model.validationErrors.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            )}
          </section>
          <IssueDetails
            issues={model.dataQualityIssues}
            headingKey="dataReadiness.qualityHeading"
            emptyKey="dataReadiness.qualityEmpty"
            idSuffix="quality"
            onOpenProject={onOpenProject}
          />
          <IssueDetails
            issues={model.businessAlerts}
            headingKey="dataReadiness.businessHeading"
            emptyKey="dataReadiness.businessEmpty"
            idSuffix="business"
            onOpenProject={onOpenProject}
          />
        </div>
      </details>
    </>
  );
}

const ALL_UNIT_CODES = Object.keys(labels);

/** Bốn con số dễ hiểu về nguồn của 201 dự án thu hút đầu tư (đếm từ dữ liệu thật) và cảnh báo chất lượng
 * của dữ liệu minh họa. Không có số nào ở đây là số bịa: "Cần xác minh" và "Thiếu nguồn" đếm đúng ô quy
 * hoạch trong văn bản nguồn. */
function SimpleSourceStatus({
  issueCount,
  verifiedPhotos,
  totalUnits,
  fallbackUnits,
}: {
  issueCount: number;
  verifiedPhotos: number;
  totalUnits: number;
  fallbackUnits: number;
}) {
  const { t } = useTranslation();
  const summary = summarizePlanning({
    documents: PLANNING_DOCUMENTS,
    total: PLANNING_TOTAL_PROJECTS,
    uncited: PLANNING_UNCITED_PROJECT_IDS,
    review: PLANNING_REVIEW_PROJECT_IDS,
  });
  return (
    <section aria-labelledby="source-status-heading" className="data-readiness__simple">
      <h2 id="source-status-heading">
        {t('dataReadiness.simple.heading', { total: summary.total })}
      </h2>
      <ul className="ui-kpi-grid data-readiness__kpis data-readiness__kpis--simple">
        <KpiTile
          label={t('dataReadiness.simple.sourced')}
          value={summary.citedProjects}
          tone="green"
          icon={<CheckCircleIcon />}
          detail={t('dataReadiness.simple.sourcedDetail')}
        />
        <KpiTile
          label={t('dataReadiness.simple.verify')}
          value={summary.reviewProjects}
          tone="gold"
          icon={<TargetIcon />}
          detail={t('dataReadiness.simple.verifyDetail')}
        />
        <KpiTile
          label={t('dataReadiness.simple.missing')}
          value={summary.uncitedProjects}
          tone="purple"
          icon={<AlertIcon />}
          detail={t('dataReadiness.simple.missingDetail')}
        />
        <KpiTile
          label={t('dataReadiness.simple.update')}
          value={issueCount}
          tone="blue"
          icon={<ClockIcon />}
          detail={t('dataReadiness.simple.updateDetail')}
        />
        <KpiTile
          label={t('dataReadiness.imageCoverage')}
          value={`${verifiedPhotos}/${totalUnits}`}
          tone="purple"
          icon={<DocumentIcon />}
          detail={t('dataReadiness.imageCoverageDetail', { fallback: String(fallbackUnits) })}
        />
      </ul>
    </section>
  );
}

export function DataReadinessView({
  source,
  onBackToOverview,
  onOpenProject,
}: {
  source?: ProjectPortfolioSource;
  onBackToOverview: () => void;
  onOpenProject: (projectId: string) => void;
}) {
  const { t } = useTranslation();
  const openProvenancePanel = useMapStore((state) => state.openProvenancePanel);
  const coverage = useMemo(() => imageCoverage(ALL_UNIT_CODES, ADMIN_UNIT_MEDIA), []);
  const [retryToken, setRetryToken] = useState(0);
  // Mặc định "Đơn giản": 4 con số dễ hiểu; "Kỹ thuật" mới mở bảng cảnh báo, danh mục nguồn, chuỗi truy xuất.
  const [mode, setMode] = useState<'simple' | 'technical'>('simple');
  const effectiveSource = useMemo(() => source ?? defaultProjectPortfolioSource, [source]);
  const state = useDataReadiness(effectiveSource, retryToken);
  if (state.status === 'loading')
    return (
      <section
        id="data-readiness"
        className="data-readiness"
        aria-live="polite"
        aria-busy="true"
        tabIndex={-1}
      >
        <span className="map-loading__spinner" aria-hidden="true" />
        <p>{t('dataReadiness.loading')}</p>
      </section>
    );
  if (state.status === 'error')
    return (
      <section id="data-readiness" className="data-readiness" tabIndex={-1}>
        <div className="data-readiness__error" role="alert">
          <h2>{t('dataReadiness.loadErrorHeading')}</h2>
          <p>{t(`errorKind.${state.error.kind}` as MessageKey)}</p>
          <p className="data-readiness__error-detail">{state.error.message}</p>
          <button type="button" onClick={() => setRetryToken((n) => n + 1)}>
            {t('dataReadiness.retry')}
          </button>
          <button type="button" onClick={onBackToOverview}>
            {t('dataReadiness.backToOverview')}
          </button>
        </div>
      </section>
    );

  const { model } = state;
  const health = calculateDataHealthScore(model.dataHealth);
  const summary = buildDataReadinessSummary(model);
  const icons = {
    completeness: DocumentIcon,
    freshness: ClockIcon,
    consistency: CheckCircleIcon,
    traceability: TargetIcon,
  } as const;
  return (
    <section
      id="data-readiness"
      className="data-readiness ui-page-root"
      aria-label={t('dataReadiness.heading')}
      tabIndex={-1}
    >
      <PageHeader
        headingId="data-readiness-heading"
        title={t('dataReadiness.heading')}
        description={t('dataReadiness.description')}
        badge={model.metadata.isIllustrative ? t('portfolio.illustrativeBadge') : undefined}
        badgeClassName="project-portfolio__mock-badge"
        breadcrumb={
          <>
            <span>{t('common.home')}</span>
            <strong>{t('common.data')}</strong>
          </>
        }
        breadcrumbLabel={t('common.breadcrumb')}
        actions={
          <>
            <button type="button" className="data-readiness__back" onClick={openProvenancePanel}>
              {t('dataReadiness.openCatalog')}
            </button>
            <button type="button" className="data-readiness__back" onClick={onBackToOverview}>
              {t('dataReadiness.backToOverview')}
            </button>
          </>
        }
      />
      <Card className="data-readiness__health-hero">
        <div>
          <PanelHeader
            title={t('dataReadiness.healthHeading')}
            icon={<DatabaseIcon />}
            headingId="data-readiness-health-heading"
          />
          <p>{t(`dataReadiness.summary.status.${summary.status}` as MessageKey)}</p>
          <p>
            {t('dataReadiness.healthIssues', { count: model.dataHealth.totalDataQualityIssues })}
          </p>
          <p className="data-readiness__formula">{t('dataHealth.formula')}</p>
        </div>
        <GaugeChart
          value={health.score}
          label={t('dataHealth.scoreLabel')}
          thresholds={[
            { at: 0, color: '#e5484d' },
            { at: 70, color: '#e4b94a' },
            { at: 90, color: '#22a06b' },
          ]}
          ariaLabel={`${t('dataHealth.scoreLabel')}: ${health.score}%`}
        />
      </Card>
      <div
        className="data-readiness__mode"
        role="group"
        aria-label={t('dataReadiness.mode.groupLabel')}
      >
        {(['simple', 'technical'] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={mode === value}
            onClick={() => setMode(value)}
          >
            {t(`dataReadiness.mode.${value}` as MessageKey)}
          </button>
        ))}
      </div>
      {mode === 'simple' && (
        <SimpleSourceStatus
          issueCount={model.dataHealth.totalDataQualityIssues}
          verifiedPhotos={coverage.verified}
          totalUnits={coverage.total}
          fallbackUnits={coverage.fallback}
        />
      )}
      {mode === 'technical' && (
        <ul className="ui-kpi-grid data-readiness__kpis">
          {health.metrics.map((metric) => {
            const Icon = icons[metric.key];
            return (
              <KpiTile
                key={metric.key}
                label={t(`dataHealth.metric.${metric.key}` as MessageKey)}
                value={`${Math.round(metric.value * 100)}%`}
                tone={
                  metric.key === 'freshness'
                    ? 'gold'
                    : metric.key === 'consistency'
                      ? 'green'
                      : 'blue'
                }
                icon={<Icon />}
                detail={t('dataReadiness.metricDetail')}
              />
            );
          })}
          <KpiTile
            label={t('dataReadiness.imageCoverage')}
            value={`${coverage.verified}/${coverage.total}`}
            tone="purple"
            icon={<DocumentIcon />}
            detail={t('dataReadiness.imageCoverageDetail', { fallback: String(coverage.fallback) })}
          />
        </ul>
      )}
      {state.status === 'degraded' && (
        <p role="alert" className="data-readiness__degraded-banner">
          {t('dataReadiness.degradedBanner', { issues: state.sourceIssues.join('; ') })}
        </p>
      )}
      {mode === 'technical' && <ReadinessPanels model={model} onOpenProject={onOpenProject} />}
    </section>
  );
}
