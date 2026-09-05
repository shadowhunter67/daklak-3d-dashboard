import { useEffect, useState } from 'react';
import {
  applyFontScale,
  FONT_SCALE_STEPS,
  persistFontScale,
  resolveInitialFontScale,
  type FontScaleStep,
} from '../../a11y/fontScale';
import { useTranslation } from '../../i18n/useTranslation';
import type { MessageKey } from '../../i18n/messages';

const STEP_LABEL_KEY: Record<FontScaleStep, MessageKey> = {
  small: 'fontScale.small',
  default: 'fontScale.default',
  large: 'fontScale.large',
};

const STEP_GLYPH: Record<FontScaleStep, string> = {
  small: 'A-',
  default: 'A',
  large: 'A+',
};

/**
 * "A- / A / A+" text-size control (accessibility-first design pass, section D). Three discrete
 * steps rather than a continuous slider or a settings sub-page — visible directly in the header,
 * one tap/click to change, no menu to dig through. Applies `--user-font-scale` (see global.css's
 * `:root` comment for exactly which selectors respect it) and persists the choice the same way
 * the language switch persists locale (`src/i18n/locale.ts`), so a returning visitor keeps their
 * preferred size.
 */
export function FontScaleControl() {
  const { t } = useTranslation();
  const [step, setStep] = useState<FontScaleStep>(() => resolveInitialFontScale());

  useEffect(() => {
    applyFontScale(step);
  }, [step]);

  const selectStep = (next: FontScaleStep) => {
    setStep(next);
    persistFontScale(next);
  };

  return (
    <div className="font-scale-control" role="group" aria-label={t('fontScale.groupAriaLabel')}>
      {FONT_SCALE_STEPS.map((candidate) => (
        <button
          key={candidate}
          type="button"
          className="font-scale-control__button"
          aria-pressed={step === candidate}
          aria-label={t(STEP_LABEL_KEY[candidate])}
          title={t(STEP_LABEL_KEY[candidate])}
          onClick={() => selectStep(candidate)}
        >
          <span aria-hidden="true">{STEP_GLYPH[candidate]}</span>
        </button>
      ))}
    </div>
  );
}
