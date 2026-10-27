import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import labels from '#province-assets/daklak-labels.json';
import { AppSidebar } from './components/layout/AppSidebar';
import { DashboardHeader } from './components/layout/DashboardHeader';
import type { SearchEntry } from './features/search/globalSearchIndex';
import { DashboardPanels } from './components/layout/DashboardPanels';
import { DatasetFooter } from './components/layout/DatasetFooter';
import { MapViewport } from './components/layout/MapViewport';
import { MapLoading } from './components/map/MapFallback';
import { OnboardingOverlay } from './components/layout/OnboardingOverlay';
import { datasetManifestIssues } from './data/datasetManifest';
import { ExecutiveOverview } from './features/executive-overview/ExecutiveOverview';
import { useDashboardUrlSync } from './hooks/useDashboardUrlSync';
import { useMapStore } from './stores/mapStore';
import { useHashRoute } from './routing/useHashRoute';
import {
  serializeDioramaHash,
  serializeInvestmentCatalogHash,
  serializePlanningHash,
  serializePortfolioHash,
  serializeProjectDetailHash,
  serializeUnitHash,
} from './routing/hashRoute';
import type { PortfolioFilters } from './routing/hashRoute';
import { useTranslation } from './i18n/useTranslation';

// Lazy: Project Portfolio/Detail are their own feature chunks (spec Phase 2B1 D6) — neither one
// may be pulled into the eager main chunk, and neither imports Three.js/MapLibre/ECharts, so they
// stay isolated from the 3D/detail-map lazy boundaries below.
const ProjectPortfolioView = lazy(() =>
  import('./features/project-portfolio/ProjectPortfolioView').then((module) => ({
    default: module.ProjectPortfolioView,
  })),
);
const ProjectDetailView = lazy(() =>
  import('./features/project-detail/ProjectDetailView').then((module) => ({
    default: module.ProjectDetailView,
  })),
);
const InvestmentCatalogView = lazy(() =>
  import('./features/investment-catalog/InvestmentCatalogView').then((module) => ({
    default: module.InvestmentCatalogView,
  })),
);
const UnitProfileView = lazy(() =>
  import('./features/unit-profile/UnitProfileView').then((module) => ({
    default: module.UnitProfileView,
  })),
);
const TourismHubView = lazy(() =>
  import('./features/tourism-hub/TourismHubView').then((module) => ({
    default: module.TourismHubView,
  })),
);
const PlanningHubView = lazy(() =>
  import('./features/planning-hub/PlanningHubView').then((module) => ({
    default: module.PlanningHubView,
  })),
);
const ReportsView = lazy(() =>
  import('./features/reports/ReportsView').then((module) => ({ default: module.ReportsView })),
);
const DataReadinessView = lazy(() =>
  import('./features/data-readiness/DataReadinessView').then((module) => ({
    default: module.DataReadinessView,
  })),
);

// Lazy: Phase T1 "Khám phá Đắk Lắk 3D" (`?view=world`, reports/tourism-digital-twin/) — its own
// Three.js scene chunk, only fetched when a user actually opens ?view=world. Never pulled in by
// ?view=overview or any other existing route; see check_build_budget.mjs / the
// "does not load the world-exploration chunk" E2E assertion for the real guarantee.
const WorldExplorationView = lazy(() =>
  import('./features/world-exploration/WorldExplorationView').then((module) => ({
    default: module.WorldExplorationView,
  })),
);

// Lazy: illustrative destination diorama (`#/diorama/:id`) — own Three.js chunk, only fetched when
// that hash route is opened; never part of the eager chunk or of any query-based view.
const DestinationDioramaView = lazy(() =>
  import('./features/destination-diorama/DestinationDioramaView').then((module) => ({
    default: module.DestinationDioramaView,
  })),
);

function ProjectRouteLoading() {
  const { t } = useTranslation();
  return (
    <section className="project-portfolio" aria-live="polite" aria-busy="true">
      <span className="map-loading__spinner" aria-hidden="true" />
      <p>{t('app.loading')}</p>
    </section>
  );
}

// Lazy: the detail map's own orchestration code (camera sync, search, distance measurement, the
// layer panel) has no reason to sit in the eager main chunk for a user who never opens it — only
// the maplibre-gl/pmtiles *library* itself was previously deferred (via MapLibreLoader.ts inside
// this module); this defers the orchestration component too.
const DetailMapViewport = lazy(() =>
  import('./components/detail-map/DetailMapViewport').then((module) => ({
    default: module.DetailMapViewport,
  })),
);

// Lazy, safely: `provenancePanelOpen` is a plain boolean in the always-loaded store (see
// mapStore.ts), not a signal counter — this component only mounts while that's true, so a click
// that fires before the chunk resolves can't be missed the way it could be with a counter-based
// "have I seen this value" ref that only starts existing once the lazy component itself mounts.
const DataProvenancePanel = lazy(() =>
  import('./components/provenance/DataProvenancePanel').then((module) => ({
    default: module.DataProvenancePanel,
  })),
);

function ProvenancePanelLoading() {
  const { t } = useTranslation();
  return (
    <div className="provenance-panel-backdrop" role="status" aria-live="polite">
      {t('app.loading')}
    </div>
  );
}

// Same lazy-boundary pattern as DataProvenancePanel above — see mapStore.ts's
// `dataSourcesPanelOpen` doc comment.
const DataSourcesPanel = lazy(() =>
  import('./features/data-sources/DataSourcesPanel').then((module) => ({
    default: module.DataSourcesPanel,
  })),
);

// Same lazy-boundary pattern as DataProvenancePanel above — see mapStore.ts's
// `aboutPanelOpen` doc comment.
const AboutPanel = lazy(() =>
  import('./components/about/AboutPanel').then((module) => ({
    default: module.AboutPanel,
  })),
);

export default function App() {
  const { t } = useTranslation();
  const viewMode = useMapStore((state) => state.viewMode);
  const setViewMode = useMapStore((state) => state.setViewMode);
  const selectedCode = useMapStore((state) => state.selectedCode);
  const setReducedMotion = useMapStore((state) => state.setReducedMotion);
  const provenancePanelOpen = useMapStore((state) => state.provenancePanelOpen);
  const dataSourcesPanelOpen = useMapStore((state) => state.dataSourcesPanelOpen);
  const closeDataSourcesPanel = useMapStore((state) => state.closeDataSourcesPanel);
  const aboutPanelOpen = useMapStore((state) => state.aboutPanelOpen);
  const setDetailMapCamera = useMapStore((state) => state.setDetailMapCamera);
  const select = useMapStore((state) => state.select);
  const setMapEntry = useMapStore((state) => state.setMapEntry);
  const planningOverlay = useMapStore((state) => state.detailMapLayers.planningOverlay);
  const setPlanningOverlay = useMapStore((state) => state.setDetailMapPlanningOverlay);
  const [menuOpen, setMenuOpen] = useState(false);
  const previousView = useRef(viewMode);
  useDashboardUrlSync();
  const { route, navigate } = useHashRoute();

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [setReducedMotion]);

  useEffect(() => {
    if (previousView.current === viewMode) return;
    previousView.current = viewMode;
    // 'map' is handled inside DetailMapViewport itself (see there) — it's now a lazy boundary, so
    // an immediate rAF here could fire before its chunk has resolved and the element even exists.
    if (viewMode === 'map') return;
    const targetId =
      viewMode === 'overview'
        ? 'executive-overview'
        : viewMode === 'world'
          ? 'world-viewport'
          : 'map-viewport';
    requestAnimationFrame(() => document.getElementById(targetId)?.focus());
  }, [viewMode]);

  if (datasetManifestIssues.length)
    return (
      <main className="app-fallback" role="alert">
        <h1>{t('app.invalidConfig.title')}</h1>
        <p>{datasetManifestIssues.join('. ')}</p>
      </main>
    );

  const selectedName = selectedCode
    ? (labels[selectedCode as keyof typeof labels]?.name ?? selectedCode)
    : null;
  // Project routes (#/projects, #/projects/:id) take priority over the 4 query-based views — see
  // docs/adr/0002-static-host-routing.md. They render instead of, not alongside, MapViewport /
  // DetailMapViewport / ExecutiveOverview / DashboardPanels so Portfolio/Detail never risk pulling
  // in Three.js/MapLibre/ECharts (spec Phase 2B1 D6) regardless of whatever `viewMode` happens to
  // be underneath.
  const isProjectRoute =
    route.kind === 'portfolio' ||
    route.kind === 'project-detail' ||
    route.kind === 'data-readiness' ||
    route.kind === 'reports' ||
    route.kind === 'investment-catalog' ||
    route.kind === 'unit' ||
    route.kind === 'tourism' ||
    route.kind === 'planning' ||
    route.kind === 'diorama';
  const skipLinkTargetId = isProjectRoute
    ? route.kind === 'portfolio'
      ? 'project-portfolio'
      : route.kind === 'project-detail'
        ? 'project-detail'
        : route.kind === 'diorama'
          ? 'destination-diorama'
          : route.kind === 'reports'
            ? 'reports'
            : route.kind === 'investment-catalog'
              ? 'investment-catalog'
              : route.kind === 'unit'
                ? 'unit-profile'
                : route.kind === 'tourism'
                  ? 'tourism-hub'
                  : route.kind === 'planning'
                    ? 'planning-hub'
                    : 'data-readiness'
    : viewMode === 'map'
      ? 'detail-map-viewport'
      : viewMode === 'overview'
        ? 'executive-overview'
        : viewMode === 'world'
          ? 'world-viewport'
          : 'map-viewport';

  const goToPortfolio = (filters: PortfolioFilters = {}, opts?: { replace?: boolean }) =>
    navigate(serializePortfolioHash(filters), opts);
  const goToOverview = () => navigate('', { replace: false });
  const selectPlace = (entry: SearchEntry) => {
    if (entry.kind === 'project') {
      navigate(serializeProjectDetailHash(entry.id));
      return;
    }
    if (entry.kind === 'opportunity') {
      navigate(serializeInvestmentCatalogHash(entry.name));
      return;
    }
    if (entry.kind === 'planning') {
      navigate(serializePlanningHash());
      return;
    }
    if (entry.kind === 'place') {
      navigate(serializeDioramaHash(entry.id));
      return;
    }
    if (isProjectRoute) navigate('', { replace: false });
    select(entry.id);
    if (viewMode === 'map') {
      setDetailMapCamera({
        latitude: entry.latitude,
        longitude: entry.longitude,
        zoom: 12,
        bearing: 0,
        pitch: 0,
      });
    }
  };

  return (
    <main className="app-shell">
      <a
        href={`#${skipLinkTargetId}`}
        className="skip-link"
        onClick={(event) => {
          // Không đổi hash: hash là tuyến của ứng dụng (#/tourism...), đổi thành #<id> sẽ đưa người dùng
          // ra khỏi trang hiện tại. Chuyển focus thẳng tới vùng nội dung.
          event.preventDefault();
          const target = document.getElementById(skipLinkTargetId);
          if (!target) return;
          target.focus();
          target.scrollIntoView({ block: 'start' });
        }}
      >
        {t('app.skipLink')}
      </a>
      <AppSidebar
        route={route}
        navigate={navigate}
        mobileOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
      />
      <div className="app-main">
        <DashboardHeader onOpenMenu={() => setMenuOpen(true)} onSelectPlace={selectPlace} />
        {isProjectRoute ? (
          <Suspense fallback={<ProjectRouteLoading />}>
            {route.kind === 'portfolio' && (
              <ProjectPortfolioView
                filters={route.filters}
                onFiltersChange={goToPortfolio}
                onOpenProject={(projectId) => navigate(serializeProjectDetailHash(projectId))}
                onOpenInvestmentCatalog={() => navigate(serializeInvestmentCatalogHash())}
                onBackToOverview={goToOverview}
              />
            )}
            {route.kind === 'project-detail' && (
              <ProjectDetailView
                projectId={route.projectId}
                onBackToPortfolio={() => goToPortfolio()}
                onViewOnMap={(geometry) => {
                  if (geometry.type !== 'Point') return;
                  const [longitude, latitude] = geometry.coordinates;
                  setDetailMapCamera({ latitude, longitude, zoom: 13, bearing: 0, pitch: 0 });
                  setViewMode('map');
                  navigate('', { replace: false });
                }}
              />
            )}
            {route.kind === 'diorama' && (
              <DestinationDioramaView
                destinationId={route.destinationId}
                onBack={goToOverview}
                onSelect={(id) => navigate(serializeDioramaHash(id))}
              />
            )}
            {route.kind === 'reports' && <ReportsView onBackToOverview={goToOverview} />}
            {route.kind === 'unit' && (
              <UnitProfileView
                code={route.code}
                onBack={goToOverview}
                onViewOnMap={(code) => {
                  select(code);
                  setViewMode('map');
                  navigate('', { replace: false });
                }}
                onOpenCatalog={(code) => navigate(serializeInvestmentCatalogHash(undefined, code))}
                onOpenDestination={(id) => navigate(serializeDioramaHash(id))}
              />
            )}
            {route.kind === 'tourism' && (
              <TourismHubView
                onBack={goToOverview}
                onOpenUnit={(code) => navigate(serializeUnitHash(code))}
                onOpenDestination={(id) => navigate(serializeDioramaHash(id))}
              />
            )}
            {route.kind === 'planning' && (
              <PlanningHubView
                onBack={goToOverview}
                onOpenCatalog={(query) => navigate(serializeInvestmentCatalogHash(query))}
                onOpenOverlay={() => {
                  if (planningOverlay === 'none') setPlanningOverlay('land-use');
                  setMapEntry('map');
                  setViewMode('map');
                  navigate('', { replace: false });
                }}
              />
            )}
            {route.kind === 'investment-catalog' && (
              <InvestmentCatalogView
                onBackToPortfolio={() => goToPortfolio()}
                initialQuery={route.query}
                initialArea={route.area}
              />
            )}
            {route.kind === 'data-readiness' && (
              <DataReadinessView
                onBackToOverview={goToOverview}
                onOpenProject={(projectId) => navigate(serializeProjectDetailHash(projectId))}
              />
            )}
          </Suspense>
        ) : (
          <>
            <MapViewport />
            {viewMode === 'map' && (
              <Suspense fallback={<MapLoading />}>
                <DetailMapViewport />
              </Suspense>
            )}
            {viewMode === 'overview' && (
              <ExecutiveOverview onOpenPortfolio={() => goToPortfolio()} />
            )}
            {viewMode === 'world' && (
              <Suspense fallback={<MapLoading />}>
                <WorldExplorationView />
              </Suspense>
            )}
            <DashboardPanels />
          </>
        )}
      </div>
      <OnboardingOverlay />
      {provenancePanelOpen && (
        <Suspense fallback={<ProvenancePanelLoading />}>
          <DataProvenancePanel />
        </Suspense>
      )}
      {dataSourcesPanelOpen && (
        <Suspense fallback={<ProvenancePanelLoading />}>
          <DataSourcesPanel onClose={closeDataSourcesPanel} />
        </Suspense>
      )}
      {aboutPanelOpen && (
        <Suspense fallback={<ProvenancePanelLoading />}>
          <AboutPanel />
        </Suspense>
      )}
      <p className="visually-hidden" aria-live="polite" aria-atomic="true">
        {isProjectRoute
          ? route.kind === 'portfolio'
            ? t('app.live.openedPortfolio')
            : route.kind === 'project-detail'
              ? t('app.live.openedProjectDetail')
              : route.kind === 'diorama'
                ? t('app.live.openedDiorama')
                : route.kind === 'reports'
                  ? t('reports.title')
                  : route.kind === 'investment-catalog'
                    ? t('catalog.heading')
                    : route.kind === 'unit'
                      ? t('unit.crumb')
                      : route.kind === 'tourism'
                        ? t('tourism.heading')
                        : route.kind === 'planning'
                          ? t('planning.heading')
                          : t('app.live.openedDataReadiness')
          : viewMode === 'map'
            ? t('app.live.openedMap')
            : viewMode === 'overview'
              ? t('app.live.openedOverview')
              : viewMode === 'world'
                ? t('app.live.openedWorld')
                : t('app.live.opened3d')}{' '}
        {selectedName ? t('app.live.selected', { name: selectedName }) : ''}
      </p>
      <DatasetFooter />
    </main>
  );
}
