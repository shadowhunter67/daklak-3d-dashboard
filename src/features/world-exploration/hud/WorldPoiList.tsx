import { useEffect, useRef } from 'react';
import { useTranslation } from '../../../i18n/useTranslation';
import { CATEGORY_MESSAGE_KEY } from '../poi/poiCategoryMessages';
import { haversineDistanceMeters, worldToLatLon } from '../coordinates/worldCoordinates';
import { worldPois } from '../poi/worldPoi';
import { useWorldExplorationStore } from '../state/worldExplorationStore';
import { formatDistanceMeters } from './worldHudFormat';

/**
 * Non-canvas, keyboard-navigable alternative to the in-3D destination markers/panel (task section
 * 11: "POI đang hiển thị trên thế giới phải có danh sách/alternative UI phù hợp") — every POI is
 * reachable and its full detail readable here regardless of camera position/mode, unlike the
 * in-canvas panel (`WorldDestinationMarkers.tsx`), which is anchored to a marker's on-screen
 * position and can be off-frame. Expanding a row also sets the shared `selectedPoiId`, so it stays
 * in sync with marker clicks and `PlayerRig.tsx`'s "E" interact (see `WorldDestinationMarkers.tsx`
 * doc comment) rather than keeping a second, disconnected notion of "which POI is open".
 */
export function WorldPoiList() {
  const { t } = useTranslation();
  const open = useWorldExplorationStore((state) => state.poiListOpen);
  const setOpen = useWorldExplorationStore((state) => state.setPoiListOpen);
  const selectedPoiId = useWorldExplorationStore((state) => state.selectedPoiId);
  const selectPoi = useWorldExplorationStore((state) => state.selectPoi);
  const requestTeleport = useWorldExplorationStore((state) => state.requestTeleport);
  const pose = useWorldExplorationStore((state) => state.pose);
  const previousFocus = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      previousFocus.current?.focus();
    };
  }, [open, setOpen]);

  if (!open) return null;

  const [playerLon, playerLat] = worldToLatLon(pose.x, pose.z);

  return (
    <div className="onboarding-backdrop" role="presentation" onClick={() => setOpen(false)}>
      <section
        className="world-hud__poi-list"
        role="dialog"
        aria-modal="true"
        aria-labelledby="world-poi-list-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="world-hud__panel-header">
          <h2 id="world-poi-list-title">{t('worldExploration.poi.listTitle')}</h2>
          <button
            ref={closeButtonRef}
            type="button"
            className="world-hud__panel-close"
            aria-label={t('worldExploration.poi.listCloseLabel')}
            onClick={() => setOpen(false)}
          >
            ×
          </button>
        </div>
        <ul className="world-hud__poi-list-items">
          {worldPois.map((poi) => {
            const expanded = selectedPoiId === poi.id;
            const distanceMeters = haversineDistanceMeters([playerLon, playerLat], poi.coordinates);
            return (
              <li key={poi.id}>
                <button
                  type="button"
                  className="world-hud__poi-list-row"
                  aria-expanded={expanded}
                  onClick={() => selectPoi(expanded ? null : poi.id)}
                >
                  <span className="world-hud__poi-list-name">{poi.name}</span>
                  <span className="world-hud__poi-list-category">
                    {t(CATEGORY_MESSAGE_KEY[poi.category])}
                  </span>
                  <span className="world-hud__poi-list-distance">
                    {t('worldExploration.poi.distanceMeters', {
                      distance: formatDistanceMeters(distanceMeters),
                    })}
                  </span>
                </button>
                {expanded && (
                  <div className="world-hud__poi-list-detail">
                    <p>{poi.description}</p>
                    <a href={poi.sourceUrl} target="_blank" rel="noreferrer noopener">
                      {t('worldExploration.destination.sourceLabel')} {poi.sourceUrl}
                    </a>
                    <button
                      type="button"
                      className="world-hud__poi-list-teleport"
                      onClick={() => {
                        requestTeleport({ x: poi.world.x, z: poi.world.z });
                        setOpen(false);
                      }}
                    >
                      {t('worldExploration.poi.teleportToButton', { name: poi.name })}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
