import { useEffect, useMemo, useRef, useState } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import wards from '#province-assets/daklak-wards-render.json';
import { ADMIN_UNIT_MEDIA } from '../../data/adminUnitMedia';
import { loadResearchedProjects } from '../../data/loadResearchedProjects';
import { formatSubUnits } from '../../data/formatSubUnits';
import { getUnitProfile, unitProfileSource } from '../../data/unitProfiles';
import { groupDestinationsByUnit } from '../../entities/admin-unit/unitRelations';
import type { ResearchedDataset } from '../../entities/researched-project/types';
import { verifiedTourismDestinations } from '../../entities/tourism/verifiedTourismDestinations';
import type { TourismDestinationCategory } from '../../entities/tourism/types';
import { formatNumber } from '../../i18n/formatters';
import type { MessageKey } from '../../i18n/messages';
import { useTranslation } from '../../i18n/useTranslation';
import { Card, KpiTile, PageHeader, PanelHeader } from '../../components/ui';
import { BuildingIcon, FolderIcon, PinIcon, UsersIcon } from '../../components/layout/icons';
import type { WardCollection } from '../../types/map';
import {
  buildCatalogRows,
  formatCapitalBillions,
  sortCatalogRows,
} from '../investment-catalog/model/catalogModel';
import { buildUnitProfileModel, imageCoverage } from './model/unitProfileModel';

const collection = wards as WardCollection;
const ALL_UNIT_CODES = collection.features.map((f) => f.properties.code);
const DESTINATIONS_BY_UNIT = groupDestinationsByUnit(verifiedTourismDestinations, collection);

const CATEGORY_KEY: Record<TourismDestinationCategory, MessageKey> = {
  lake: 'worldExploration.destination.category.lake',
  'national-park': 'worldExploration.destination.category.nationalPark',
  waterfall: 'worldExploration.destination.category.waterfall',
  'cultural-village': 'worldExploration.destination.category.culturalVillage',
  'heritage-structure': 'worldExploration.destination.category.heritageStructure',
  'natural-landmark': 'worldExploration.destination.category.naturalLandmark',
};

/** Hình dạng ranh giới của đơn vị từ dữ liệu GIS — dùng khi chưa có ảnh đã xác minh. */
function BoundaryShape({ code, label }: { code: string; label: string }) {
  const path = useMemo(() => {
    const feature = collection.features.find((f) => f.properties.code === code);
    if (!feature) return '';
    const projection = geoMercator().fitSize([320, 200], feature);
    return geoPath(projection)(feature) ?? '';
  }, [code]);
  return (
    <svg viewBox="0 0 320 200" role="img" aria-label={label} className="unit-profile__shape">
      <path
        d={path}
        fill="var(--ui-accent)"
        fillOpacity="0.22"
        stroke="var(--ui-accent)"
        strokeWidth="2"
      />
    </svg>
  );
}

export function UnitProfileView({
  code,
  onBack,
  onViewOnMap,
  onOpenCatalog,
  onOpenDestination,
}: {
  code: string;
  onBack: () => void;
  onViewOnMap: (code: string) => void;
  onOpenCatalog: (code: string) => void;
  onOpenDestination: (id: string) => void;
}) {
  const { t, locale } = useTranslation();
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const [dataset, setDataset] = useState<ResearchedDataset | null>(null);
  const profile = getUnitProfile(code);

  useEffect(() => {
    let cancelled = false;
    loadResearchedProjects().then(
      (value) => !cancelled && setDataset(value),
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    headingRef.current?.focus();
  }, [code]);

  const model = useMemo(
    () =>
      profile
        ? buildUnitProfileModel(code, {
            profile,
            opportunities: dataset
              ? sortCatalogRows(buildCatalogRows(dataset), 'capital-desc')
              : [],
          })
        : undefined,
    [code, profile, dataset],
  );

  if (!profile || !model)
    return (
      <section id="unit-profile" className="project-portfolio ui-page-root" tabIndex={-1}>
        <p role="alert">{t('unit.notFound', { code })}</p>
        <button type="button" className="project-portfolio__back" onClick={onBack}>
          {t('portfolio.backToOverview')}
        </button>
      </section>
    );

  const typeLabel = t(profile.type === 'phuong' ? 'unitType.ward' : 'unitType.commune');
  const destinations = DESTINATIONS_BY_UNIT.get(code) ?? [];
  const coverage = imageCoverage(ALL_UNIT_CODES, ADMIN_UNIT_MEDIA);
  const photo = ADMIN_UNIT_MEDIA.find(
    (m) => m.administrativeUnitCode === code && m.usage === 'production' && m.localAsset,
  );
  const capital = formatCapitalBillions(model.opportunityCapitalVnd, locale);

  return (
    <section
      id="unit-profile"
      className="project-portfolio ui-page-root"
      aria-labelledby="unit-profile-heading"
      tabIndex={-1}
    >
      <PageHeader
        headingId="unit-profile-heading"
        headingRef={headingRef}
        title={`${typeLabel} ${model.name}`}
        description={t(photo ? 'unit.hero.captionPhoto' : 'unit.hero.caption')}
        breadcrumb={
          <>
            <span>{t('common.home')}</span>
            <span>{t('unit.crumb')}</span>
            <strong>{model.name}</strong>
          </>
        }
        breadcrumbLabel={t('common.breadcrumb')}
        actions={
          <>
            <button
              type="button"
              className="project-portfolio__back"
              onClick={() => onViewOnMap(code)}
            >
              {t('workspace.info.viewOnMap')}
            </button>
            <button type="button" className="project-portfolio__back" onClick={onBack}>
              {t('portfolio.backToOverview')}
            </button>
          </>
        }
      />
      {photo ? (
        <Card>
          <figure className="unit-profile__photo">
            <img
              src={`${import.meta.env.BASE_URL}${photo.localAsset}`}
              alt={t('unit.hero.photoAlt', { place: photo.subject })}
              loading="lazy"
              decoding="async"
            />
            <figcaption>
              {t('unit.hero.photoCaption', { place: photo.subject })} {photo.notes}{' '}
              <a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer">
                {t('catalog.source')}
              </a>{' '}
              ({photo.license})
            </figcaption>
          </figure>
        </Card>
      ) : (
        <Card>
          <BoundaryShape code={code} label={t('unit.hero.shapeAlt', { name: model.name })} />
        </Card>
      )}
      <ul className="ui-kpi-grid project-portfolio__kpis" aria-label={t('unit.kpiLabel')}>
        <KpiTile
          label={t('workspace.info.area')}
          value={`${formatNumber(model.areaKm2, locale)} km²`}
          tone="blue"
          icon={<BuildingIcon />}
        />
        <KpiTile
          label={t('workspace.info.population')}
          value={formatNumber(model.population2025, locale)}
          tone="green"
          icon={<UsersIcon />}
        />
        <KpiTile
          label={t('unit.stat.density')}
          value={
            model.densityPerKm2 === undefined
              ? t('catalog.capitalMissing')
              : formatNumber(model.densityPerKm2, locale)
          }
          tone="gold"
          icon={<UsersIcon />}
        />
        <KpiTile
          label={t('workspace.info.subUnits')}
          value={formatSubUnits(profile, t)}
          tone="purple"
          icon={<PinIcon />}
        />
      </ul>

      <Card role="region" aria-labelledby="unit-opps-heading">
        <PanelHeader
          title={t('unit.opps.heading')}
          icon={<FolderIcon />}
          headingId="unit-opps-heading"
        />
        {model.opportunities.length === 0 ? (
          <p>{t('unit.opps.empty')}</p>
        ) : (
          <>
            <p>
              {t('unit.opps.summary', {
                count: String(model.opportunities.length),
                capital: t('catalog.capitalValue', { value: capital }),
              })}
            </p>
            {model.opportunitiesWithoutCapital > 0 && (
              <p>
                {t('unit.opps.noCapital', { count: String(model.opportunitiesWithoutCapital) })}
              </p>
            )}
            <ul>
              {model.opportunities.slice(0, 5).map((o) => (
                <li key={o.id}>{o.name}</li>
              ))}
            </ul>
            <button
              type="button"
              className="project-portfolio-card__open"
              onClick={() => onOpenCatalog(code)}
            >
              {t('unit.opps.viewAll')}
            </button>
          </>
        )}
      </Card>

      <Card role="region" aria-labelledby="unit-tourism-heading">
        <PanelHeader
          title={t('unit.tourism.heading')}
          icon={<PinIcon />}
          headingId="unit-tourism-heading"
        />
        <p>{t('unit.tourism.note')}</p>
        {destinations.length === 0 ? (
          <p>{t('unit.tourism.empty')}</p>
        ) : (
          <ul>
            {destinations.map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  className="project-portfolio__row-link"
                  onClick={() => onOpenDestination(d.id)}
                >
                  {d.name}
                </button>{' '}
                · {t(CATEGORY_KEY[d.category])} ·{' '}
                <a
                  href={d.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${t('catalog.source')}: ${d.name}`}
                >
                  {t('catalog.source')}
                </a>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card role="region" aria-labelledby="unit-sources-heading">
        <PanelHeader
          title={t('unit.sources.heading')}
          icon={<BuildingIcon />}
          headingId="unit-sources-heading"
        />
        <p>
          {t('unit.sources.profile', { title: unitProfileSource.title })}{' '}
          <a href={unitProfileSource.url} target="_blank" rel="noopener noreferrer">
            {unitProfileSource.publisher}
          </a>
        </p>
        <p>
          {t('unit.sources.coverage', {
            verified: String(coverage.verified),
            total: String(coverage.total),
            fallback: String(coverage.fallback),
          })}
        </p>
      </Card>
    </section>
  );
}
