import { useRef, useState } from 'react';
import { datasetManifest } from '../../data/datasetManifest';
import { captureProvenanceFocusTrigger } from '../provenance/provenanceFocusTrigger';
import { useMapStore } from '../../stores/mapStore';
import { useTranslation } from '../../i18n/useTranslation';
import { useScrollEdgeFade } from '../../hooks/useScrollEdgeFade';
import type { MessageKey } from '../../i18n/messages';

const modes = [
  ['overview', 'header.mode.overview'],
  ['energy', 'header.mode.energy'],
  ['heatmap', 'header.mode.heatmap'],
] as const;

// Primary navigation: the four mutually-exclusive top-level experiences. Distinct from the
// `modes` thematic tabs above (which only apply within the 3D overview, gated to viewMode 3d
// below — see the header-declutter fix that removed a since-redundant duplicate set of
// view-switch buttons that used to live in header-meta alongside these).
// 'map' folds in the former standalone 'table' (SVG map + ward directory) view — see
// DetailMapViewport.tsx, which now renders the directory as a sidebar next to the MapLibre canvas.
// Label is "Tổng quan điều hành" (not "Tổng quan") specifically to avoid an accessible-name clash
// with the `modes` data-mode tab of the same literal text — the two are unrelated concepts
// (top-level view vs. 3D thematic overlay) and must resolve unambiguously by role+name in tests.
const primaryViews = [
  ['overview', 'header.nav.overview', 'header.nav.overviewShort'],
  ['3d', 'header.nav.3d', 'header.nav.3d'],
  ['map', 'header.nav.map', 'header.nav.mapShort'],
  ['world', 'header.nav.world', 'header.nav.worldShort'],
] as const satisfies ReadonlyArray<readonly [string, MessageKey, MessageKey]>;

export function DashboardHeader() {
  const { t, locale, setLocale } = useTranslation();
  const [shareStatus, setShareStatus] = useState('');
  const shareTimer = useRef(0);
  const shareDashboard = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setShareStatus(t('header.share.status'));
      window.clearTimeout(shareTimer.current);
      shareTimer.current = window.setTimeout(() => setShareStatus(''), 2400);
    } catch {
      window.prompt(t('header.share.prompt'), url);
    }
  };
  const dataMode = useMapStore((state) => state.dataMode);
  const viewMode = useMapStore((state) => state.viewMode);
  const labelsVisible = useMapStore((state) => state.labelsVisible);
  const roadsVisible = useMapStore((state) => state.roadsVisible);
  const autoRotate = useMapStore((state) => state.autoRotate);
  const reducedMotion = useMapStore((state) => state.reducedMotion);
  const changeDataMode = useMapStore((state) => state.changeDataMode);
  const setViewMode = useMapStore((state) => state.setViewMode);
  const toggleLabels = useMapStore((state) => state.toggleLabels);
  const toggleRoads = useMapStore((state) => state.toggleRoads);
  const toggleAutoRotate = useMapStore((state) => state.toggleAutoRotate);
  const requestCameraReset = useMapStore((state) => state.requestCameraReset);
  const requestHelp = useMapStore((state) => state.requestHelp);
  const openProvenancePanel = useMapStore((state) => state.openProvenancePanel);
  const openDataSourcesPanel = useMapStore((state) => state.openDataSourcesPanel);
  const primaryNavRef = useRef<HTMLElement>(null);
  const headerMetaRef = useRef<HTMLDivElement>(null);
  useScrollEdgeFade(primaryNavRef);
  useScrollEdgeFade(headerMetaRef);

  return (
    <header className="dashboard-header">
      <div className="dashboard-brand">
        <div className="brand-mark">ĐL</div>
        <div>
          <p className="eyebrow">{t('header.eyebrow')}</p>
          <h1>
            ĐẮK LẮK <i>3D</i>
          </h1>
        </div>
      </div>
      <span className="header-mock-badge" role="note">
        {t('header.mockBadge')}
      </span>
      <nav className="primary-nav" aria-label={t('header.nav.ariaLabel')} ref={primaryNavRef}>
        {primaryViews.map(([mode, labelKey, shortLabelKey]) => (
          <button
            key={mode}
            className={viewMode === mode ? 'active' : ''}
            aria-current={viewMode === mode ? 'page' : undefined}
            aria-label={t(labelKey)}
            onClick={() => setViewMode(mode)}
          >
            <span className="control-label control-label--desktop">{t(labelKey)}</span>
            <span className="control-label control-label--mobile" aria-hidden="true">
              {t(shortLabelKey)}
            </span>
          </button>
        ))}
      </nav>
      {viewMode === '3d' && (
        <nav className="mode-tabs" aria-label={t('header.modeTabs.ariaLabel')}>
          {modes.map(([mode, labelKey]) => (
            <button
              key={mode}
              className={dataMode === mode ? 'active' : ''}
              aria-pressed={dataMode === mode}
              onClick={() => changeDataMode(mode)}
            >
              {t(labelKey)}
            </button>
          ))}
        </nav>
      )}
      <div className="header-meta" ref={headerMetaRef}>
        <span>{t('header.unitsCount', { count: datasetManifest.administrativeUnitCount })}</span>
        {viewMode === '3d' && (
          <button
            onClick={toggleAutoRotate}
            aria-pressed={autoRotate}
            disabled={reducedMotion}
            aria-label={
              reducedMotion
                ? t('header.autoRotate.ariaLabelReducedMotion')
                : autoRotate
                  ? t('header.autoRotate.ariaLabelStop')
                  : t('header.autoRotate.ariaLabelStart')
            }
            title={
              reducedMotion
                ? t('header.autoRotate.titleReducedMotion')
                : t('header.autoRotate.title')
            }
          >
            <span className="control-label control-label--desktop">
              {reducedMotion
                ? t('header.autoRotate.labelReducedMotion')
                : autoRotate
                  ? t('header.autoRotate.labelStop')
                  : t('header.autoRotate.labelStart')}
            </span>
            <span className="control-label control-label--mobile" aria-hidden="true">
              {t('header.autoRotate.shortLabel')}
            </span>
          </button>
        )}
        {viewMode === '3d' && (
          <>
            <button
              onClick={toggleRoads}
              aria-pressed={roadsVisible}
              aria-label={
                roadsVisible ? t('header.roads.ariaLabelHide') : t('header.roads.ariaLabelShow')
              }
            >
              <span className="control-label control-label--desktop">
                {roadsVisible ? t('header.roads.labelHide') : t('header.roads.labelShow')}
              </span>
              <span className="control-label control-label--mobile" aria-hidden="true">
                {t('header.roads.shortLabel')}
              </span>
            </button>
            <button
              onClick={toggleLabels}
              aria-pressed={labelsVisible}
              aria-label={
                labelsVisible
                  ? t('header.centerLabels.ariaLabelHide')
                  : t('header.centerLabels.ariaLabelShow')
              }
            >
              <span className="control-label control-label--desktop">
                {labelsVisible
                  ? t('header.centerLabels.labelHide')
                  : t('header.centerLabels.labelShow')}
              </span>
              <span className="control-label control-label--mobile" aria-hidden="true">
                {t('header.centerLabels.shortLabel')}
              </span>
            </button>
          </>
        )}
        {viewMode === '3d' && (
          <button
            className="header-secondary-control"
            onClick={requestCameraReset}
            aria-label={t('header.resetCamera.ariaLabel')}
            title={t('header.resetCamera.title')}
          >
            {t('header.resetCamera.label')}
          </button>
        )}
        <button
          className="header-secondary-control"
          onClick={shareDashboard}
          aria-label={t('header.share.ariaLabel')}
          title={t('header.share.title')}
        >
          {t('header.share.label')}
        </button>
        <button
          className="header-secondary-control header-help-control"
          onClick={requestHelp}
          aria-label={t('header.help.ariaLabel')}
          title={t('header.help.title')}
        >
          ?
        </button>
        <button
          id="open-data-provenance-panel"
          className="header-secondary-control"
          aria-haspopup="dialog"
          onClick={(event) => {
            captureProvenanceFocusTrigger(event.currentTarget);
            openProvenancePanel();
          }}
          aria-label={t('header.provenance.ariaLabel')}
          title={t('header.provenance.title')}
        >
          {t('header.provenance.label')}
        </button>
        <button
          id="open-data-sources-panel"
          className="header-secondary-control"
          aria-haspopup="true"
          onClick={openDataSourcesPanel}
          aria-label={t('header.dataSources.ariaLabel')}
          title={t('header.dataSources.title')}
        >
          {t('header.dataSources.label')}
        </button>
        <div className="header-lang-switch" role="group" aria-label={t('header.lang.ariaLabel')}>
          <button
            type="button"
            className="header-lang-button"
            aria-pressed={locale === 'vi'}
            aria-label={t('header.lang.viAriaLabel')}
            onClick={() => setLocale('vi')}
          >
            {t('header.lang.vi')}
          </button>
          <button
            type="button"
            className="header-lang-button"
            aria-pressed={locale === 'en'}
            aria-label={t('header.lang.enAriaLabel')}
            onClick={() => setLocale('en')}
          >
            {t('header.lang.en')}
          </button>
        </div>
      </div>
      <span className="share-status" role="status" aria-live="polite">
        {shareStatus}
      </span>
    </header>
  );
}
