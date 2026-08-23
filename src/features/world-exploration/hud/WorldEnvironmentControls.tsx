import { useTranslation } from '../../../i18n/useTranslation';
import type { MessageKey } from '../../../i18n/messages';
import { useWorldExplorationStore } from '../state/worldExplorationStore';
import { LIGHTING_PRESET_IDS, type LightingPresetId } from '../environment/lightingPresets';

/**
 * Phase T4 (reports/tourism-digital-twin/) — a real, keyboard-reachable `<button>` group (not
 * canvas-drawn) letting a viewer pick the illustrative lighting mood (`environment/
 * lightingPresets.ts`). Same accessibility convention every other HUD control already
 * follows (`WorldHud.tsx`'s doc comment) — `aria-pressed` marks the active preset.
 */
const PRESET_LABEL_KEY: Record<LightingPresetId, MessageKey> = {
  dawn: 'worldExploration.environment.dawn',
  day: 'worldExploration.environment.day',
  sunset: 'worldExploration.environment.sunset',
};

export function WorldEnvironmentControls() {
  const { t } = useTranslation();
  const lightingPreset = useWorldExplorationStore((state) => state.lightingPreset);
  const setLightingPreset = useWorldExplorationStore((state) => state.setLightingPreset);

  return (
    <div
      className="world-hud__environment-controls"
      role="group"
      aria-label={t('worldExploration.environment.groupLabel')}
    >
      {LIGHTING_PRESET_IDS.map((preset) => {
        const label = t(PRESET_LABEL_KEY[preset]);
        return (
          <button
            key={preset}
            type="button"
            aria-pressed={lightingPreset === preset}
            aria-label={t('worldExploration.environment.presetButtonAria', { preset: label })}
            onClick={() => setLightingPreset(preset)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
