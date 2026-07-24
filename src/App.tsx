import { lazy, Suspense, useEffect, useRef } from 'react';
import labels from './assets/maps/daklak/daklak-labels.json';
import { DashboardHeader } from './components/layout/DashboardHeader';
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
import { serializePortfolioHash, serializeProjectDetailHash } from './routing/hashRoute';
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

export default function App() {
  const { t } = useTranslation();
  const viewMode = useMapStore((state) => state.viewMode);
  const setViewMode = useMapStore((state) => state.setViewMode);
  const selectedCode = useMapStore((state) => state.selectedCode);
  const setReducedMotion = useMapStore((state) => state.setReducedMotion);
  const provenancePanelOpen = useMapStore((state) => state.provenancePanelOpen);
  const setDetailMapCamera = useMapStore((state) => state.setDetailMapCamera);
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
      viewMode === 'table'
        ? 'map-2d-title'
        : viewMode === 'overview'
          ? 'executive-overview'
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
  const isProjectRoute = route.kind === 'portfolio' || route.kind === 'project-detail';
  const skipLinkTargetId = isProjectRoute
    ? route.kind === 'portfolio'
      ? 'project-portfolio'
      : 'project-detail'
    : viewMode === 'table'
      ? 'map-2d-title'
      : viewMode === 'map'
        ? 'detail-map-viewport'
        : viewMode === 'overview'
          ? 'executive-overview'
          : 'map-viewport';

  const goToPortfolio = (filters: PortfolioFilters = {}, opts?: { replace?: boolean }) =>
    navigate(serializePortfolioHash(filters), opts);
  const goToOverview = () => navigate('', { replace: false });

  return (
    <main className="app-shell">
      <a href={`#${skipLinkTargetId}`} className="skip-link">
        {t('app.skipLink')}
      </a>
      <DashboardHeader />
      {isProjectRoute ? (
        <Suspense fallback={<ProjectRouteLoading />}>
          {route.kind === 'portfolio' && (
            <ProjectPortfolioView
              filters={route.filters}
              onFiltersChange={goToPortfolio}
              onOpenProject={(projectId) => navigate(serializeProjectDetailHash(projectId))}
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
        </Suspense>
      ) : (
        <>
          <MapViewport />
          {viewMode === 'map' && (
            <Suspense fallback={<MapLoading />}>
              <DetailMapViewport />
            </Suspense>
          )}
          {viewMode === 'overview' && <ExecutiveOverview onOpenPortfolio={() => goToPortfolio()} />}
          <DashboardPanels />
        </>
      )}
      <OnboardingOverlay />
      {provenancePanelOpen && (
        <Suspense fallback={<ProvenancePanelLoading />}>
          <DataProvenancePanel />
        </Suspense>
      )}
      <p className="visually-hidden" aria-live="polite" aria-atomic="true">
        {isProjectRoute
          ? route.kind === 'portfolio'
            ? t('app.live.openedPortfolio')
            : t('app.live.openedProjectDetail')
          : viewMode === 'table'
            ? t('app.live.openedTable')
            : viewMode === 'map'
              ? t('app.live.openedMap')
              : viewMode === 'overview'
                ? t('app.live.openedOverview')
                : t('app.live.opened3d')}{' '}
        {selectedName ? t('app.live.selected', { name: selectedName }) : ''}
      </p>
      <DatasetFooter />
    </main>
  );
}
