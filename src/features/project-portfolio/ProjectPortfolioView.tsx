import { useEffect, useMemo, useRef, useState } from 'react';
import { BundledProjectPortfolioSource } from '../../data/projectPortfolioSource';
import type { ProjectPortfolioSource } from '../../entities/project/adapters/ProjectPortfolioSource';
import { useTranslation } from '../../i18n/useTranslation';
import type { MessageKey } from '../../i18n/messages';
import { formatDate } from '../../i18n/formatters';
import { formatKpiValueLocalized } from '../executive-overview/model/executiveOverviewSelectors';
import { useProjectPortfolio } from './data/useProjectPortfolio';
import {
  filterProjectPortfolioRows,
  sortProjectPortfolioRows,
} from './model/filterSortProjectPortfolio';
import type { ProjectPortfolioRow } from './model/projectPortfolioTypes';
import type { PortfolioFilters, PortfolioSortKey } from '../../routing/hashRoute';
import { serializePortfolioHash } from '../../routing/hashRoute';

const SORT_KEYS: PortfolioSortKey[] = [
  'attention-first',
  'name-asc',
  'disbursement-desc',
  'progress-asc',
  'freshness-desc',
];

function ProjectRow({ row, onOpen }: { row: ProjectPortfolioRow; onOpen: () => void }) {
  const { t, locale } = useTranslation();
  const disbursement = formatKpiValueLocalized(row.disbursementRate, locale, t);
  const freshness = formatKpiValueLocalized(row.dataFreshnessDays, locale, t);
  return (
    <>
      <td>
        <button type="button" className="project-portfolio__row-link" onClick={onOpen}>
          {row.name} <span className="project-portfolio__code">({row.code})</span>
        </button>
      </td>
      <td>{t(`sector.${row.sector}` as MessageKey)}</td>
      <td>{t(`status.${row.status}` as MessageKey)}</td>
      <td>
        {row.overallProgress}% <span aria-hidden="true">/</span>{' '}
        {t('portfolio.plannedProgress', { value: row.plannedProgress })}
      </td>
      <td>{disbursement.text}</td>
      <td>
        {row.plannedCompletionDate
          ? formatDate(row.plannedCompletionDate, locale)
          : t('portfolio.notDetermined')}
      </td>
      <td>{freshness.text}</td>
      <td>
        {row.reasonCategory
          ? t(`reason.${row.reasonCategory}` as MessageKey)
          : t('portfolio.reasonNone')}
      </td>
    </>
  );
}

function ProjectCard({ row, onOpen }: { row: ProjectPortfolioRow; onOpen: () => void }) {
  const { t, locale } = useTranslation();
  const disbursement = formatKpiValueLocalized(row.disbursementRate, locale, t);
  const freshness = formatKpiValueLocalized(row.dataFreshnessDays, locale, t);
  return (
    <li className="project-portfolio-card">
      <button type="button" className="project-portfolio-card__title" onClick={onOpen}>
        {row.name} <span className="project-portfolio__code">({row.code})</span>
      </button>
      <dl className="project-portfolio-card__grid">
        <div>
          <dt>{t('portfolio.col.sector')}</dt>
          <dd>{t(`sector.${row.sector}` as MessageKey)}</dd>
        </div>
        <div>
          <dt>{t('portfolio.col.status')}</dt>
          <dd>{t(`status.${row.status}` as MessageKey)}</dd>
        </div>
        <div>
          <dt>{t('portfolio.col.progress')}</dt>
          <dd>
            {row.overallProgress}% ({t('portfolio.plannedProgress', { value: row.plannedProgress })}
            )
          </dd>
        </div>
        <div>
          <dt>{t('portfolio.col.disbursement')}</dt>
          <dd>{disbursement.text}</dd>
        </div>
        <div>
          <dt>{t('portfolio.col.plannedCompletion')}</dt>
          <dd>
            {row.plannedCompletionDate
              ? formatDate(row.plannedCompletionDate, locale)
              : t('portfolio.notDetermined')}
          </dd>
        </div>
        <div>
          <dt>{t('portfolio.col.freshness')}</dt>
          <dd>{freshness.text}</dd>
        </div>
        <div>
          <dt>{t('portfolio.col.reason')}</dt>
          <dd>
            {row.reasonCategory
              ? t(`reason.${row.reasonCategory}` as MessageKey)
              : t('portfolio.reasonNone')}
          </dd>
        </div>
      </dl>
    </li>
  );
}

export function ProjectPortfolioView({
  source,
  filters,
  onFiltersChange,
  onOpenProject,
  onBackToOverview,
}: {
  source?: ProjectPortfolioSource;
  filters: PortfolioFilters;
  onFiltersChange: (filters: PortfolioFilters, opts?: { replace?: boolean }) => void;
  onOpenProject: (projectId: string) => void;
  onBackToOverview: () => void;
}) {
  const { t } = useTranslation();
  const [retryToken, setRetryToken] = useState(0);
  const effectiveSource = useMemo(() => source ?? new BundledProjectPortfolioSource(), [source]);
  const state = useProjectPortfolio(effectiveSource, retryToken);

  // Search box keeps its own instant local value; `filters.query` (and therefore `sorted.length`
  // below, and the live region that announces it) only settles after the user pauses typing —
  // this is what keeps the live region from announcing on every keystroke (spec D7), without a
  // second, redundant debounce layer just for the announcement itself.
  const [searchInput, setSearchInput] = useState(filters.query ?? '');
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    // Keeps the search box in sync with external URL changes (Back/Forward, a shared link with
    // `q=` already set) — deliberate, same pattern as `useExecutiveOverview`'s loading reset.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearchInput(filters.query ?? '');
  }, [filters.query]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      if ((filters.query ?? '') === searchInput.trim()) return;
      onFiltersChange({ ...filters, query: searchInput.trim() || undefined }, { replace: true });
    }, 350);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const sorted = useMemo(() => {
    if (state.status !== 'ok' && state.status !== 'degraded') return [];
    const filtered = filterProjectPortfolioRows(state.model.rows, filters);
    return sortProjectPortfolioRows(filtered, filters.sort ?? 'attention-first');
  }, [state, filters]);

  if (state.status === 'loading') {
    return (
      <section
        id="project-portfolio"
        className="project-portfolio"
        aria-live="polite"
        aria-busy="true"
        tabIndex={-1}
      >
        <span className="map-loading__spinner" aria-hidden="true" />
        <p>{t('portfolio.loading')}</p>
      </section>
    );
  }

  if (state.status === 'error') {
    return (
      <section id="project-portfolio" className="project-portfolio" tabIndex={-1}>
        <div className="project-portfolio__error" role="alert">
          <h2>{t('portfolio.loadErrorHeading')}</h2>
          <p>{t(`errorKind.${state.error.kind}` as MessageKey)}</p>
          <p className="project-portfolio__error-detail">{state.error.message}</p>
          <button type="button" onClick={() => setRetryToken((n) => n + 1)}>
            {t('portfolio.retry')}
          </button>
          <button type="button" onClick={onBackToOverview}>
            {t('portfolio.backToOverview')}
          </button>
        </div>
      </section>
    );
  }

  const { model } = state;
  const hasActiveFilters = Boolean(
    filters.status || filters.sector || filters.area || filters.query,
  );

  return (
    <section
      id="project-portfolio"
      className="project-portfolio"
      aria-labelledby="project-portfolio-heading"
      tabIndex={-1}
    >
      <button type="button" className="project-portfolio__back" onClick={onBackToOverview}>
        {t('portfolio.backToOverview')}
      </button>
      <h2 id="project-portfolio-heading" ref={headingRef} tabIndex={-1}>
        {t('portfolio.heading')}
      </h2>
      <p className="project-portfolio__mock-badge" role="note">
        {t('portfolio.illustrativeBadge')}
      </p>
      <p className="project-portfolio__description">{t('portfolio.description')}</p>
      {state.status === 'degraded' && (
        <p role="alert" className="project-portfolio__degraded-banner">
          {t('portfolio.degradedBanner', { issues: state.sourceIssues.join('; ') })}
        </p>
      )}

      <form
        className="project-portfolio__filters"
        role="search"
        onSubmit={(e) => e.preventDefault()}
      >
        <div className="project-portfolio__filter-field">
          <label htmlFor="project-portfolio-search">{t('portfolio.searchLabel')}</label>
          <input
            id="project-portfolio-search"
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t('portfolio.searchPlaceholder')}
          />
        </div>
        <div className="project-portfolio__filter-field">
          <label htmlFor="project-portfolio-status">{t('portfolio.statusLabel')}</label>
          <select
            id="project-portfolio-status"
            value={filters.status ?? ''}
            onChange={(e) => onFiltersChange({ ...filters, status: e.target.value || undefined })}
          >
            <option value="">{t('portfolio.statusAll')}</option>
            {model.filterOptions.status.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {t(`status.${opt.value}` as MessageKey)} ({opt.count})
              </option>
            ))}
          </select>
        </div>
        <div className="project-portfolio__filter-field">
          <label htmlFor="project-portfolio-sector">{t('portfolio.sectorLabel')}</label>
          <select
            id="project-portfolio-sector"
            value={filters.sector ?? ''}
            onChange={(e) => onFiltersChange({ ...filters, sector: e.target.value || undefined })}
          >
            <option value="">{t('portfolio.sectorAll')}</option>
            {model.filterOptions.sector.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {t(`sector.${opt.value}` as MessageKey)} ({opt.count})
              </option>
            ))}
          </select>
        </div>
        <div className="project-portfolio__filter-field">
          <label htmlFor="project-portfolio-area">{t('portfolio.areaLabel')}</label>
          <select
            id="project-portfolio-area"
            value={filters.area ?? ''}
            onChange={(e) => onFiltersChange({ ...filters, area: e.target.value || undefined })}
          >
            <option value="">{t('portfolio.areaAll')}</option>
            {model.filterOptions.area.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.value} ({opt.count})
              </option>
            ))}
          </select>
        </div>
        <div className="project-portfolio__filter-field">
          <label htmlFor="project-portfolio-sort">{t('portfolio.sortLabel')}</label>
          <select
            id="project-portfolio-sort"
            value={filters.sort ?? 'attention-first'}
            onChange={(e) =>
              onFiltersChange({ ...filters, sort: e.target.value as PortfolioSortKey })
            }
          >
            {SORT_KEYS.map((key) => (
              <option key={key} value={key}>
                {t(`portfolio.sort.${key}` as MessageKey)}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="project-portfolio__clear-filters"
          disabled={!hasActiveFilters}
          onClick={() => {
            setSearchInput('');
            onFiltersChange({});
          }}
        >
          {t('portfolio.clearFilters')}
        </button>
      </form>

      <p aria-live="polite" aria-atomic="true" className="project-portfolio__result-count">
        {t('portfolio.resultCount', { shown: sorted.length, total: model.totalCount })}
      </p>

      {sorted.length === 0 ? (
        <p className="project-portfolio__empty">
          {t('portfolio.empty')}{' '}
          {hasActiveFilters && (
            <button
              type="button"
              className="project-portfolio__clear-filters-inline"
              onClick={() => {
                setSearchInput('');
                onFiltersChange({});
              }}
            >
              {t('portfolio.clearFilters')}
            </button>
          )}
        </p>
      ) : (
        <>
          <div
            className="project-portfolio-table-wrap"
            role="region"
            aria-label={t('portfolio.tableLabel')}
          >
            <table className="project-portfolio-table">
              <caption className="visually-hidden">{t('portfolio.tableCaption')}</caption>
              <thead>
                <tr>
                  <th scope="col">{t('portfolio.col.project')}</th>
                  <th scope="col">{t('portfolio.col.sector')}</th>
                  <th scope="col">{t('portfolio.col.status')}</th>
                  <th scope="col">{t('portfolio.col.progress')}</th>
                  <th scope="col">{t('portfolio.col.disbursement')}</th>
                  <th scope="col">{t('portfolio.col.plannedCompletion')}</th>
                  <th scope="col">{t('portfolio.col.freshness')}</th>
                  <th scope="col">{t('portfolio.col.reason')}</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row) => (
                  <tr key={row.projectId}>
                    <ProjectRow row={row} onOpen={() => onOpenProject(row.projectId)} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="project-portfolio-cards">
            {sorted.map((row) => (
              <ProjectCard
                key={row.projectId}
                row={row}
                onOpen={() => onOpenProject(row.projectId)}
              />
            ))}
          </ul>
        </>
      )}
      <p className="project-portfolio__hash-hint">
        {t('portfolio.hashHint')} <code>{serializePortfolioHash(filters)}</code>
      </p>
      {/* Kept for reference/tests only — not rendered as a link, so it does not create a duplicate
          navigable element; serializeProjectDetailHash is exercised via onOpenProject instead. */}
    </section>
  );
}
