import { useEffect, useRef } from 'react';
import { useTranslation } from '../../../i18n/useTranslation';
import { worldPois } from '../poi/worldPoi';
import { worldTours } from '../tours/worldTours';
import { useWorldExplorationStore } from '../state/worldExplorationStore';

/**
 * "Teleport" HUD button's menu (task section 15) — destinations to jump straight to, and guided
 * tours to start. Also what `WorldModeSwitch.tsx` opens when the user picks "Tour" (there is no
 * tour running yet at that point, so this is where they actually choose one).
 */
export function WorldTeleportMenu() {
  const { t } = useTranslation();
  const open = useWorldExplorationStore((state) => state.teleportMenuOpen);
  const setOpen = useWorldExplorationStore((state) => state.setTeleportMenuOpen);
  const requestTeleport = useWorldExplorationStore((state) => state.requestTeleport);
  const mode = useWorldExplorationStore((state) => state.mode);
  const setMode = useWorldExplorationStore((state) => state.setMode);
  const startTour = useWorldExplorationStore((state) => state.startTour);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

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

  return (
    <div className="onboarding-backdrop" role="presentation" onClick={() => setOpen(false)}>
      <section
        className="world-hud__teleport-menu"
        role="dialog"
        aria-modal="true"
        aria-labelledby="world-teleport-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="world-hud__panel-header">
          <h2 id="world-teleport-title">{t('worldExploration.teleport.menuTitle')}</h2>
          <button
            ref={closeButtonRef}
            type="button"
            className="world-hud__panel-close"
            aria-label={t('worldExploration.teleport.menuCloseLabel')}
            onClick={() => setOpen(false)}
          >
            ×
          </button>
        </div>

        <h3>{t('worldExploration.teleport.poiSectionTitle')}</h3>
        <ul className="world-hud__teleport-list">
          {worldPois.map((poi) => (
            <li key={poi.id}>
              <button
                type="button"
                onClick={() => {
                  if (mode === 'tour') setMode('fly');
                  requestTeleport({ x: poi.world.x, z: poi.world.z });
                  setOpen(false);
                }}
              >
                {t('worldExploration.poi.teleportToButton', { name: poi.name })}
              </button>
            </li>
          ))}
        </ul>

        <h3>{t('worldExploration.teleport.tourSectionTitle')}</h3>
        <ul className="world-hud__teleport-list">
          {worldTours.map((tour) => (
            <li key={tour.id}>
              <button
                type="button"
                onClick={() => {
                  startTour(tour.id);
                  setOpen(false);
                }}
              >
                {t('worldExploration.tour.startButton', { title: t(tour.titleKey) })}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
