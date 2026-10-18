import { useEffect, useMemo, useState } from 'react';
import { defaultProjectPortfolioSource } from '../../app/createProjectPortfolioSource';
import { useProjectPortfolio } from '../project-portfolio/data/useProjectPortfolio';
import labels from '#province-assets/daklak-labels.json';
import { buildReportSummary } from './reportModel';
import { useTranslation } from '../../i18n/useTranslation';
import type { MessageKey } from '../../i18n/messages';
import {
  AlertIcon,
  ChartIcon,
  CheckCircleIcon,
  DocumentIcon,
  FolderIcon,
} from '../../components/layout/icons';
import {
  Card,
  DonutChart,
  KpiTile,
  PageHeader,
  PanelHeader,
  ProgressBar,
  SelectField,
} from '../../components/ui';

const labelMap = labels as Record<string, { name: string }>;
const areaName = (code: string) => labelMap[code]?.name ?? code;

// One distinct colour per lifecycle status (the legend always names the status too, so colour is
// never the only signal).
const STATUS_COLORS: Record<string, string> = {
  proposed: '#8b5cf6',
  preparing: '#6366f1',
  approved: '#0ea5e9',
  procurement: '#14b8a6',
  active: '#3b82f6',
  'at-risk': '#f0b429',
  delayed: '#e5484d',
  suspended: '#a16207',
  completed: '#22a06b',
  cancelled: '#64748b',
  unknown: '#94a3b8',
};

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
  const allSummary = useMemo(() => buildReportSummary(bundles), [bundles]);
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
      <section className="reports-view ui-page-root" aria-busy="true">
        <p>{t('portfolio.loading')}</p>
      </section>
    );
  if (state.status === 'error')
    return (
      <section className="reports-view ui-page-root" role="alert">
        <h2>{t('reports.title')}</h2>
        <p>{state.error.message}</p>
      </section>
    );

  const total = Math.max(summary.total, 1);
  const maxSector = Math.max(...summary.bySector.map((item) => item.count), 1);
  const statusSegments = summary.byStatus.map((item) => ({
    label: t(`status.${item.status}` as MessageKey),
    value: item.count,
    tone: STATUS_COLORS[item.status] ?? '#64748b',
  }));
  const resetFilters = () => {
    setSector('');
    setStatus('');
    setArea('');
  };
  return (
    <section
      id="reports"
      className="reports-view ui-page-root"
      aria-labelledby="reports-heading"
      tabIndex={-1}
    >
      <PageHeader
        headingId="reports-heading"
        title={t('reports.title')}
        description={t('reports.description')}
        badge={t('reports.sourceBadge')}
        badgeClassName="reports-view__mock-badge"
        breadcrumb={
          <>
            <span>{t('common.home')}</span>
            <strong>{t('common.reports')}</strong>
          </>
        }
        breadcrumbLabel={t('common.breadcrumb')}
        actions={
          <button type="button" className="reports-view__back" onClick={onBackToOverview}>
            {t('reports.backToOverview')}
          </button>
        }
      />
      <Card className="reports-filters" aria-labelledby="reports-filters-heading">
        <PanelHeader
          title={t('reports.filters')}
          icon={<ChartIcon />}
          headingId="reports-filters-heading"
        />
        <div className="reports-filters__grid">
          <SelectField
            id="reports-sector"
            label={t('portfolio.sectorLabel')}
            value={sector}
            onChange={(event) => setSector(event.target.value)}
            options={[
              { value: '', label: t('portfolio.sectorAll') },
              ...allSummary.bySector.map((item) => ({
                value: item.sector,
                label: t(`sector.${item.sector}` as MessageKey),
              })),
            ]}
          />
          <SelectField
            id="reports-status"
            label={t('portfolio.statusLabel')}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            options={[
              { value: '', label: t('portfolio.statusAll') },
              ...allSummary.byStatus.map((item) => ({
                value: item.status,
                label: t(`status.${item.status}` as MessageKey),
              })),
            ]}
          />
          <SelectField
            id="reports-area"
            label={t('portfolio.areaLabel')}
            value={area}
            onChange={(event) => setArea(event.target.value)}
            options={[
              { value: '', label: t('portfolio.areaAll') },
              ...allSummary.byArea.map((item) => ({
                value: item.area,
                label: areaName(item.area),
              })),
            ]}
          />
          <button type="button" className="reports-view__reset" onClick={resetFilters}>
            {t('reports.resetFilters')}
          </button>
        </div>
      </Card>
      <ul className="ui-kpi-grid reports-kpis" aria-label={t('reports.kpiLabel')}>
        <KpiTile
          label={t('reports.total')}
          value={summary.total}
          tone="blue"
          icon={<DocumentIcon />}
        />
        <KpiTile
          label={t('reports.disbursement')}
          value={summary.disbursementRate == null ? '—' : `${summary.disbursementRate.toFixed(1)}%`}
          tone="green"
          icon={<ChartIcon />}
        />
        <KpiTile
          label={t('reports.delayed')}
          value={summary.delayed}
          tone="red"
          icon={<AlertIcon />}
        />
        <KpiTile
          label={t('reports.completed')}
          value={summary.completed}
          tone="green"
          icon={<CheckCircleIcon />}
        />
        <KpiTile
          label={t('reports.warnings')}
          value={summary.dataWarnings}
          tone="gold"
          icon={<FolderIcon />}
        />
      </ul>
      <div className="reports-grid">
        <Card className="reports-panel reports-panel--status">
          <PanelHeader
            title={t('reports.statusStructure')}
            icon={<ChartIcon />}
            headingId="reports-status-heading"
          />
          <p id="reports-status-summary" className="reports-chart-summary">
            {t('reports.statusSummary', {
              total: summary.total,
              delayed: summary.delayed,
              completed: summary.completed,
            })}
          </p>
          <DonutChart
            segments={statusSegments}
            totalLabel={t('reports.projectsUnit')}
            ariaLabel={t('reports.statusSummary', {
              total: summary.total,
              delayed: summary.delayed,
              completed: summary.completed,
            })}
          />
        </Card>
        <Card className="reports-panel">
          <PanelHeader
            title={t('reports.sectors')}
            icon={<FolderIcon />}
            headingId="reports-sector-heading"
          />
          <p id="reports-sector-summary" className="reports-chart-summary">
            {t('reports.sectorSummary', {
              sector: summary.bySector[0]
                ? t(`sector.${summary.bySector[0].sector}` as MessageKey)
                : t('reports.noData'),
            })}
          </p>
          <ul className="reports-bars">
            {summary.bySector.map((item) => (
              <li key={item.sector}>
                <div>
                  <span>{t(`sector.${item.sector}` as MessageKey)}</span>
                  <strong>{item.count}</strong>
                </div>
                <ProgressBar
                  value={(item.count / maxSector) * 100}
                  tone="blue"
                  valueText={`${Math.round((item.count / total) * 100)}%`}
                />
              </li>
            ))}
          </ul>
        </Card>
        <Card className="reports-panel">
          <PanelHeader
            title={t('reports.areas')}
            icon={<AlertIcon />}
            headingId="reports-area-heading"
          />
          <p id="reports-area-summary" className="reports-chart-summary">
            {t('reports.areaSummary', {
              area: summary.byArea[0] ? areaName(summary.byArea[0].area) : t('reports.noData'),
              count: summary.byArea[0]?.count ?? 0,
            })}
          </p>
          <ol className="reports-ranked-list">
            {summary.unitAttention.slice(0, 8).map((item) => (
              <li key={item.area}>
                <div>
                  <span>{areaName(item.area)}</span>
                  <strong>{item.openIssues + item.delayed}</strong>
                </div>
                <ProgressBar
                  value={
                    ((item.openIssues + item.delayed) /
                      Math.max(
                        1,
                        summary.unitAttention[0]?.openIssues + summary.unitAttention[0]?.delayed ||
                          1,
                      )) *
                    100
                  }
                  tone={item.delayed > 0 ? 'red' : 'gold'}
                  valueText={t('reports.attentionSignals', {
                    delayed: item.delayed,
                    issues: item.openIssues,
                  })}
                />
              </li>
            ))}
          </ol>
        </Card>
        <Card className="reports-panel reports-panel--highlights">
          <PanelHeader
            title={t('reports.highlights')}
            icon={<CheckCircleIcon />}
            headingId="reports-highlights-heading"
          />
          <ul className="reports-highlight-list">
            <li>
              <strong>{t('reports.highlightDisbursement')}</strong>
              <span>
                {summary.highlights.disbursementRate == null
                  ? t('reports.noData')
                  : `${summary.highlights.disbursementRate.toFixed(1)}%`}
              </span>
            </li>
            <li>
              <strong>{t('reports.highlightDelayed')}</strong>
              <span>{summary.highlights.delayed}</span>
            </li>
            <li>
              <strong>{t('reports.highlightCompleted')}</strong>
              <span>{summary.highlights.completed}</span>
            </li>
            <li>
              <strong>{t('reports.highlightWarnings')}</strong>
              <span>{summary.highlights.dataWarnings}</span>
            </li>
          </ul>
        </Card>
        <Card className="reports-panel reports-panel--units">
          <PanelHeader
            title={t('reports.attention')}
            icon={<DocumentIcon />}
            headingId="reports-attention-heading"
          />
          <ul className="reports-unit-list">
            {summary.unitAttention
              .filter((item) => item.delayed > 0 || item.openIssues > 0)
              .slice(0, 8)
              .map((item) => (
                <li key={item.area}>
                  <div>
                    <strong>{areaName(item.area)}</strong>
                    <span>
                      {t('reports.unitSignals', {
                        delayed: item.delayed,
                        issues: item.openIssues,
                        projects: item.total,
                      })}
                    </span>
                  </div>
                  <ProgressBar
                    value={
                      ((item.delayed + item.openIssues) /
                        Math.max(
                          1,
                          summary.unitAttention[0]?.delayed +
                            summary.unitAttention[0]?.openIssues || 1,
                        )) *
                      100
                    }
                    tone={item.delayed > 0 ? 'red' : 'gold'}
                    valueText={String(item.delayed + item.openIssues)}
                  />
                </li>
              ))}
            {summary.unitAttention.every((item) => item.delayed === 0 && item.openIssues === 0) && (
              <li>{t('reports.noAttention')}</li>
            )}
          </ul>
        </Card>
      </div>
    </section>
  );
}
