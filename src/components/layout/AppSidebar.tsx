import type { ReactNode } from 'react';
import wards from '#province-assets/daklak-wards-render.json';
import { useMapStore } from '../../stores/mapStore';
import { useTranslation } from '../../i18n/useTranslation';
import type { MessageKey } from '../../i18n/messages';
import type { HashRoute } from '../../routing/hashRoute';
import {
  serializeDataReadinessHash,
  serializePlanningHash,
  serializePortfolioHash,
  serializeReportsHash,
  serializeTourismHash,
} from '../../routing/hashRoute';
import { BrandLogo } from './BrandLogo';
import { DisplaySettings } from './DisplaySettings';
import {
  ChartIcon,
  CloseIcon,
  CubeIcon,
  DatabaseIcon,
  DocumentIcon,
  HomeIcon,
  LayersIcon,
  MapIcon,
  PinIcon,
  UsersIcon,
} from './icons';

const unitCount = wards.features.length;

type ItemId =
  'overview' | 'map' | '3d' | 'projects' | 'wards' | 'tourism' | 'planning' | 'data' | 'reports';

interface Item {
  id: ItemId;
  labelKey: MessageKey;
  icon: ReactNode;
}

const ITEMS: Item[] = [
  { id: 'overview', labelKey: 'sidebar.overview', icon: <HomeIcon /> },
  { id: 'map', labelKey: 'sidebar.map', icon: <MapIcon /> },
  { id: '3d', labelKey: 'sidebar.map3d', icon: <CubeIcon /> },
  { id: 'projects', labelKey: 'sidebar.projects', icon: <DocumentIcon /> },
  { id: 'wards', labelKey: 'sidebar.wards', icon: <UsersIcon /> },
  { id: 'tourism', labelKey: 'sidebar.tourism', icon: <PinIcon /> },
  { id: 'planning', labelKey: 'sidebar.planning', icon: <LayersIcon /> },
  { id: 'data', labelKey: 'sidebar.data', icon: <DatabaseIcon /> },
  { id: 'reports', labelKey: 'sidebar.reports', icon: <ChartIcon /> },
];

/** Which sidebar item is "current". Wards is an entry into the map view with its own intent (ward
 * directory open); Tourism and Planning are their own hash-route pages. */
function activeItem(route: HashRoute, viewMode: string, mapEntry: string): ItemId | null {
  if (
    route.kind === 'portfolio' ||
    route.kind === 'project-detail' ||
    route.kind === 'investment-catalog'
  )
    return 'projects';
  if (route.kind === 'data-readiness') return 'data';
  if (route.kind === 'reports') return 'reports';
  if (route.kind === 'tourism') return 'tourism';
  if (route.kind === 'planning') return 'planning';
  if (route.kind === 'unit') return 'wards';
  if (route.kind === 'diorama') return null;
  if (viewMode === 'overview') return 'overview';
  if (viewMode === '3d') return '3d';
  if (viewMode === 'map') return mapEntry === 'wards' ? 'wards' : 'map';
  return null;
}

export function AppSidebar({
  route,
  navigate,
  mobileOpen,
  onClose,
}: {
  route: HashRoute;
  navigate: (hash: string, opts?: { replace?: boolean }) => void;
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const viewMode = useMapStore((state) => state.viewMode);
  const setViewMode = useMapStore((state) => state.setViewMode);
  const setPlanningOverlay = useMapStore((state) => state.setDetailMapPlanningOverlay);
  const mapEntry = useMapStore((state) => state.mapEntry);
  const setMapEntry = useMapStore((state) => state.setMapEntry);
  const current = activeItem(route, viewMode, mapEntry);

  const go = (id: ItemId) => {
    // Hash routes sit on top of the query-based view; leave them first, then switch view.
    const leaveHash = () => {
      // Only push when a hash route is actually open; otherwise it would add a no-op history entry.
      if (route.kind !== 'none') navigate('', { replace: false });
    };
    switch (id) {
      case 'overview':
        leaveHash();
        setViewMode('overview');
        break;
      case 'map':
        leaveHash();
        setPlanningOverlay('none');
        setMapEntry('map');
        setViewMode('map');
        break;
      case 'wards':
        leaveHash();
        setPlanningOverlay('none');
        setMapEntry('wards');
        setViewMode('map');
        break;
      case 'tourism':
        navigate(serializeTourismHash());
        break;
      case 'planning':
        navigate(serializePlanningHash());
        break;
      case '3d':
        leaveHash();
        setViewMode('3d');
        break;
      case 'projects':
        navigate(serializePortfolioHash());
        break;
      case 'data':
        navigate(serializeDataReadinessHash());
        break;
      case 'reports':
        navigate(serializeReportsHash());
        break;
    }
    onClose();
  };

  return (
    <>
      {mobileOpen && <div className="sidebar-backdrop" onClick={onClose} aria-hidden="true" />}
      <aside className="app-sidebar" data-open={mobileOpen || undefined}>
        <div className="sidebar-brand">
          <BrandLogo />
          <div>
            <h1>
              ĐẮK LẮK <i>3D</i>
            </h1>
            <p className="sidebar-brand__tagline">{t('sidebar.brandTagline')}</p>
          </div>
          <button
            type="button"
            className="sidebar-close"
            aria-label={t('sidebar.closeMenu')}
            onClick={onClose}
          >
            <CloseIcon />
          </button>
        </div>
        <nav className="sidebar-nav" aria-label={t('sidebar.ariaLabel')}>
          {ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`sidebar-link${current === item.id ? ' active' : ''}`}
              aria-current={current === item.id ? 'page' : undefined}
              onClick={() => go(item.id)}
            >
              {item.icon}
              <span>
                {t(item.labelKey)}
                {item.id === 'wards' && (
                  <small className="sidebar-link__count">
                    {t('sidebar.wardsCount', { count: String(unitCount) })}
                  </small>
                )}
              </span>
            </button>
          ))}
        </nav>
        <DisplaySettings onAfterAction={onClose} autoOpen={mobileOpen} />
      </aside>
    </>
  );
}
