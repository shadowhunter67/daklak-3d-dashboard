import { useRef, useState } from 'react';
import { datasetManifest } from '../../data/datasetManifest';
import { captureProvenanceFocusTrigger } from '../provenance/provenanceFocusTrigger';
import { useMapStore } from '../../stores/mapStore';
import { useTranslation } from '../../i18n/useTranslation';
import type { MessageKey } from '../../i18n/messages';

const modes = [
  ['overview', 'header.mode.overview'],
  ['energy', 'header.mode.energy'],
  ['heatmap', 'header.mode.heatmap'],
] as const;

// Primary navigation (Phase 2A): the four mutually-exclusive top-level experiences. Distinct from
// the `modes` thematic tabs above (which only apply within the 3D/2D map experiences) and from the
// quick-toggle buttons further down (kept unchanged for existing keyboard muscle-memory/tests).
// Label is "Tổng quan điều hành" (not "Tổng quan") specifically to avoid an accessible-name clash
// with the `modes` data-mode tab of the same literal text — the two are unrelated concepts
// (top-level view vs. 3D thematic overlay) and must resolve unambiguously by role+name in tests.
const primaryViews = [
  ['overview', 'header.nav.overview'],
  ['3d', 'header.nav.3d'],
  ['table', 'header.nav.table'],
  ['map', 'header.nav.map'],
] as const satisfies ReadonlyArray<readonly [string, MessageKey]>;

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
      <nav className="primary-nav" aria-label={t('header.nav.ariaLabel')}>
        {primaryViews.map(([mode, labelKey]) => (
          <button
            key={mode}
            className={viewMode === mode ? 'active' : ''}
            aria-current={viewMode === mode ? 'page' : undefined}
            onClick={() => setViewMode(mode)}
          >
            {t(labelKey)}
          </button>
        ))}
      </nav>
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
      <div className="header-meta">
        <span>{t('header.unitsCount', { count: datasetManifest.administrativeUnitCount })}</span>
        <button
          onClick={() => setViewMode('overview')}
          aria-pressed={viewMode === 'overview'}
          aria-label={t('header.openOverview.ariaLabel')}
        >
          <span className="control-label control-label--desktop">
            {t('header.openOverview.label')}
          </span>
          <span className="control-label control-label--mobile" aria-hidden="true">
            {t('header.openOverview.shortLabel')}
          </span>
        </button>
        <button
          onClick={() => setViewMode(viewMode === '3d' ? 'table' : '3d')}
          aria-pressed={viewMode === 'table'}
          aria-label={
            viewMode === '3d'
              ? t('header.toggle3dTable.ariaLabelOpenTable')
              : t('header.toggle3dTable.ariaLabelOpen3d')
          }
        >
          <span className="control-label control-label--desktop">
            {viewMode === '3d'
              ? t('header.toggle3dTable.label2d')
              : t('header.toggle3dTable.label3d')}
          </span>
          <span className="control-label control-label--mobile" aria-hidden="true">
            {viewMode === '3d'
              ? t('header.toggle3dTable.shortLabel2d')
              : t('header.toggle3dTable.shortLabel3d')}
          </span>
        </button>
        <button
          onClick={() => setViewMode(viewMode === 'map' ? '3d' : 'map')}
          aria-pressed={viewMode === 'map'}
          aria-label={
            viewMode === 'map'
              ? t('header.toggleDetailMap.ariaLabelClose')
              : t('header.toggleDetailMap.ariaLabelOpen')
          }
        >
          <span className="control-label control-label--desktop">
            {viewMode === 'map'
              ? t('header.toggleDetailMap.labelClose')
              : t('header.toggleDetailMap.labelOpen')}
          </span>
          <span className="control-label control-label--mobile" aria-hidden="true">
            {t('header.toggleDetailMap.shortLabel')}
          </span>
        </button>
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
            reducedMotion ? t('header.autoRotate.titleReducedMotion') : t('header.autoRotate.title')
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
        <button
          className="header-secondary-control"
          onClick={requestCameraReset}
          aria-label={t('header.resetCamera.ariaLabel')}
          title={t('header.resetCamera.title')}
        >
          {t('header.resetCamera.label')}
        </button>
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
