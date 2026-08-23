import { useTranslation } from '../../../i18n/useTranslation';
import {
  useWorldExplorationStore,
  type WorldExplorationMode,
} from '../state/worldExplorationStore';

const MODES: {
  mode: WorldExplorationMode;
  labelKey:
    'worldExploration.mode.walk' | 'worldExploration.mode.fly' | 'worldExploration.mode.tour';
  ariaKey:
    | 'worldExploration.mode.walkAria'
    | 'worldExploration.mode.flyAria'
    | 'worldExploration.mode.tourAria';
}[] = [
  {
    mode: 'walk',
    labelKey: 'worldExploration.mode.walk',
    ariaKey: 'worldExploration.mode.walkAria',
  },
  { mode: 'fly', labelKey: 'worldExploration.mode.fly', ariaKey: 'worldExploration.mode.flyAria' },
  {
    mode: 'tour',
    labelKey: 'worldExploration.mode.tour',
    ariaKey: 'worldExploration.mode.tourAria',
  },
];

/**
 * `[Walk] [Fly] [Tour]` — the HUD sketch's top-left control (task section 13). Selecting "Tour"
 * switches `mode` to `'tour'` but does NOT itself start playback (there is no tour picked yet) —
 * `WorldTeleportMenu.tsx`'s tour section is where a specific tour actually starts; landing on an
 * empty/idle tour mode from here just stops Walk/Fly input and waits, matching "chọn Tour trước,
 * chọn tuyến sau" rather than silently guessing a default tour.
 */
export function WorldModeSwitch() {
  const { t } = useTranslation();
  const mode = useWorldExplorationStore((state) => state.mode);
  const setMode = useWorldExplorationStore((state) => state.setMode);
  const setTeleportMenuOpen = useWorldExplorationStore((state) => state.setTeleportMenuOpen);

  return (
    <div
      className="world-hud__mode-switch"
      role="group"
      aria-label={t('worldExploration.mode.groupAria')}
    >
      {MODES.map(({ mode: candidate, labelKey, ariaKey }) => (
        <button
          key={candidate}
          type="button"
          className={`world-hud__mode-button${mode === candidate ? ' world-hud__mode-button--active' : ''}`}
          aria-pressed={mode === candidate}
          aria-label={t(ariaKey)}
          onClick={() => {
            setMode(candidate);
            if (candidate === 'tour') setTeleportMenuOpen(true);
          }}
        >
          {t(labelKey)}
        </button>
      ))}
    </div>
  );
}
