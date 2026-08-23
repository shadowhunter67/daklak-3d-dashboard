import { useEffect, useRef } from 'react';
import { useTranslation } from '../../../i18n/useTranslation';
import { useWorldExplorationStore } from '../state/worldExplorationStore';

const STORAGE_KEY = 'daklak-dashboard:world-onboarding-dismissed';

function hasSeenOnboarding(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * World-exploration's own first-time onboarding, deliberately separate from
 * `OnboardingOverlay.tsx` — that component explicitly excludes `'world'` from both its auto-open
 * and manual-help paths (see its doc comment) precisely because neither of its two copy variants
 * (detail-map / admin-boundary gestures) describes this scene's actual controls. Reuses the same
 * `.onboarding-backdrop`/`.onboarding-card` styling for visual consistency with the rest of the
 * app, with its own storage key so dismissing one onboarding never dismisses the other.
 *
 * Doubles as the manual "Help" dialog (`worldExploration.hud.helpButton`) — unlike
 * `OnboardingOverlay.tsx`, there is only one copy variant here, so there is no need for that
 * component's helpSignal-vs-view-mode branching; any caller can simply call
 * `setOnboardingOpen(true)`.
 */
export function WorldGuideDialog() {
  const { t } = useTranslation();
  const open = useWorldExplorationStore((state) => state.onboardingOpen);
  const setOpen = useWorldExplorationStore((state) => state.setOnboardingOpen);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!hasSeenOnboarding()) setOpen(true);
    // Runs once on mount only — a later `onboardingOpen` toggle (e.g. the manual Help button)
    // must not be overridden by this first-time check re-running.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // Private browsing can disable storage; dismissal still works for this session.
    }
    setOpen(false);
    requestAnimationFrame(() => {
      if (previousFocus.current?.isConnected) previousFocus.current.focus();
    });
  };

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement | null;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  return (
    <div className="onboarding-backdrop" role="presentation">
      <section
        className="onboarding-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="world-guide-title"
      >
        <h2 id="world-guide-title">{t('worldExploration.onboarding.title')}</h2>
        <p>{t('worldExploration.onboarding.body')}</p>
        <ul>
          <li>{t('worldExploration.onboarding.walkHint')}</li>
          <li>{t('worldExploration.onboarding.flyHint')}</li>
          <li>{t('worldExploration.onboarding.interactHint')}</li>
          <li>{t('worldExploration.onboarding.escapeHint')}</li>
        </ul>
        <button type="button" autoFocus onClick={dismiss}>
          {t('worldExploration.onboarding.startButton')}
        </button>
      </section>
    </div>
  );
}
