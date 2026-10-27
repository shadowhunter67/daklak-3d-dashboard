import { useEffect, useMemo, useState } from 'react';
import labels from '#province-assets/daklak-labels.json';
import {
  PLANNING_REVIEW_PROJECT_IDS,
  PLANNING_UNCITED_PROJECT_IDS,
} from '../../data/planningCitations';
import { loadResearchedProjects } from '../../data/loadResearchedProjects';
import type { ResearchedDataset } from '../../entities/researched-project/types';
import { formatNumber } from '../../i18n/formatters';
import type { MessageKey } from '../../i18n/messages';
import { useTranslation } from '../../i18n/useTranslation';
import { Card, DataTable, PanelHeader } from '../../components/ui';
import { AlertIcon, ChartIcon, FolderIcon, TrendIcon } from '../../components/layout/icons';
import { buildDecisionQueue } from '../executive-overview/model/decisionQueue';
import { buildCatalogRows, formatCapitalBillions } from '../investment-catalog/model/catalogModel';
import { SECTOR_KEY } from '../investment-catalog/model/sectorLabels';
import {
  benchmarkBySector,
  benchmarkByUnit,
  bottleneckSummary,
  capitalExposure,
  type BenchmarkRow,
} from './investmentReportModel';

const UNIT_LIMIT = 10;
const REVIEW = new Set(PLANNING_REVIEW_PROJECT_IDS);
const UNCITED = new Set(PLANNING_UNCITED_PROJECT_IDS);
const unitName = (code: string) => (labels as Record<string, { name: string }>)[code]?.name ?? code;

/**
 * Báo cáo V2 cho danh mục thu hút đầu tư (dữ liệu có nguồn, tách khỏi phần báo cáo minh họa phía
 * trên): xu hướng (chưa có lịch sử → nói thẳng), so sánh, điểm nghẽn và vốn gắn với dự án có vấn đề.
 * Mọi con số đều đếm từ Quyết định 1985/QĐ-UBND; cái gì chưa có nguồn thì ghi "Chưa có dữ liệu".
 */
export function InvestmentReports() {
  const { t, locale } = useTranslation();
  const [dataset, setDataset] = useState<ResearchedDataset | null>(null);
  const [failed, setFailed] = useState(false);
  const [by, setBy] = useState<'sector' | 'unit'>('sector');

  useEffect(() => {
    let cancelled = false;
    loadResearchedProjects().then(
      (value) => !cancelled && setDataset(value),
      () => !cancelled && setFailed(true),
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const model = useMemo(() => {
    if (!dataset) return null;
    const rows = buildCatalogRows(dataset);
    const flagged = new Set(
      buildDecisionQueue({ rows, reviewIds: REVIEW, uncitedIds: UNCITED }).map((i) => i.projectId),
    );
    return {
      sectors: benchmarkBySector(rows),
      units: benchmarkByUnit(rows, UNIT_LIMIT),
      bottlenecks: bottleneckSummary({ review: REVIEW.size, uncited: UNCITED.size }),
      exposure: capitalExposure({ rows, flaggedIds: flagged }),
    };
  }, [dataset]);

  if (failed)
    return (
      <p role="alert" className="reports-invest__status">
        {t('reports.invest.error')}
      </p>
    );
  if (!model)
    return (
      <p role="status" className="reports-invest__status">
        {t('reports.invest.loading')}
      </p>
    );

  const missing = t('decision.missing');
  const capital = (vnd: number | undefined) =>
    vnd === undefined
      ? missing
      : t('catalog.capitalValue', { value: formatCapitalBillions(vnd, locale) });
  const benchmarkRows: BenchmarkRow[] = by === 'sector' ? model.sectors : model.units;
  const exposure = model.exposure;

  return (
    <section className="reports-invest" aria-labelledby="reports-invest-heading">
      <h2 id="reports-invest-heading">{t('reports.invest.heading')}</h2>
      <p>{t('reports.invest.note')}</p>
      <div className="reports-grid reports-invest__grid">
        <Card role="region" aria-labelledby="reports-trends-heading">
          <PanelHeader
            title={t('reports.invest.trends.heading')}
            icon={<TrendIcon />}
            headingId="reports-trends-heading"
          />
          <p className="reports-invest__empty">{t('reports.invest.trends.empty')}</p>
          <p>{t('reports.invest.trends.reason')}</p>
        </Card>

        <Card role="region" aria-labelledby="reports-bottleneck-heading">
          <PanelHeader
            title={t('reports.invest.bottleneck.heading')}
            icon={<AlertIcon />}
            headingId="reports-bottleneck-heading"
          />
          <p>{t('reports.invest.bottleneck.note')}</p>
          <ul className="reports-invest__bottlenecks">
            {model.bottlenecks.map((b) => (
              <li key={b.id}>
                <span>{t(`reports.invest.bottleneck.${b.id}` as MessageKey)}</span>
                <strong>
                  {b.available && b.count !== undefined
                    ? t('reports.invest.bottleneck.count', { count: formatNumber(b.count, locale) })
                    : missing}
                </strong>
              </li>
            ))}
          </ul>
        </Card>

        <Card role="region" aria-labelledby="reports-exposure-heading">
          <PanelHeader
            title={t('reports.invest.exposure.heading')}
            icon={<FolderIcon />}
            headingId="reports-exposure-heading"
          />
          <p>
            {t('reports.invest.exposure.summary', {
              count: formatNumber(exposure.flaggedProjects, locale),
              capital: formatCapitalBillions(exposure.flaggedCapitalVnd, locale),
              share:
                exposure.shareOfTotal === undefined
                  ? missing
                  : formatNumber(Math.round(exposure.shareOfTotal * 100), locale),
            })}
          </p>
          {exposure.flaggedWithoutCapital > 0 && (
            <p>
              {t('reports.invest.exposure.noCapital', {
                count: formatNumber(exposure.flaggedWithoutCapital, locale),
              })}
            </p>
          )}
          <p>{t('reports.invest.exposure.note')}</p>
        </Card>
      </div>

      <Card role="region" aria-labelledby="reports-benchmark-heading">
        <PanelHeader
          title={t('reports.invest.benchmark.heading')}
          icon={<ChartIcon />}
          headingId="reports-benchmark-heading"
        />
        <div
          className="data-readiness__mode"
          role="group"
          aria-label={t('reports.invest.benchmark.groupLabel')}
        >
          {(['sector', 'unit'] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={by === value}
              onClick={() => setBy(value)}
            >
              {t(`reports.invest.benchmark.${value}` as MessageKey)}
            </button>
          ))}
        </div>
        <DataTable<BenchmarkRow>
          caption={t('reports.invest.benchmark.caption')}
          rows={benchmarkRows}
          getRowKey={(r) => r.key}
          columns={[
            {
              key: 'name',
              header: t('reports.invest.benchmark.col.name'),
              render: (r) =>
                by === 'sector' ? t(SECTOR_KEY[r.key as keyof typeof SECTOR_KEY]) : unitName(r.key),
            },
            { key: 'projects', header: t('reports.invest.benchmark.col.projects'), align: 'right' },
            {
              key: 'capital',
              header: t('reports.invest.benchmark.col.capital'),
              align: 'right',
              render: (r) => (r.withCapital ? capital(r.capitalVnd) : missing),
            },
            {
              key: 'average',
              header: t('reports.invest.benchmark.col.average'),
              align: 'right',
              render: (r) => capital(r.averageVnd),
            },
          ]}
        />
      </Card>
    </section>
  );
}
