import { useRef, useState } from 'react';
import sourceHealth from '../../assets/data/data-refresh-source-health.json';
import { useTranslation } from '../../i18n/useTranslation';
import { formatDateTime, formatNumber } from '../../i18n/formatters';

const STALE_MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Minimal "Data Sources" panel for the public-data refresh pipeline foundation (docs/adr/
 * 0004-public-data-ingestion.md, docs/public-data-refresh.md). Reads a small bundled JSON snapshot
 * of the pipeline's last run — never fetches anything itself in the browser. Distinct from
 * `DataProvenancePanel` (the existing, larger "Nguồn dữ liệu" dialog for the bundled ward/energy/
 * heatmap datasets) — this one is specifically about the automated refresh pipeline's sources.
 *
 * Non-modal by design (a simple toggled disclosure, not a focus-trapped dialog like
 * `DataProvenancePanel`/`ProjectSummaryPanel`) — kept intentionally small for this foundation PR.
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
          const daysSinceRefresh =
            (now - new Date(source.lastSuccessfulRefreshAt).getTime()) / STALE_MS_PER_DAY;
          const isStale = daysSinceRefresh > source.staleAfterDays;
          return (
            <li key={source.datasetId} className="data-sources-panel__item">
              <p className="data-sources-panel__publisher">{source.publisher}</p>
              <dl>
                <div>
                  <dt>{t('dataSources.recordCount')}</dt>
                  <dd>{formatNumber(source.recordCount, locale)}</dd>
                </div>
                <div>
                  <dt>{t('dataSources.lastRefresh')}</dt>
                  <dd>{formatDateTime(source.lastSuccessfulRefreshAt, locale)}</dd>
                </div>
                <div>
                  <dt>{t('dataSources.publishedVersion')}</dt>
                  <dd>{source.publishedVersion}</dd>
                </div>
                <div>
                  <dt>{t('dataSources.riskLabel')}</dt>
                  <dd>
                    {source.riskLevel === 'low-risk'
                      ? t('dataSources.riskLowRisk')
                      : t('dataSources.riskHardStop')}
                  </dd>
                </div>
              </dl>
              {isStale && (
                <p role="status" className="data-sources-panel__stale-warning">
                  {t('dataSources.staleWarning', { days: Math.floor(daysSinceRefresh) })}
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
