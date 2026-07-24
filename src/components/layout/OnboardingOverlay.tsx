import { useEffect, useRef, useState } from 'react';
import { useMapStore } from '../../stores/mapStore';
import { useTranslation } from '../../i18n/useTranslation';

const STORAGE_KEY = 'daklak-dashboard:onboarding-dismissed';

function hasSeenOnboarding() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function OnboardingOverlay() {
  const { t } = useTranslation();
  // Executive Overview (Phase 2A default landing) has no map gestures to explain — the auto-shown
  // first-visit tour only makes sense once someone has actually opened a map experience. The `?`
  // help button still opens it unconditionally from any view (see the helpSignal effect below).
  const [open, setOpen] = useState(
    () => !hasSeenOnboarding() && useMapStore.getState().viewMode !== 'overview',
  );
  const previousFocus = useRef<HTMLElement | null>(null);
  const helpSignal = useMapStore((state) => state.helpSignal);
  const viewMode = useMapStore((state) => state.viewMode);
  const isDetailMap = viewMode === 'map';
  const previousHelpSignal = useRef(helpSignal);

  const dismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // Private browsing can disable storage; dismissal still works for this session.
    }
    setOpen(false);
    requestAnimationFrame(() => {
      const target = previousFocus.current?.isConnected
        ? previousFocus.current
        : document.getElementById('map-viewport');
      target?.focus();
    });
  };

  useEffect(() => {
    if (previousHelpSignal.current === helpSignal) return;
    previousHelpSignal.current = helpSignal;
    previousFocus.current = document.activeElement as HTMLElement | null;
    setOpen(true);
  }, [helpSignal]);

  useEffect(() => {
    if (!open) return;
    const closeWithKeyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', closeWithKeyboard);
    return () => window.removeEventListener('keydown', closeWithKeyboard);
  }, [open]);

  if (!open) return null;

  return (
    <div className="onboarding-backdrop" role="presentation">
      <section
        className="onboarding-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
      >
        <p className="eyebrow">{t('onboarding.eyebrow')}</p>
        <h2 id="onboarding-title">
          {isDetailMap ? t('onboarding.headingDetailMap') : t('onboarding.headingInteractiveMap')}
        </h2>
        <p>{t('onboarding.body')}</p>
        {isDetailMap ? (
          <ul>
            <li>
              <strong>{t('onboarding.dragAction')}</strong> {t('onboarding.dragToPan')}
            </li>
            <li>
              <strong>{t('onboarding.scrollAction')}</strong> {t('onboarding.scrollToZoom')}
            </li>
            <li>
              <strong>{t('onboarding.layersAction')}</strong> {t('onboarding.layersToToggle')}
            </li>
          </ul>
        ) : (
          <ul>
            <li>
              <strong>{t('onboarding.dragAction')}</strong> {t('onboarding.dragToRotate')}
            </li>
            <li>
              <strong>{t('onboarding.scrollAction')}</strong> {t('onboarding.scrollToZoom')}
            </li>
            <li>
              <strong>{t('onboarding.tapAction')}</strong> {t('onboarding.tapForDetail')}
            </li>
          </ul>
        )}
        <button type="button" autoFocus onClick={dismiss}>
          {t('onboarding.start')}
        </button>
        <small>{t('onboarding.disclaimer')}</small>
      </section>
    </div>
  );
}
