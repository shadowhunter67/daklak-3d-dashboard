import { useEffect, useMemo, useRef, useState } from 'react';
import labels from '#province-assets/daklak-labels.json';
import { loadResearchedProjects } from '../../data/loadResearchedProjects';
import type { ResearchedDataset, ResearchedSector } from '../../entities/researched-project/types';
import { useTranslation } from '../../i18n/useTranslation';
import type { MessageKey } from '../../i18n/messages';
import { DocumentIcon, FolderIcon, SearchIcon } from '../../components/layout/icons';
import {
  Card,
  KpiTile,
  PageHeader,
  PanelHeader,
  SearchField,
  SelectField,
  StatusChip,
} from '../../components/ui';
import {
  buildCatalogRows,
  filterCatalogRows,
  formatCapitalBillions,
  sortCatalogRows,
  type CatalogRow,
  type EvidenceField,
  type EvidenceObservation,
  type CatalogSortKey,
} from './model/catalogModel';

const PAGE_SIZE = 24;
/** Tái dùng nhãn lĩnh vực có sẵn; chỉ các lĩnh vực mới của danh mục thu hút đầu tư có khóa riêng. */
const SECTOR_KEY: Record<ResearchedSector, MessageKey> = {
  transport: 'sector.transport',
  energy: 'sector.energy',
  irrigation: 'sector.irrigation',
  health: 'sector.health',
  education: 'sector.education',
  urban: 'sector.urban-development',
  'digital-government': 'sector.digital-transformation',
  housing: 'catalogSector.housing',
  industrial: 'catalogSector.industrial',
  agriculture: 'catalogSector.agriculture',
  tourism: 'catalogSector.tourism',
  environment: 'catalogSector.environment',
  other: 'catalogSector.other',
};
const labelMap = labels as Record<string, { name: string }>;
const areaName = (code: string) => labelMap[code]?.name ?? code;

function formatDay(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale === 'en' ? 'en-GB' : 'vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Bằng chứng theo từng trường: nguồn, ngày văn bản, mức bằng chứng, độ tin cậy, và các quan sát cũ
 * (không bị ghi đè) trong "Lịch sử thay đổi". Chỉ hiện trường thật sự có quan sát. */
function EvidencePanel({ row, id }: { row: CatalogRow; id: string }) {
  const { t, locale } = useTranslation();
  const valueText = (e: EvidenceObservation & { field?: EvidenceField }, field: EvidenceField) =>
    field === 'lifecycle'
      ? t('catalog.lifecycle')
      : t('catalog.capitalValue', {
          value: formatCapitalBillions(Number(e.value), locale),
        });
  const sourceNode = (o: EvidenceObservation) =>
    o.sourceUrl && o.documentNumber ? (
      <a href={o.sourceUrl} target="_blank" rel="noopener noreferrer">
        {o.documentNumber}
      </a>
    ) : (
      (o.documentNumber ?? t('catalog.capitalMissing'))
    );
  return (
    <div
      id={id}
      className="project-portfolio__code"
      role="region"
      aria-label={t('catalog.evidence.heading')}
    >
      {row.evidence.map((e) => (
        <section key={e.field}>
          <h4>{t(`catalog.evidence.field.${e.field}` as MessageKey)}</h4>
          <p>
            <strong>{valueText(e, e.field)}</strong> ·{' '}
            {t(`catalogEvidence.status.${e.status}` as MessageKey)} ·{' '}
            {t('catalog.evidence.confidence')}: {t(`confidence.${e.confidence}` as MessageKey)}
          </p>
          <p>
            {t('catalog.evidence.observed')}: {formatDay(e.observedAt, locale)} ·{' '}
            {t('catalog.source')}: {sourceNode(e)}
          </p>
          {e.history.length > 0 && (
            <>
              <h5>{t('catalog.evidence.history')}</h5>
              <ul>
                {e.history.map((h) => (
                  <li key={`${h.observedAt}-${h.value}`}>
                    {valueText(h, e.field)} · {formatDay(h.observedAt, locale)} ·{' '}
                    {t(`catalogEvidence.status.${h.status}` as MessageKey)} · {sourceNode(h)}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      ))}
    </div>
  );
}

type LoadState =
  { status: 'loading' } | { status: 'error' } | { status: 'ok'; dataset: ResearchedDataset };

function CatalogCard({ row }: { row: CatalogRow }) {
  const { t, locale } = useTranslation();
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const evidenceId = `catalog-evidence-${row.id}`;
  const date = row.publishedAt
    ? new Date(row.publishedAt).toLocaleDateString(locale === 'en' ? 'en-GB' : 'vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'UTC',
      })
    : undefined;
  const source = row.documentNumber
    ? t('catalog.sourceValue', { doc: row.documentNumber, date: date ?? '' })
    : t('catalog.capitalMissing');
  return (
    <li>
      <Card className="project-portfolio-card">
        <div className="project-portfolio-card__heading">
          <div>
            <h3 className="project-portfolio-card__title">{row.name}</h3>
            <p className="project-portfolio-card__sector">
              <FolderIcon /> {t(SECTOR_KEY[row.sector])}
            </p>
          </div>
          <StatusChip label={t('catalog.lifecycle')} tone="info" dot />
        </div>
        <dl className="project-portfolio-card__grid">
          <div>
            <dt>{t('catalog.capital')}</dt>
            <dd>
              {row.capitalVnd === undefined
                ? t('catalog.capitalMissing')
                : t('catalog.capitalValue', {
                    value: formatCapitalBillions(row.capitalVnd, locale),
                  })}
            </dd>
          </div>
          <div>
            <dt>{t('catalog.area')}</dt>
            <dd>{row.areaCodes.map(areaName).join(', ') || t('catalog.areaMissing')}</dd>
          </div>
          <div>
            <dt>{t('catalog.location')}</dt>
            <dd>
              {row.locationAccuracy === 'administrative-centroid'
                ? t('catalog.locationCentroid')
                : t('catalog.locationNone')}
            </dd>
          </div>
          <div>
            <dt>{t('catalog.source')}</dt>
            <dd>
              {row.sourceUrl ? (
                <a
                  href={row.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${source} — ${row.name}`}
                >
                  {source}
                </a>
              ) : (
                source
              )}
            </dd>
          </div>
        </dl>
        {row.notes.length > 0 && (
          <p className="project-portfolio__code">
            {t('catalog.note')}: {row.notes[0]}
          </p>
        )}
        <button
          type="button"
          className="project-portfolio-card__open"
          aria-expanded={evidenceOpen}
          aria-controls={evidenceId}
          aria-label={`${evidenceOpen ? t('catalog.evidence.hide') : t('catalog.evidence.show')} — ${row.name}`}
          onClick={() => setEvidenceOpen((open) => !open)}
        >
          {evidenceOpen ? t('catalog.evidence.hide') : t('catalog.evidence.show')}
        </button>
        {evidenceOpen && <EvidencePanel row={row} id={evidenceId} />}
      </Card>
    </li>
  );
}

export function InvestmentCatalogView({
  onBackToPortfolio,
  initialQuery = '',
}: {
  onBackToPortfolio: () => void;
  /** Từ khóa mang từ tìm kiếm toàn cục (`#/investment-catalog?q=…`). */
  initialQuery?: string;
}) {
  const { t, locale } = useTranslation();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [retry, setRetry] = useState(0);
  const [query, setQuery] = useState(initialQuery);
  const [sector, setSector] = useState('');
  const [area, setArea] = useState('');
  const [sort, setSort] = useState<CatalogSortKey>('capital-desc');
  const [limit, setLimit] = useState(PAGE_SIZE);
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ status: 'loading' });
    loadResearchedProjects().then(
      (dataset) => !cancelled && setState({ status: 'ok', dataset }),
      () => !cancelled && setState({ status: 'error' }),
    );
    return () => {
      cancelled = true;
    };
  }, [retry]);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);
  useEffect(() => {
    // Chọn một kết quả khác từ ô tìm kiếm toàn cục khi đang ở trang này.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuery(initialQuery);
    setLimit(PAGE_SIZE);
  }, [initialQuery]);

  const rows = useMemo(
    () => (state.status === 'ok' ? buildCatalogRows(state.dataset) : []),
    [state],
  );
  const filtered = useMemo(
    () => sortCatalogRows(filterCatalogRows(rows, { query, sector, area }), sort),
    [rows, query, sector, area, sort],
  );

  if (state.status !== 'ok')
    return (
      <section
        id="investment-catalog"
        className="project-portfolio"
        aria-live="polite"
        aria-busy={state.status === 'loading'}
        tabIndex={-1}
      >
        {state.status === 'loading' ? (
          <>
            <span className="map-loading__spinner" aria-hidden="true" />
            <p>{t('catalog.loading')}</p>
          </>
        ) : (
          <div className="project-portfolio__error" role="alert">
            <h2>{t('catalog.loadError')}</h2>
            <button type="button" onClick={() => setRetry((n) => n + 1)}>
              {t('portfolio.retry')}
            </button>
            <button type="button" onClick={onBackToPortfolio}>
              {t('catalog.backToProjects')}
            </button>
          </div>
        )}
      </section>
    );

  const count = (pick: (r: CatalogRow) => string[]) => {
    const map = new Map<string, number>();
    for (const r of rows) for (const k of pick(r)) map.set(k, (map.get(k) ?? 0) + 1);
    return map;
  };
  const sectorCounts = count((r) => [r.sector]);
  const areaCounts = count((r) => r.areaCodes);
  const totalCapital = rows.reduce((sum, r) => sum + (r.capitalVnd ?? 0), 0);
  const clear = () => {
    setQuery('');
    setSector('');
    setArea('');
  };

  return (
    <section
      id="investment-catalog"
      className="project-portfolio ui-page-root"
      aria-labelledby="investment-catalog-heading"
      tabIndex={-1}
    >
      <PageHeader
        headingId="investment-catalog-heading"
        headingRef={headingRef}
        title={t('catalog.heading')}
        description={t('catalog.description')}
        badge={t('catalog.badge')}
        breadcrumb={
          <>
            <span>{t('common.home')}</span>
            <span>{t('common.projects')}</span>
            <strong>{t('catalog.heading')}</strong>
          </>
        }
        breadcrumbLabel={t('common.breadcrumb')}
        actions={
          <button type="button" className="project-portfolio__back" onClick={onBackToPortfolio}>
            {t('catalog.backToProjects')}
          </button>
        }
      />
      <ul className="ui-kpi-grid project-portfolio__kpis" aria-label={t('portfolio.kpiLabel')}>
        <KpiTile
          label={t('catalog.kpi.total')}
          value={rows.length}
          tone="blue"
          icon={<DocumentIcon />}
        />
        <KpiTile
          label={t('catalog.kpi.capital')}
          value={t('catalog.capitalValue', { value: formatCapitalBillions(totalCapital, locale) })}
          tone="gold"
          icon={<FolderIcon />}
        />
      </ul>

      <Card className="project-portfolio__filter-card">
        <PanelHeader
          title={t('portfolio.filtersHeading')}
          icon={<SearchIcon />}
          headingId="investment-catalog-filters-heading"
        />
        <form
          className="project-portfolio__filters"
          role="search"
          aria-labelledby="investment-catalog-filters-heading"
          onSubmit={(event) => event.preventDefault()}
        >
          <SearchField
            id="investment-catalog-search"
            label={t('catalog.search.label')}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setLimit(PAGE_SIZE);
            }}
            placeholder={t('catalog.search.placeholder')}
          />
          <SelectField
            id="investment-catalog-sector"
            label={t('portfolio.sectorLabel')}
            value={sector}
            onChange={(event) => {
              setSector(event.target.value);
              setLimit(PAGE_SIZE);
            }}
            options={[
              { value: '', label: t('portfolio.sectorAll') },
              ...[...sectorCounts].map(([value, n]) => ({
                value,
                label: `${t(SECTOR_KEY[value as ResearchedSector])} (${n})`,
              })),
            ]}
          />
          <SelectField
            id="investment-catalog-area"
            label={t('portfolio.areaLabel')}
            value={area}
            onChange={(event) => {
              setArea(event.target.value);
              setLimit(PAGE_SIZE);
            }}
            options={[
              { value: '', label: t('portfolio.areaAll') },
              ...[...areaCounts]
                .map(([value, n]) => ({ value, label: `${areaName(value)} (${n})` }))
                .sort((a, b) => a.label.localeCompare(b.label, 'vi')),
            ]}
          />
          <SelectField
            id="investment-catalog-sort"
            label={t('catalog.sort.label')}
            value={sort}
            onChange={(event) => setSort(event.target.value as CatalogSortKey)}
            options={[
              { value: 'capital-desc', label: t('catalog.sort.capital') },
              { value: 'name-asc', label: t('catalog.sort.name') },
            ]}
          />
        </form>
      </Card>

      <div className="project-portfolio__result-bar">
        <p aria-live="polite" aria-atomic="true" className="project-portfolio__result-count">
          {t('catalog.result', { shown: Math.min(limit, filtered.length), total: filtered.length })}
        </p>
      </div>
      {filtered.length === 0 ? (
        <p className="project-portfolio__empty">
          {t('portfolio.empty')}{' '}
          <button type="button" className="project-portfolio__clear-filters-inline" onClick={clear}>
            {t('portfolio.clearFilters')}
          </button>
        </p>
      ) : (
        <ul className="project-portfolio-cards">
          {filtered.slice(0, limit).map((row) => (
            <CatalogCard key={row.id} row={row} />
          ))}
        </ul>
      )}
      {filtered.length > limit && (
        <button
          type="button"
          className="project-portfolio-card__open"
          onClick={() => setLimit((n) => n + PAGE_SIZE)}
        >
          {t('catalog.more', { count: Math.min(PAGE_SIZE, filtered.length - limit) })}
        </button>
      )}
      <p className="project-portfolio__code">{t('catalog.disclaimer')}</p>
    </section>
  );
}
