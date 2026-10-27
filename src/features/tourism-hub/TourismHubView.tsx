import { useEffect, useMemo, useRef, useState } from 'react';
import wards from '#province-assets/daklak-wards-render.json';
import labels from '#province-assets/daklak-labels.json';
import { verifiedTourismDestinations } from '../../entities/tourism/verifiedTourismDestinations';
import {
  TOURISM_DESTINATION_CATEGORIES,
  type TourismDestinationCategory,
} from '../../entities/tourism/types';
import { useTranslation } from '../../i18n/useTranslation';
import type { MessageKey } from '../../i18n/messages';
import { Card, KpiTile, PageHeader, SearchField, SelectField } from '../../components/ui';
import { PinIcon, MapIcon, CubeIcon, UsersIcon } from '../../components/layout/icons';
import type { WardCollection } from '../../types/map';
import { DESTINATION_MEDIA } from '../../data/destinationMedia';
import { ResponsiveImage } from '../../components/ui/ResponsiveImage';
import { PLANNING_DOCUMENTS } from '../../data/planningCitations';
import { loadResearchedProjects } from '../../data/loadResearchedProjects';
import { formatNumber } from '../../i18n/formatters';
import {
  buildCatalogRows,
  formatCapitalBillions,
  type CatalogRow,
} from '../investment-catalog/model/catalogModel';
import { buildUnitLinks } from './model/destinationLinks';
import {
  buildTourismItems,
  filterTourismItems,
  summarizeTourism,
  type TourismItem,
} from './model/tourismModel';

const ITEMS = buildTourismItems(verifiedTourismDestinations, wards as WardCollection);
const SUMMARY = summarizeTourism(ITEMS);
const unitName = (code: string) => (labels as Record<string, { name: string }>)[code]?.name ?? code;

const CATEGORY_KEY: Record<TourismDestinationCategory, MessageKey> = {
  lake: 'worldExploration.destination.category.lake',
  'national-park': 'worldExploration.destination.category.nationalPark',
  waterfall: 'worldExploration.destination.category.waterfall',
  'cultural-village': 'worldExploration.destination.category.culturalVillage',
  'heritage-structure': 'worldExploration.destination.category.heritageStructure',
  'natural-landmark': 'worldExploration.destination.category.naturalLandmark',
};

function DestinationCard({
  item,
  rows,
  onOpenUnit,
  onOpenDestination,
  onOpenCatalog,
  onOpenPlanning,
}: {
  item: TourismItem;
  /** Danh mục thu hút đầu tư đã tải; `null` khi chưa tải được (thẻ ghi "Chưa có dữ liệu"). */
  rows: readonly CatalogRow[] | null;
  onOpenUnit: (code: string) => void;
  onOpenDestination: (id: string) => void;
  onOpenCatalog: (areaCode: string) => void;
  onOpenPlanning: () => void;
}) {
  const { t, locale } = useTranslation();
  const { destination, unitCode } = item;
  const media = DESTINATION_MEDIA.get(destination.id);
  const links = rows && unitCode ? buildUnitLinks(unitCode, rows, PLANNING_DOCUMENTS) : null;
  const missing = t('catalog.capitalMissing');
  return (
    <li className="project-portfolio-card tourism-card">
      {destination.imageUrl ? (
        <figure className="tourism-card__photo">
          {media && (
            <ResponsiveImage
              item={media}
              alt={t('tourism.card.photoAlt', { name: destination.name })}
            />
          )}
          <figcaption>
            {destination.imageAttribution} ({destination.imageLicense})
          </figcaption>
        </figure>
      ) : (
        <p className="tourism-card__photo tourism-card__photo--empty">
          {t('tourism.card.noPhoto')}
        </p>
      )}
      <h2 className="tourism-card__title">{destination.name}</h2>
      <p className="tourism-card__category">{t(CATEGORY_KEY[destination.category])}</p>
      <p>
        {unitCode
          ? t('tourism.card.unit', { name: unitName(unitCode) })
          : t('tourism.card.unitUnknown')}
      </p>
      {unitCode && (
        <dl
          className="tourism-card__chain"
          aria-label={t('tourism.chain.aria', { name: destination.name })}
        >
          <div>
            <dt>{t('tourism.chain.projects')}</dt>
            <dd>
              {links
                ? t('tourism.chain.projectsValue', {
                    count: formatNumber(links.projects, locale),
                    tourism: formatNumber(links.tourismProjects, locale),
                  })
                : missing}
              {links && links.projects > 0 && (
                <>
                  {' '}
                  <button
                    type="button"
                    className="project-portfolio__row-link"
                    onClick={() => onOpenCatalog(unitCode)}
                  >
                    {t('tourism.chain.viewProjects')}
                    <span className="ui-visually-hidden"> — {destination.name}</span>
                  </button>
                </>
              )}
            </dd>
          </div>
          <div>
            <dt>{t('tourism.chain.access')}</dt>
            <dd>{missing}</dd>
          </div>
          <div>
            <dt>{t('tourism.chain.planning')}</dt>
            <dd>
              {links
                ? t('tourism.chain.planningValue', {
                    count: formatNumber(links.planningDocuments.length, locale),
                  })
                : missing}
              {links && links.planningDocuments.length > 0 && (
                <>
                  {' '}
                  <button
                    type="button"
                    className="project-portfolio__row-link"
                    onClick={onOpenPlanning}
                  >
                    {t('tourism.chain.viewPlanning')}
                    <span className="ui-visually-hidden"> — {destination.name}</span>
                  </button>
                </>
              )}
            </dd>
          </div>
          <div>
            <dt>{t('tourism.chain.opportunity')}</dt>
            <dd>
              {links && links.capitalVnd !== undefined
                ? t('tourism.chain.opportunityValue', {
                    capital: formatCapitalBillions(links.capitalVnd, locale),
                  })
                : missing}
            </dd>
          </div>
        </dl>
      )}
      <p className="tourism-card__links">
        <a href={destination.sourceUrl} target="_blank" rel="noopener noreferrer">
          {t('tourism.card.source')}
          <span className="ui-visually-hidden"> — {destination.name}</span>
        </a>
      </p>
      <div className="tourism-card__actions">
        {unitCode && (
          <button
            type="button"
            className="project-portfolio-card__open"
            onClick={() => onOpenUnit(unitCode)}
          >
            {t('tourism.card.profile')}
            <span className="ui-visually-hidden"> — {destination.name}</span>
          </button>
        )}
        <button
          type="button"
          className="project-portfolio-card__open"
          onClick={() => onOpenDestination(destination.id)}
        >
          {t('tourism.card.diorama')}
          <span className="ui-visually-hidden"> — {destination.name}</span>
        </button>
      </div>
    </li>
  );
}

export function TourismHubView({
  onBack,
  onOpenUnit,
  onOpenDestination,
  onOpenCatalog,
  onOpenPlanning,
}: {
  onBack: () => void;
  onOpenUnit: (code: string) => void;
  onOpenDestination: (id: string) => void;
  onOpenCatalog: (areaCode: string) => void;
  onOpenPlanning: () => void;
}) {
  const { t } = useTranslation();
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<TourismDestinationCategory | ''>('');
  const [rows, setRows] = useState<readonly CatalogRow[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadResearchedProjects().then(
      (dataset) => !cancelled && setRows(buildCatalogRows(dataset)),
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const filtered = useMemo(() => filterTourismItems(ITEMS, { query, category }), [query, category]);

  return (
    <section
      id="tourism-hub"
      className="project-portfolio ui-page-root"
      aria-labelledby="tourism-hub-heading"
      tabIndex={-1}
    >
      <PageHeader
        headingId="tourism-hub-heading"
        headingRef={headingRef}
        title={t('tourism.heading')}
        description={t('tourism.description')}
        breadcrumb={
          <>
            <span>{t('common.home')}</span>
            <strong>{t('tourism.crumb')}</strong>
          </>
        }
        breadcrumbLabel={t('common.breadcrumb')}
        actions={
          <button type="button" className="project-portfolio__back" onClick={onBack}>
            {t('tourism.back')}
          </button>
        }
      />
      <ul className="ui-kpi-grid project-portfolio__kpis" aria-label={t('tourism.kpiLabel')}>
        <KpiTile
          label={t('tourism.kpi.total')}
          value={String(SUMMARY.total)}
          tone="blue"
          icon={<PinIcon />}
        />
        <KpiTile
          label={t('tourism.kpi.withPhoto')}
          value={`${SUMMARY.withPhoto}/${SUMMARY.total}`}
          tone="green"
          icon={<CubeIcon />}
        />
        <KpiTile
          label={t('tourism.kpi.units')}
          value={String(SUMMARY.units)}
          tone="gold"
          icon={<MapIcon />}
        />
        <KpiTile
          label={t('tourism.kpi.visitors')}
          value={t('tourism.kpi.visitorsMissing')}
          tone="purple"
          icon={<UsersIcon />}
        />
      </ul>
      <Card>
        <form className="project-portfolio__filters" onSubmit={(e) => e.preventDefault()}>
          <SearchField
            id="tourism-search"
            label={t('tourism.search.label')}
            value={query}
            placeholder={t('tourism.search.placeholder')}
            onChange={(event) => setQuery(event.target.value)}
          />
          <SelectField
            id="tourism-category"
            label={t('tourism.category.label')}
            value={category}
            onChange={(event) => setCategory(event.target.value as TourismDestinationCategory | '')}
            options={[
              { value: '', label: t('tourism.category.all') },
              ...TOURISM_DESTINATION_CATEGORIES.map((c) => ({
                value: c,
                label: t(CATEGORY_KEY[c]),
              })),
            ]}
          />
        </form>
      </Card>
      <div className="project-portfolio__result-bar">
        <p aria-live="polite" aria-atomic="true" className="project-portfolio__result-count">
          {t('tourism.result', { shown: filtered.length, total: ITEMS.length })}
        </p>
      </div>
      {filtered.length === 0 ? (
        <p className="project-portfolio__empty">{t('tourism.empty')}</p>
      ) : (
        <ul className="project-portfolio-cards">
          {filtered.map((item) => (
            <DestinationCard
              key={item.destination.id}
              item={item}
              onOpenUnit={onOpenUnit}
              onOpenDestination={onOpenDestination}
              rows={rows}
              onOpenCatalog={onOpenCatalog}
              onOpenPlanning={onOpenPlanning}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
