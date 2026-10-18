import { useEffect, useMemo, useRef, useState } from 'react';
import labels from '#province-assets/daklak-labels.json';
import { defaultProjectPortfolioSource } from '../../app/createProjectPortfolioSource';
import type { ProjectPortfolioSource } from '../../entities/project/adapters/ProjectPortfolioSource';
import type { ProjectStatus } from '../../entities/project/types';
import { useTranslation } from '../../i18n/useTranslation';
import type { MessageKey } from '../../i18n/messages';
import { formatKpiValueLocalized } from '../executive-overview/model/executiveOverviewSelectors';
import { useProjectPortfolio } from './data/useProjectPortfolio';
import { buildProjectPortfolioCsv } from './model/exportProjectPortfolioCsv';
import {
  filterProjectPortfolioRows,
  sortProjectPortfolioRows,
} from './model/filterSortProjectPortfolio';
import type { ProjectPortfolioRow } from './model/projectPortfolioTypes';
import type { PortfolioFilters, PortfolioSortKey } from '../../routing/hashRoute';
import { serializePortfolioHash } from '../../routing/hashRoute';
import {
  AlertIcon,
  ChartIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentIcon,
  FolderIcon,
  SearchIcon,
  TargetIcon,
} from '../../components/layout/icons';
import {
  Card,
  DataTable,
  KpiTile,
  PageHeader,
  PanelHeader,
  ProgressBar,
  SegmentedControl,
  SelectField,
  SearchField,
  StatusChip,
} from '../../components/ui';

const SORT_KEYS: PortfolioSortKey[] = [
  'attention-first',
  'name-asc',
  'disbursement-desc',
  'progress-asc',
  'freshness-desc',
];
const labelMap = labels as Record<string, { name: string }>;
const VIEW_MODE_KEY = 'daklak-dashboard:project-portfolio-view-mode';

function areaName(code: string): string {
  return labelMap[code]?.name ?? code;
}

function statusTone(
  status: ProjectStatus,
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

function readStoredViewMode(): 'cards' | 'table' {
  try {
    return window.localStorage.getItem(VIEW_MODE_KEY) === 'table' ? 'table' : 'cards';
  } catch {
    return 'cards';
  }
}

function ProjectCard({ row, onOpen }: { row: ProjectPortfolioRow; onOpen: () => void }) {
  const { t, locale } = useTranslation();
  const disbursement = formatKpiValueLocalized(row.disbursementRate, locale, t);
  const freshness = formatKpiValueLocalized(row.dataFreshnessDays, locale, t);
  return (
    <li>
      <Card className="project-portfolio-card">
        <div className="project-portfolio-card__heading">
          <div>
            <button
              type="button"
              className="project-portfolio-card__title project-portfolio__row-link"
              onClick={onOpen}
            >
              {row.name} <span className="project-portfolio__code">({row.code})</span>
            </button>
            <p className="project-portfolio-card__sector">
              <FolderIcon /> {t(`sector.${row.sector}` as MessageKey)}
            </p>
          </div>
          <StatusChip
            label={t(`status.${row.status}` as MessageKey)}
            tone={statusTone(row.status)}
            dot
          />
        </div>
        <div className="project-portfolio-card__progress">
          <div className="project-portfolio-card__metric-line">
            <span>{t('portfolio.col.progress')}</span>
            <strong>{row.overallProgress}%</strong>
          </div>
          <ProgressBar
            value={row.overallProgress}
            tone={progressTone(row.status)}
            label={t('priorityProjects.progress', { value: row.overallProgress })}
            valueText={t('portfolio.plannedProgress', { value: row.plannedProgress })}
          />
        </div>
        <dl className="project-portfolio-card__grid">
          <div>
            <dt>{t('portfolio.col.disbursement')}</dt>
            <dd>{disbursement.text}</dd>
          </div>
          <div>
            <dt>{t('portfolio.col.area')}</dt>
            <dd>
              {row.administrativeAreaCodes.map(areaName).join(', ') || t('portfolio.notDetermined')}
            </dd>
          </div>
          <div>
            <dt>{t('portfolio.col.freshness')}</dt>
            <dd>{t('portfolio.updatedDaysAgo', { value: freshness.text })}</dd>
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
        <button type="button" className="project-portfolio-card__open" onClick={onOpen}>
          {t('portfolio.viewDetail')}
        </button>
      </Card>
    </li>
  );
}

function buildStatusGroups(
  options: readonly { value: string; count: number }[],
  t: (key: MessageKey, vars?: Record<string, string | number>) => string,
) {
  const count = (...statuses: string[]) =>
    statuses.reduce(
      (total, status) => total + (options.find((item) => item.value === status)?.count ?? 0),
      0,
    );
  return [
    {
      key: 'portfolio.statusGroup.inProgress',
      value: count('proposed', 'preparing', 'approved', 'procurement', 'active'),
      tone: 'blue' as const,
      icon: TargetIcon,
    },
    {
      key: 'portfolio.statusGroup.attention',
      value: count('at-risk', 'delayed'),
      tone: 'red' as const,
      icon: AlertIcon,
    },
    {
      key: 'portfolio.statusGroup.suspended',
      value: count('suspended'),
      tone: 'gold' as const,
      icon: ClockIcon,
    },
    {
      key: 'portfolio.statusGroup.completed',
      value: count('completed'),
      tone: 'green' as const,
      icon: CheckCircleIcon,
    },
    {
      key: 'portfolio.statusGroup.other',
      value: count('cancelled', 'unknown'),
      tone: 'orange' as const,
      icon: FolderIcon,
    },
  ].map((item) => ({ ...item, label: t(item.key as MessageKey) }));
}

export function ProjectPortfolioView({
  source,
  filters,
  onFiltersChange,
  onOpenProject,
  onOpenInvestmentCatalog,
  onBackToOverview,
}: {
  source?: ProjectPortfolioSource;
  filters: PortfolioFilters;
  onFiltersChange: (filters: PortfolioFilters, opts?: { replace?: boolean }) => void;
  onOpenProject: (projectId: string) => void;
  /** Mở danh mục thu hút đầu tư (dữ liệu nguồn chính thức, tách khỏi danh mục minh hoạ). */
  onOpenInvestmentCatalog?: () => void;
  onBackToOverview: () => void;
}) {
  const { t, locale } = useTranslation();
  const [retryToken, setRetryToken] = useState(0);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>(readStoredViewMode);
  const effectiveSource = useMemo(() => source ?? defaultProjectPortfolioSource, [source]);
  const state = useProjectPortfolio(effectiveSource, retryToken);
  const [searchInput, setSearchInput] = useState(filters.query ?? '');
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearchInput(filters.query ?? '');
  }, [filters.query]);
  useEffect(() => {
    const handle = window.setTimeout(() => {
      if ((filters.query ?? '') !== searchInput.trim())
        onFiltersChange({ ...filters, query: searchInput.trim() || undefined }, { replace: true });
    }, 350);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);
  useEffect(() => {
    try {
      window.localStorage.setItem(VIEW_MODE_KEY, viewMode);
    } catch {
      /* optional preference */
    }
  }, [viewMode]);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const sorted = useMemo(() => {
    if (state.status !== 'ok' && state.status !== 'degraded') return [];
    return sortProjectPortfolioRows(
      filterProjectPortfolioRows(state.model.rows, filters),
      filters.sort ?? 'attention-first',
    );
  }, [state, filters]);

  const handleExportCsv = () => {
    const csv = buildProjectPortfolioCsv(sorted, t);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `danh-muc-du-an-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (state.status === 'loading')
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
  if (state.status === 'error')
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

  const { model } = state;
  const hasActiveFilters = Boolean(
    filters.status || filters.sector || filters.area || filters.query,
  );
  const statusGroups = buildStatusGroups(model.filterOptions.status, t);
  const attentionRows = model.rows.filter((row) => row.reasonCategory).slice(0, 4);
  const sectorCards = [...model.filterOptions.sector].sort((a, b) => b.count - a.count).slice(0, 5);
  const clearFilters = () => {
    setSearchInput('');
    onFiltersChange({});
  };

  return (
    <section
      id="project-portfolio"
      className="project-portfolio ui-page-root"
      aria-labelledby="project-portfolio-heading"
      tabIndex={-1}
    >
      <PageHeader
        headingId="project-portfolio-heading"
        headingRef={headingRef}
        title={t('portfolio.heading')}
        description={t(
          model.isIllustrative ? 'portfolio.description' : 'portfolio.descriptionReal',
        )}
        badge={model.isIllustrative ? t('portfolio.illustrativeBadge') : undefined}
        badgeClassName="project-portfolio__mock-badge"
        breadcrumb={
          <>
            <span>{t('common.home')}</span>
            <strong>{t('common.projects')}</strong>
          </>
        }
        breadcrumbLabel={t('common.breadcrumb')}
        actions={
          <>
            {onOpenInvestmentCatalog && (
              <button
                type="button"
                className="project-portfolio__back"
                onClick={onOpenInvestmentCatalog}
              >
                {t('catalog.openFromPortfolio')}
              </button>
            )}
            <button type="button" className="project-portfolio__back" onClick={onBackToOverview}>
              {t('portfolio.backToOverview')}
            </button>
          </>
        }
      />
      <ul className="ui-kpi-grid project-portfolio__kpis" aria-label={t('portfolio.kpiLabel')}>
        <KpiTile
          label={t('portfolio.totalProjects')}
          value={model.totalCount}
          tone="blue"
          icon={<DocumentIcon />}
        />
        {statusGroups.map((item) => (
          <KpiTile
            key={item.key}
            label={item.label}
            value={item.value}
            tone={item.tone}
            icon={<item.icon />}
          />
        ))}
      </ul>
      {state.status === 'degraded' && (
        <p role="alert" className="project-portfolio__degraded-banner">
          {t('portfolio.degradedBanner', { issues: state.sourceIssues.join('; ') })}
        </p>
      )}

      <div className="portfolio-layout project-portfolio__layout">
        <div className="portfolio-main">
          <Card className="project-portfolio__filter-card">
            <PanelHeader
              title={t('portfolio.filtersHeading')}
              icon={<SearchIcon />}
              headingId="project-portfolio-filters-heading"
            />
            <form
              className="project-portfolio__filters"
              role="search"
              aria-labelledby="project-portfolio-filters-heading"
              onSubmit={(event) => event.preventDefault()}
            >
              <SearchField
                id="project-portfolio-search"
                label={t('portfolio.searchLabel')}
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder={t('portfolio.searchPlaceholder')}
              />
              <SelectField
                id="project-portfolio-status"
                label={t('portfolio.statusLabel')}
                value={filters.status ?? ''}
                onChange={(event) =>
                  onFiltersChange({ ...filters, status: event.target.value || undefined })
                }
                options={[
                  { value: '', label: t('portfolio.statusAll') },
                  ...model.filterOptions.status.map((option) => ({
                    value: option.value,
                    label: `${t(`status.${option.value}` as MessageKey)} (${option.count})`,
                  })),
                ]}
              />
              <SelectField
                id="project-portfolio-sector"
                label={t('portfolio.sectorLabel')}
                value={filters.sector ?? ''}
                onChange={(event) =>
                  onFiltersChange({ ...filters, sector: event.target.value || undefined })
                }
                options={[
                  { value: '', label: t('portfolio.sectorAll') },
                  ...model.filterOptions.sector.map((option) => ({
                    value: option.value,
                    label: `${t(`sector.${option.value}` as MessageKey)} (${option.count})`,
                  })),
                ]}
              />
              <SelectField
                id="project-portfolio-area"
                label={t('portfolio.areaLabel')}
                value={filters.area ?? ''}
                onChange={(event) =>
                  onFiltersChange({ ...filters, area: event.target.value || undefined })
                }
                options={[
                  { value: '', label: t('portfolio.areaAll') },
                  ...model.filterOptions.area.map((option) => ({
                    value: option.value,
                    label: `${areaName(option.value)} (${option.count})`,
                  })),
                ]}
              />
              <SelectField
                id="project-portfolio-sort"
                label={t('portfolio.sortLabel')}
                value={filters.sort ?? 'attention-first'}
                onChange={(event) =>
                  onFiltersChange({ ...filters, sort: event.target.value as PortfolioSortKey })
                }
                options={SORT_KEYS.map((key) => ({
                  value: key,
                  label: t(`portfolio.sort.${key}` as MessageKey),
                }))}
              />
              <button
                type="button"
                className="project-portfolio__clear-filters"
                disabled={!hasActiveFilters}
                onClick={clearFilters}
              >
                {t('portfolio.clearFilters')}
              </button>
            </form>
          </Card>

          <div className="project-portfolio__result-bar">
            <p aria-live="polite" aria-atomic="true" className="project-portfolio__result-count">
              {t('portfolio.resultCount', { shown: sorted.length, total: model.totalCount })}
            </p>
            <div className="project-portfolio__view-actions">
              <SegmentedControl
                label={t('portfolio.viewMode')}
                value={viewMode}
                onChange={(value) => setViewMode(value as 'cards' | 'table')}
                options={[
                  { value: 'cards', label: t('portfolio.viewCards') },
                  { value: 'table', label: t('portfolio.viewTable') },
                ]}
              />
              <button
                type="button"
                className="project-portfolio__export-csv"
                onClick={handleExportCsv}
                disabled={sorted.length === 0}
                title={t('portfolio.exportCsvHint', { count: sorted.length })}
              >
                {t('portfolio.exportCsv')}
              </button>
            </div>
          </div>
          {sorted.length === 0 ? (
            <p className="project-portfolio__empty">
              {t('portfolio.empty')}{' '}
              {hasActiveFilters && (
                <button
                  type="button"
                  className="project-portfolio__clear-filters-inline"
                  onClick={clearFilters}
                >
                  {t('portfolio.clearFilters')}
                </button>
              )}
            </p>
          ) : (
            <>
              <div
                className="project-portfolio-table-wrap"
                hidden={viewMode !== 'table'}
                role="region"
                aria-label={t('portfolio.tableLabel')}
              >
                <DataTable
                  caption={t('portfolio.tableCaption')}
                  rows={sorted}
                  getRowKey={(row) => row.projectId}
                  columns={[
                    {
                      key: 'project',
                      header: t('portfolio.col.project'),
                      render: (row) => (
                        <button
                          type="button"
                          className="project-portfolio__row-link"
                          onClick={() => onOpenProject(row.projectId)}
                        >
                          {row.name} <span className="project-portfolio__code">({row.code})</span>
                        </button>
                      ),
                    },
                    {
                      key: 'sector',
                      header: t('portfolio.col.sector'),
                      render: (row) => t(`sector.${row.sector}` as MessageKey),
                    },
                    {
                      key: 'status',
                      header: t('portfolio.col.status'),
                      render: (row) => (
                        <StatusChip
                          label={t(`status.${row.status}` as MessageKey)}
                          tone={statusTone(row.status)}
                          dot
                        />
                      ),
                    },
                    {
                      key: 'progress',
                      header: t('portfolio.col.progress'),
                      render: (row) => (
                        <ProgressBar
                          value={row.overallProgress}
                          tone={progressTone(row.status)}
                          label={t('priorityProjects.progress', { value: row.overallProgress })}
                        />
                      ),
                    },
                    {
                      key: 'disbursement',
                      header: t('portfolio.col.disbursement'),
                      render: (row) =>
                        formatKpiValueLocalized(row.disbursementRate, locale, t).text,
                    },
                    {
                      key: 'area',
                      header: t('portfolio.col.area'),
                      render: (row) => row.administrativeAreaCodes.map(areaName).join(', '),
                    },
                    {
                      key: 'reason',
                      header: t('portfolio.col.reason'),
                      render: (row) =>
                        row.reasonCategory
                          ? t(`reason.${row.reasonCategory}` as MessageKey)
                          : t('portfolio.reasonNone'),
                    },
                    {
                      key: 'action',
                      header: t('portfolio.col.action'),
                      render: (row) => (
                        <button
                          type="button"
                          className="project-portfolio__table-action"
                          onClick={() => onOpenProject(row.projectId)}
                        >
                          {t('portfolio.viewDetail')}
                        </button>
                      ),
                    },
                  ]}
                />
              </div>
              <ul className="project-portfolio-cards" hidden={viewMode !== 'cards'}>
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
        </div>
        <aside className="portfolio-aside" aria-label={t('portfolio.asideLabel')}>
          <Card className="portfolio-panel">
            <PanelHeader
              title={t('portfolio.todayHeading')}
              icon={<AlertIcon />}
              headingId="portfolio-today-heading"
            />
            {attentionRows.length === 0 ? (
              <p>{t('portfolio.reasonNone')}</p>
            ) : (
              <ul className="portfolio-attention-list">
                {attentionRows.map((row) => (
                  <li key={row.projectId}>
                    <strong>{row.name}</strong>
                    <span>
                      {row.reasonCategory ? t(`reason.${row.reasonCategory}` as MessageKey) : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card className="portfolio-panel">
            <PanelHeader
              title={t('portfolio.quickInfoHeading')}
              icon={<ChartIcon />}
              headingId="portfolio-quick-heading"
            />
            <dl className="portfolio-quick-list">
              <div>
                <dt>{t('portfolio.totalProjects')}</dt>
                <dd>{model.totalCount}</dd>
              </div>
              {statusGroups.map((item) => (
                <div key={item.key}>
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Card className="portfolio-panel">
            <PanelHeader
              title={t('portfolio.topSectorsHeading')}
              icon={<FolderIcon />}
              headingId="portfolio-sector-heading"
            />
            <ul className="portfolio-sector-list">
              {sectorCards.map((card) => (
                <li key={card.value}>
                  <span>{t(`sector.${card.value}` as MessageKey)}</span>
                  <ProgressBar
                    value={(card.count / Math.max(1, sectorCards[0]?.count ?? 1)) * 100}
                    tone="gold"
                    valueText={String(card.count)}
                  />
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>
    </section>
  );
}
