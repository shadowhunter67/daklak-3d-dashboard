import { useEffect, useMemo, useState } from 'react';
import { defaultProjectPortfolioSource } from '../../app/createProjectPortfolioSource';
import { useProjectPortfolio } from '../project-portfolio/data/useProjectPortfolio';
import labels from '#province-assets/daklak-labels.json';
import { buildReportSummary } from './reportModel';
import { useTranslation } from '../../i18n/useTranslation';
const areaName = (code: string) => (labels as Record<string, { name: string }>)[code]?.name ?? code;

export function ReportsView({ onBackToOverview }: { onBackToOverview: () => void }) {
  const { t } = useTranslation();
  const state = useProjectPortfolio(defaultProjectPortfolioSource);
  const [sector, setSector] = useState('');
  const [status, setStatus] = useState('');
  const [area, setArea] = useState('');
  const bundles = useMemo(
    () => (state.status === 'ok' || state.status === 'degraded' ? state.bundles : []),
    [state],
  );
  const filtered = useMemo(
    () =>
      bundles.filter(
        ({ project }) =>
          (!sector || project.sector === sector) &&
          (!status || project.status === status) &&
          (!area || project.administrativeAreaCodes.includes(area)),
      ),
    [bundles, sector, status, area],
  );
  const summary = useMemo(() => buildReportSummary(filtered), [filtered]);
  useEffect(() => {
    if (state.status !== 'loading') document.getElementById('reports-heading')?.focus();
  }, [state.status]);
  if (state.status === 'loading')
    return (
      <section className="project-portfolio reports-view" aria-busy="true">
        <p>{t('portfolio.loading')}</p>
      </section>
    );
  if (state.status === 'error')
    return (
      <section className="project-portfolio reports-view" role="alert">
        <h2>{t('reports.title')}</h2>
        <p>{state.error.message}</p>
      </section>
    );
  const maxSector = Math.max(...summary.bySector.map((x) => x.count), 1);
  return (
    <section
      id="reports"
      className="project-portfolio reports-view"
      aria-labelledby="reports-heading"
      tabIndex={-1}
    >
      <button type="button" className="project-portfolio__back" onClick={onBackToOverview}>
        {t('reports.backToOverview')}
      </button>
      <h2 id="reports-heading" tabIndex={-1}>
        {t('reports.title')}
      </h2>
      <p>{t('reports.description')}</p>
      <p className="project-portfolio__mock-badge" role="note">
        {t('reports.sourceBadge')}
      </p>
      <div className="reports-filters">
        <label>
          {t('portfolio.sectorLabel')}
          <select value={sector} onChange={(e) => setSector(e.target.value)}>
            <option value="">{t('portfolio.sectorAll')}</option>
            {summary.bySector.map((x) => (
              <option key={x.sector} value={x.sector}>
                {t(`sector.${x.sector}` as never)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t('portfolio.statusLabel')}
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">{t('portfolio.statusAll')}</option>
            {summary.byStatus.map((x) => (
              <option key={x.status} value={x.status}>
                {t(`status.${x.status}` as never)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t('portfolio.areaLabel')}
          <select value={area} onChange={(e) => setArea(e.target.value)}>
            <option value="">{t('portfolio.areaAll')}</option>
            {summary.byArea.map((x) => (
              <option key={x.area} value={x.area}>
                {areaName(x.area)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="reports-kpis">
        {[
          [t('reports.total'), summary.total],
          [
            t('reports.disbursement'),
            summary.disbursementRate == null ? '—' : `${summary.disbursementRate.toFixed(1)}%`,
          ],
          [t('reports.delayed'), summary.delayed],
          [t('reports.completed'), summary.completed],
          [t('reports.warnings'), summary.dataWarnings],
        ].map(([label, value]) => (
          <article key={String(label)}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      <div className="reports-grid">
        <section className="portfolio-panel">
          <h3>{t('reports.statusStructure')}</h3>
          {summary.byStatus.map((x) => (
            <div className="reports-bar" key={x.status}>
              <span>{t(`status.${x.status}` as never)}</span>
              <b>{x.count}</b>
              <i style={{ width: `${(x.count / Math.max(summary.total, 1)) * 100}%` }} />
            </div>
          ))}
        </section>
        <section className="portfolio-panel">
          <h3>{t('reports.sectors')}</h3>
          {summary.bySector.map((x) => (
            <div className="reports-bar" key={x.sector}>
              <span>{t(`sector.${x.sector}` as never)}</span>
              <b>{x.count}</b>
              <i style={{ width: `${(x.count / maxSector) * 100}%` }} />
            </div>
          ))}
        </section>
        <section className="portfolio-panel">
          <h3>{t('reports.areas')}</h3>
          <ol>
            {summary.byArea.slice(0, 8).map((x) => (
              <li key={x.area}>
                {areaName(x.area)}
                <b>{x.count}</b>
              </li>
            ))}
          </ol>
        </section>
        <section className="portfolio-panel">
          <h3>{t('reports.attention')}</h3>
          <ul>
            {summary.attention.map((x) => (
              <li key={x.id}>
                <strong>{x.name}</strong>
                <span>
                  {t(`status.${x.status}` as never)} · {areaName(x.area)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </section>
  );
}
