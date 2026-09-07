import { useEffect, useMemo, useRef, useState } from 'react';
import { defaultProjectPortfolioSource } from '../../app/createProjectPortfolioSource';
import type { ProjectPortfolioSource } from '../../entities/project/adapters/ProjectPortfolioSource';
import { useTranslation } from '../../i18n/useTranslation';
import type { MessageKey } from '../../i18n/messages';
import { formatDateTime } from '../../i18n/formatters';
import { dataQualityRuleLabelKey } from '../../entities/project/dataQualityMessages';
import { useDataReadiness } from './data/useDataReadiness';
import { buildDataReadinessSummary } from './model/dataReadinessSummary';
import type {
  DataReadinessIssueWithProjectLink,
  DataReadinessModel,
} from './model/dataReadinessTypes';

function DataReadinessSummaryPanel({ model }: { model: DataReadinessModel }) {
  const { t } = useTranslation();
  const summary = buildDataReadinessSummary(model);
  return (
    <section
      className="data-readiness-summary"
      data-status={summary.status}
      aria-labelledby="data-readiness-summary-heading"
    >
      <h3 id="data-readiness-summary-heading">{t('dataReadiness.summary.heading')}</h3>
      <p className="data-readiness-summary__status">
        <span className="data-readiness-summary__status-badge" aria-hidden="true">
          {summary.status === 'good' ? '✓' : summary.status === 'attention' ? '!' : '✕'}
        </span>
        {t(`dataReadiness.summary.status.${summary.status}` as const)}
      </p>
      <p className="data-readiness-summary__line">
        {t('dataReadiness.summary.line', {
          errors: String(summary.structuralErrorCount),
          alerts: String(summary.businessAlertCount),
          stale: String(summary.staleProjectCount),
          datasets: String(summary.activeDatasetCount),
        })}
      </p>
      <div className="data-readiness-summary__cards">
        <div className="data-readiness-summary__card">
          <h4>{t('dataReadiness.summary.completeness')}</h4>
          <p>
            {t('dataReadiness.summary.completeness.value', {
              errors: String(summary.completeness.structuralErrorCount),
              total: String(summary.completeness.totalRecordCount),
            })}
          </p>
        </div>
        <div className="data-readiness-summary__card">
          <h4>{t('dataReadiness.summary.freshness')}</h4>
          <p>
            {t('dataReadiness.summary.freshness.value', {
              stale: String(summary.freshness.staleCount),
              total: String(summary.freshness.totalCount),
            })}
          </p>
        </div>
        <div className="data-readiness-summary__card">
          <h4>{t('dataReadiness.summary.consistency')}</h4>
          <p>
            {t('dataReadiness.summary.consistency.value', {
              duplicates: String(summary.consistency.duplicateCount),
              unmapped: String(summary.consistency.unmappedCount),
            })}
          </p>
        </div>
        <div className="data-readiness-summary__card">
          <h4>{t('dataReadiness.summary.provenance')}</h4>
          <p>
            {t('dataReadiness.summary.provenance.value', {
              missing: String(summary.provenance.missingCount),
              lowConfidence: String(summary.provenance.lowConfidenceCount),
              unverified: String(summary.provenance.unverifiedCount),
            })}
          </p>
        </div>
      </div>
    </section>
  );
}

function IssueList({
  issues,
  emptyKey,
  headingKey,
  idSuffix,
  onOpenProject,
}: {
  issues: readonly DataReadinessIssueWithProjectLink[];
  emptyKey: MessageKey;
  headingKey: MessageKey;
  idSuffix: string;
  onOpenProject: (projectId: string) => void;
}) {
  const { t } = useTranslation();
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
              {/* Nhãn dễ hiểu thay cho slug kỹ thuật (issue.rule) — chi tiết đầy đủ (thường có
                  entity id cụ thể) vẫn giữ nguyên ngay sau đó cho người cần đào sâu hơn. */}
              <span className="data-readiness__issue-rule">
                {t(dataQualityRuleLabelKey(issue.rule))}
              </span>{' '}
              — {issue.message}
              {/* C6: chỉ hiển thị nút điều hướng khi projectId đã resolve được thật — không tạo
                  dead link cho issue không gắn project (workPackage/milestone mồ côi, v.v.). */}
              {issue.linkedProjectId && (
                <>
                  {' '}
                  <button
                    type="button"
                    className="data-readiness__issue-link"
                    onClick={() => onOpenProject(issue.linkedProjectId!)}
                  >
                    {t('dataReadiness.issue.openProject')}
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
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
  const { t, locale } = useTranslation();
  const [retryToken, setRetryToken] = useState(0);
  const effectiveSource = useMemo(() => source ?? defaultProjectPortfolioSource, [source]);
  const state = useDataReadiness(effectiveSource, retryToken);
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  if (state.status === 'loading') {
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
  }

  if (state.status === 'error') {
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
  }

  const { model } = state;
  const { metadata } = model;

  return (
    <section
      id="data-readiness"
      className="data-readiness"
      aria-labelledby="data-readiness-heading"
      tabIndex={-1}
    >
      <button type="button" className="data-readiness__back" onClick={onBackToOverview}>
        {t('dataReadiness.backToOverview')}
      </button>
      <h2 id="data-readiness-heading" ref={headingRef} tabIndex={-1}>
        {t('dataReadiness.heading')}
      </h2>
      <p className="data-readiness__description">{t('dataReadiness.description')}</p>

      <DataReadinessSummaryPanel model={model} />

      {state.status === 'degraded' && (
        <p role="alert" className="data-readiness__degraded-banner">
          {t('dataReadiness.degradedBanner', { issues: state.sourceIssues.join('; ') })}
        </p>
      )}

      <section aria-labelledby="data-readiness-source-heading">
        <h3 id="data-readiness-source-heading">{t('dataReadiness.sourceHeading')}</h3>
        <dl className="data-readiness__grid">
          <div>
            <dt>{t('dataReadiness.sourceKind')}</dt>
            <dd>{t(`dataReadiness.sourceKind.${metadata.sourceKind}` as MessageKey)}</dd>
          </div>
          <div>
            <dt>{t('dataReadiness.isIllustrative')}</dt>
            <dd>
              {metadata.isIllustrative
                ? t('dataReadiness.isIllustrative.yes')
                : t('dataReadiness.isIllustrative.no')}
            </dd>
          </div>
          <div>
            <dt>{t('dataReadiness.schemaVersion')}</dt>
            <dd>{metadata.schemaVersion ?? t('dataReadiness.notAvailable')}</dd>
          </div>
          <div>
            <dt>{t('dataReadiness.bundleVersion')}</dt>
            <dd>{metadata.bundleVersion ?? t('dataReadiness.notAvailable')}</dd>
          </div>
          <div>
            <dt>{t('dataReadiness.asOf')}</dt>
            <dd>
              {metadata.asOf
                ? formatDateTime(metadata.asOf, locale)
                : t('dataReadiness.notAvailable')}
            </dd>
          </div>
          <div>
            <dt>{t('dataReadiness.generatedAt')}</dt>
            <dd>
              {metadata.generatedAt
                ? formatDateTime(metadata.generatedAt, locale)
                : t('dataReadiness.notAvailable')}
            </dd>
          </div>
          <div>
            <dt>{t('dataReadiness.datasetCount')}</dt>
            <dd>{metadata.datasetIds.length}</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="data-readiness-counts-heading">
        <h3 id="data-readiness-counts-heading">{t('dataReadiness.countsHeading')}</h3>
        <dl className="data-readiness__grid">
          <div>
            <dt>{t('dataReadiness.count.projects')}</dt>
            <dd>{model.counts.projects}</dd>
          </div>
          <div>
            <dt>{t('dataReadiness.count.workPackages')}</dt>
            <dd>{model.counts.workPackages}</dd>
          </div>
          <div>
            <dt>{t('dataReadiness.count.milestones')}</dt>
            <dd>{model.counts.milestones}</dd>
          </div>
          <div>
            <dt>{t('dataReadiness.count.issues')}</dt>
            <dd>{model.counts.issues}</dd>
          </div>
          <div>
            <dt>{t('dataReadiness.count.progressSnapshots')}</dt>
            <dd>{model.counts.progressSnapshots}</dd>
          </div>
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

      <IssueList
        issues={model.dataQualityIssues}
        headingKey="dataReadiness.qualityHeading"
        emptyKey="dataReadiness.qualityEmpty"
        idSuffix="quality"
        onOpenProject={onOpenProject}
      />
      <IssueList
        issues={model.businessAlerts}
        headingKey="dataReadiness.businessHeading"
        emptyKey="dataReadiness.businessEmpty"
        idSuffix="business"
        onOpenProject={onOpenProject}
      />
    </section>
  );
}
