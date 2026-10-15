import { useEffect, useState } from 'react';
import { applyTheme, persistTheme, resolveInitialTheme, type ThemeMode } from '../../a11y/theme';
import { useTranslation } from '../../i18n/useTranslation';
import type { MessageKey } from '../../i18n/messages';
import { MoonIcon, SunIcon } from './icons';

const MODE_LABEL_KEY: Record<ThemeMode, MessageKey> = {
  light: 'theme.light',
  dark: 'theme.dark',
};
const MODE_ARIA_KEY: Record<ThemeMode, MessageKey> = {
  light: 'theme.lightAriaLabel',
  dark: 'theme.darkAriaLabel',
};

/** "Sáng | Tối" switch. Two `aria-pressed` buttons (not a checkbox) so each state has its own
 * visible, speakable name — same convention as the language and font-size controls. */
export function ThemeToggle() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<ThemeMode>(() => resolveInitialTheme());

  useEffect(() => {
    applyTheme(mode);
  }, [mode]);

  const select = (next: ThemeMode) => {
    setMode(next);
    persistTheme(next);
  };

  return (
    <div className="theme-toggle" role="group" aria-label={t('theme.groupAriaLabel')}>
      {(['light', 'dark'] as const).map((candidate) => (
        <button
          key={candidate}
          type="button"
          className="theme-toggle__button"
          aria-pressed={mode === candidate}
          aria-label={t(MODE_ARIA_KEY[candidate])}
          onClick={() => select(candidate)}
        >
          {candidate === 'light' ? <SunIcon /> : <MoonIcon />}
          <span>{t(MODE_LABEL_KEY[candidate])}</span>
        </button>
      ))}
    </div>
  );
}
