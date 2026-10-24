import { useEffect, useMemo, useRef, useState } from 'react';
import {
  PLANNING_DOCUMENTS,
  PLANNING_REVIEW_PROJECT_IDS,
  PLANNING_TOTAL_PROJECTS,
  PLANNING_UNCITED_PROJECT_IDS,
  type PlanningDocument,
  type PlanningIssuer,
} from '../../data/planningCitations';
import { loadResearchedProjects } from '../../data/loadResearchedProjects';
import { useTranslation } from '../../i18n/useTranslation';
import type { MessageKey } from '../../i18n/messages';
import {
  Card,
  DataTable,
  KpiTile,
  PageHeader,
  PanelHeader,
  SearchField,
  SelectField,
} from '../../components/ui';
import { DocumentIcon, FolderIcon, LayersIcon, MapIcon } from '../../components/layout/icons';
import { filterDocuments, summarizePlanning } from './model/planningModel';

const PAGE_SIZE = 40;
const ISSUERS: PlanningIssuer[] = [
  'prime-minister',
  'ministry',
  'people-committee',
  'provincial-council',
  'unknown',
];
const issuerKey = (issuer: PlanningIssuer) => `planning.issuer.${issuer}` as MessageKey;
const SUMMARY = summarizePlanning({
  documents: PLANNING_DOCUMENTS,
  total: PLANNING_TOTAL_PROJECTS,
  uncited: PLANNING_UNCITED_PROJECT_IDS,
  review: PLANNING_REVIEW_PROJECT_IDS,
});

function ProjectLinks({
  ids,
  names,
  onOpenCatalog,
}: {
  ids: readonly string[];
  names: ReadonlyMap<string, string>;
  onOpenCatalog: (query: string) => void;
}) {
  return (
    <ul>
      {ids.map((id) => {
        const name = names.get(id) ?? id;
        return (
          <li key={id}>
            <button
              type="button"
              className="project-portfolio__row-link"
              onClick={() => onOpenCatalog(name)}
            >
              {name}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function PlanningHubView({
  onBack,
  onOpenCatalog,
  onOpenOverlay,
}: {
  onBack: () => void;
  onOpenCatalog: (query: string) => void;
  onOpenOverlay: () => void;
}) {
  const { t, locale } = useTranslation();
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const [query, setQuery] = useState('');
  const [issuer, setIssuer] = useState<PlanningIssuer | ''>('');
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [openNumber, setOpenNumber] = useState<string | null>(null);
  const [names, setNames] = useState<ReadonlyMap<string, string>>(new Map());

  useEffect(() => {
    headingRef.current?.focus();
  }, []);
  useEffect(() => {
    let cancelled = false;
    loadResearchedProjects().then(
      (dataset) => {
        if (!cancelled) setNames(new Map(dataset.projects.map((p) => [p.id, p.name])));
      },
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(
    () => filterDocuments(PLANNING_DOCUMENTS, { query, issuer }),
    [query, issuer],
  );
  const formatDate = (iso: string | undefined) =>
    iso
      ? new Date(iso).toLocaleDateString(locale === 'en' ? 'en-GB' : 'vi-VN', { timeZone: 'UTC' })
      : t('planning.dateUnknown');

  return (
    <section
      id="planning-hub"
      className="project-portfolio ui-page-root"
      aria-labelledby="planning-hub-heading"
      tabIndex={-1}
    >
      <PageHeader
        headingId="planning-hub-heading"
        headingRef={headingRef}
        title={t('planning.heading')}
        description={t('planning.description')}
        breadcrumb={
          <>
            <span>{t('common.home')}</span>
            <strong>{t('planning.crumb')}</strong>
          </>
        }
        breadcrumbLabel={t('common.breadcrumb')}
        actions={
          <button type="button" className="project-portfolio__back" onClick={onBack}>
            {t('planning.back')}
          </button>
        }
      />
      <ul className="ui-kpi-grid project-portfolio__kpis" aria-label={t('planning.kpiLabel')}>
        <KpiTile
          label={t('planning.kpi.documents')}
          value={String(SUMMARY.documents)}
          tone="blue"
          icon={<DocumentIcon />}
        />
        <KpiTile
          label={t('planning.kpi.cited')}
          value={String(SUMMARY.citedProjects)}
          detail={t('planning.of', { total: SUMMARY.total })}
          tone="green"
          icon={<FolderIcon />}
        />
        <KpiTile
          label={t('planning.kpi.review')}
          value={String(SUMMARY.reviewProjects)}
          detail={t('planning.of', { total: SUMMARY.total })}
          tone="gold"
          icon={<LayersIcon />}
        />
        <KpiTile
          label={t('planning.kpi.uncited')}
          value={String(SUMMARY.uncitedProjects)}
          detail={t('planning.of', { total: SUMMARY.total })}
          tone="purple"
          icon={<MapIcon />}
        />
      </ul>

      <Card role="region" aria-labelledby="planning-docs-heading">
        <PanelHeader
          title={t('planning.table.caption')}
          icon={<DocumentIcon />}
          headingId="planning-docs-heading"
        />
        <form className="project-portfolio__filters" onSubmit={(e) => e.preventDefault()}>
          <SearchField
            id="planning-search"
            label={t('planning.search.label')}
            value={query}
            placeholder={t('planning.search.placeholder')}
            onChange={(event) => setQuery(event.target.value)}
          />
          <SelectField
            id="planning-issuer"
            label={t('planning.issuer.label')}
            value={issuer}
            onChange={(event) => setIssuer(event.target.value as PlanningIssuer | '')}
            options={[
              { value: '', label: t('planning.issuer.all') },
              ...ISSUERS.map((i) => ({ value: i, label: t(issuerKey(i)) })),
            ]}
          />
        </form>
        <p aria-live="polite" aria-atomic="true" className="project-portfolio__result-count">
          {t('planning.result', {
            shown: Math.min(limit, filtered.length),
            total: filtered.length,
          })}
        </p>
        <DataTable<PlanningDocument>
          caption={t('planning.table.caption')}
          rows={filtered.slice(0, limit)}
          getRowKey={(d) => d.number}
          columns={[
            { key: 'number', header: t('planning.table.number') },
            {
              key: 'issuer',
              header: t('planning.table.issuer'),
              render: (d) => t(issuerKey(d.issuer)),
            },
            { key: 'date', header: t('planning.table.date'), render: (d) => formatDate(d.date) },
            {
              key: 'projects',
              header: t('planning.table.projects'),
              render: (d) => (
                <>
                  <button
                    type="button"
                    className="project-portfolio__row-link"
                    aria-expanded={openNumber === d.number}
                    onClick={() => setOpenNumber(openNumber === d.number ? null : d.number)}
                  >
                    {t('planning.projectsCount', { count: d.projectIds.length })}
                    <span className="ui-visually-hidden"> — {d.number}</span>
                  </button>
                  {openNumber === d.number && (
                    <ProjectLinks ids={d.projectIds} names={names} onOpenCatalog={onOpenCatalog} />
                  )}
                </>
              ),
            },
          ]}
        />
        {filtered.length > limit && (
          <button
            type="button"
            className="project-portfolio-card__open"
            onClick={() => setLimit((n) => n + PAGE_SIZE)}
          >
            {t('planning.more', { count: Math.min(PAGE_SIZE, filtered.length - limit) })}
          </button>
        )}
      </Card>

      <Card role="region" aria-labelledby="planning-review-heading">
        <PanelHeader
          title={t('planning.review.heading')}
          icon={<LayersIcon />}
          headingId="planning-review-heading"
        />
        <p>{t('planning.review.note')}</p>
        {PLANNING_REVIEW_PROJECT_IDS.length === 0 ? (
          <p>{t('planning.review.empty')}</p>
        ) : (
          <ProjectLinks
            ids={PLANNING_REVIEW_PROJECT_IDS}
            names={names}
            onOpenCatalog={onOpenCatalog}
          />
        )}
      </Card>

      <Card role="region" aria-labelledby="planning-overlay-heading">
        <PanelHeader
          title={t('planning.overlay.heading')}
          icon={<MapIcon />}
          headingId="planning-overlay-heading"
        />
        <p>{t('planning.overlay.note')}</p>
        <button type="button" className="project-portfolio-card__open" onClick={onOpenOverlay}>
          {t('planning.overlay.open')}
        </button>
      </Card>
    </section>
  );
}
