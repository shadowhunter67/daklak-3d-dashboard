import { useRef, useState } from 'react';
import sourceHealth from '../../assets/data/data-refresh-source-health.json';
import { useTranslation } from '../../i18n/useTranslation';
import type { MessageKey } from '../../i18n/messages';
import { formatDateTime, formatNumber } from '../../i18n/formatters';

const STALE_MS_PER_DAY = 24 * 60 * 60 * 1000;

const MATURITY_LABEL_KEYS: Record<string, MessageKey> = {
  experimental: 'dataSources.maturity.experimental',
  'review-required': 'dataSources.maturity.reviewRequired',
  observed: 'dataSources.maturity.observed',
  'auto-merge-eligible': 'dataSources.maturity.autoMergeEligible',
};

/**
 * "Data Sources" panel for the public-data refresh pipeline (docs/adr/0004-public-data-ingestion.md,
 * docs/public-data-refresh.md). Reads only the generated, pipeline-produced snapshot
 * (`src/assets/data/data-refresh-source-health.json`, mirrored from the canonical
 * `data/published/source-health.json` — see scripts/data-refresh/run.mjs) — never fetches
 * anything itself in the browser, and nobody hand-edits that JSON. Distinct from
 * `DataProvenancePanel` (the existing "Nguồn dữ liệu" dialog for the bundled ward/energy/heatmap
 * datasets) — this one is specifically about the automated refresh pipeline's sources.
 *
 * Non-modal by design (a simple toggled disclosure, not a focus-trapped dialog like
 * `DataProvenancePanel`/`ProjectSummaryPanel`).
 */
export function DataSourcesPanel({ onClose }: { onClose: () => void }) {
  const { t, locale } = useTranslation();
  const panelRef = useRef<HTMLDivElement | null>(null);
  // Computed once at mount via useState's lazy initializer (not on every render) — a staleness
  // check for a manually-opened panel doesn't need to tick live, and calling Date.now() directly
  // during render is an impure-render lint error.
  const [now] = useState(() => Date.now());

  return (
    <section
      ref={panelRef}
      className="data-sources-panel"
      role="region"
      aria-labelledby="data-sources-panel-heading"
    >
      <div className="data-sources-panel__header">
        <h2 id="data-sources-panel-heading">{t('dataSources.heading')}</h2>
        <button type="button" onClick={onClose} aria-label={t('dataSources.closeAria')}>
          {t('dataSources.close')}
        </button>
      </div>
      <ul className="data-sources-panel__list">
        {sourceHealth.sources.map((source) => {
          const daysSincePublish = source.lastPublishedAt
            ? (now - new Date(source.lastPublishedAt).getTime()) / STALE_MS_PER_DAY
            : null;
          const isStale = daysSincePublish !== null && daysSincePublish > source.staleAfterDays;
          const isNeverPublished = source.lastPublishedAt === null;
          const maturityKey =
            MATURITY_LABEL_KEYS[source.maturity] ?? 'dataSources.maturity.experimental';

          return (
            <li key={source.datasetId} className="data-sources-panel__item">
              <p className="data-sources-panel__publisher">{source.publisher}</p>
              <p className="data-sources-panel__maturity">{t(maturityKey)}</p>
              {source.isRecordedFixture && (
                <p className="data-sources-panel__fixture-notice" role="status">
                  {t('dataSources.fixtureNotice')}
                </p>
              )}
              <dl>
                <div>
                  <dt>{t('dataSources.recordCount')}</dt>
                  <dd>
                    {source.recordCount === null ? '—' : formatNumber(source.recordCount, locale)}
                  </dd>
                </div>
                <div>
                  <dt>{t('dataSources.lastRefresh')}</dt>
                  <dd>
                    {source.lastPublishedAt
                      ? formatDateTime(source.lastPublishedAt, locale)
                      : t('dataSources.neverPublished')}
                  </dd>
                </div>
                <div>
                  <dt>{t('dataSources.scheduleLabel')}</dt>
                  <dd>{t('dataSources.scheduleValue')}</dd>
                </div>
                <div>
                  <dt>{t('dataSources.riskLabel')}</dt>
                  <dd>
                    {source.status === 'low-risk'
                      ? t('dataSources.riskLowRisk')
                      : source.status === 'hard-stop'
                        ? t('dataSources.riskHardStop')
                        : t('dataSources.riskNotYetRun')}
                  </dd>
                </div>
              </dl>
              {isStale && (
                <p role="status" className="data-sources-panel__stale-warning">
                  {t('dataSources.staleWarning', { days: Math.floor(daysSincePublish ?? 0) })}
                </p>
              )}
              {isNeverPublished && (
                <p role="status" className="data-sources-panel__stale-warning">
                  {t('dataSources.neverPublishedWarning')}
                </p>
              )}
              <p className="data-sources-panel__attribution">{source.attribution}</p>
            </li>
          );
        })}
      </ul>
      <p className="data-sources-panel__footer-note">{t('dataSources.footerNote')}</p>
    </section>
  );
}
