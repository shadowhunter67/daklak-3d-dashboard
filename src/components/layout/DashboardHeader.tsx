import { useMapStore } from '../../stores/mapStore';
import { useTranslation } from '../../i18n/useTranslation';
import { DEFAULT_DETAIL_MAP_CAMERA } from '../detail-map/detailMapTypes';
import type { SearchEntry } from '../../features/search/globalSearchIndex';
import { FontScaleControl } from './FontScaleControl';
import { GlobalSearch } from './GlobalSearch';
import { HelpIcon, HomeIcon, MenuIcon } from './icons';
import { ThemeToggle } from './ThemeToggle';

const modes = [
  ['overview', 'header.mode.overview'],
  ['energy', 'header.mode.energy'],
  ['heatmap', 'header.mode.heatmap'],
] as const;

/**
 * Topbar of the app shell: menu button (narrow screens), place search, "Về toàn tỉnh", text size,
 * theme and help. Primary navigation moved to `AppSidebar`; rarely-used utilities (language, share,
 * data provenance/sources) moved to the sidebar's display-settings popover. The 3D data-mode tabs
 * stay here because they only exist while the 3D view is open.
 */
export function DashboardHeader({
  onOpenMenu,
  onSelectPlace,
}: {
  onOpenMenu: () => void;
  onSelectPlace: (entry: SearchEntry) => void;
}) {
  const { t } = useTranslation();
  const dataMode = useMapStore((state) => state.dataMode);
  const viewMode = useMapStore((state) => state.viewMode);
  const changeDataMode = useMapStore((state) => state.changeDataMode);
  const select = useMapStore((state) => state.select);
  const requestCameraReset = useMapStore((state) => state.requestCameraReset);
  const setDetailMapCamera = useMapStore((state) => state.setDetailMapCamera);
  const requestHelp = useMapStore((state) => state.requestHelp);

  const backToProvince = () => {
    select(null);
    requestCameraReset();
    setDetailMapCamera(DEFAULT_DETAIL_MAP_CAMERA);
  };

  return (
    <header className="dashboard-header">
      <button
        type="button"
        className="topbar-menu-button"
        aria-label={t('sidebar.openMenu')}
        onClick={onOpenMenu}
      >
        <MenuIcon />
      </button>
      <GlobalSearch onSelect={onSelectPlace} />
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
      <div className="topbar-actions">
        <button
          type="button"
          className="topbar-button"
          onClick={backToProvince}
          aria-label={t('header.resetCamera.ariaLabel')}
        >
          <HomeIcon />
          <span>{t('topbar.backToProvince')}</span>
        </button>
        <FontScaleControl />
        <ThemeToggle />
        <button
          type="button"
          className="topbar-button topbar-button--help"
          onClick={requestHelp}
          aria-label={t('header.help.ariaLabel')}
          title={t('header.help.title')}
        >
          <HelpIcon />
          <span>{t('topbar.help')}</span>
        </button>
      </div>
    </header>
  );
}
