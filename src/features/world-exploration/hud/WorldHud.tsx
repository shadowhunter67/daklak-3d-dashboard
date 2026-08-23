import { useTranslation } from '../../../i18n/useTranslation';
import { useWorldExplorationStore } from '../state/worldExplorationStore';
import { WorldModeSwitch } from './WorldModeSwitch';
import { WorldStatusBar } from './WorldStatusBar';
import { WorldPoiList } from './WorldPoiList';
import { WorldTeleportMenu } from './WorldTeleportMenu';
import { WorldTourControls } from './WorldTourControls';
import { WorldGuideDialog } from './WorldGuideDialog';
import { WorldTouchControls } from './WorldTouchControls';

/**
 * DOM-level HUD, mounted as a sibling of the R3F `<Canvas>` (see `WorldExplorationView.tsx`) —
 * not inside it. Every control here is a real HTML element (buttons, dialogs), satisfying the
 * task's "Canvas không được là cách duy nhất để truy cập thông tin" requirement structurally,
 * not just for the POI panel specifically. Layout sketch (task section 13):
 *
 * ```
 * [Walk] [Fly] [Tour]                  Compass
 *                                       POI gần nhất
 *                                       Cao độ / toạ độ
 * [Danh sách] [Di chuyển nhanh] [Trợ giúp]
 * ```
 */
export function WorldHud() {
  const { t } = useTranslation();
  const setPoiListOpen = useWorldExplorationStore((state) => state.setPoiListOpen);
  const setTeleportMenuOpen = useWorldExplorationStore((state) => state.setTeleportMenuOpen);
  const setOnboardingOpen = useWorldExplorationStore((state) => state.setOnboardingOpen);

  return (
    <div className="world-hud">
      <div className="world-hud__top-left">
        <WorldModeSwitch />
      </div>
      <div className="world-hud__top-right">
        <WorldStatusBar />
      </div>
      <div className="world-hud__bottom-center">
        <WorldTourControls />
      </div>
      <div className="world-hud__bottom-left">
        <button type="button" onClick={() => setPoiListOpen(true)}>
          {t('worldExploration.hud.poiListButton')}
        </button>
        <button type="button" onClick={() => setTeleportMenuOpen(true)}>
          {t('worldExploration.hud.teleportButton')}
        </button>
        <button
          type="button"
          aria-label={t('worldExploration.hud.helpButtonAria')}
          onClick={() => setOnboardingOpen(true)}
        >
          {t('worldExploration.hud.helpButton')}
        </button>
      </div>

      <WorldPoiList />
      <WorldTeleportMenu />
      <WorldGuideDialog />
      <WorldTouchControls />
    </div>
  );
}
