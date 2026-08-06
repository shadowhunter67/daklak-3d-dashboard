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

// Phase T1 (reports/tourism-digital-twin/) bugfix: this overlay only ever had two content
// variants — the detail-map (`isDetailMap`) gestures and the admin-boundary "drag to rotate / tap
// for detail" gestures used by every other view. `?view=world` (added in Phase T1) fell into that
// second bucket by default, so a first-time visitor landing on the illustrative world scene got
// this dialog auto-popped on top of it with copy about "102 xã, phường" (administrative units) and
// admin-boundary tap/rotate gestures that don't describe the world scene at all — a real
// production bug (see reports/tourism-digital-twin/phase-status.md, "Post-merge fix"). `world` has
// no gesture copy of its own yet (its camera is a simpler fixed-range orbit — see
// WorldFlyInCamera.tsx — with no pan and no keyboard control, unlike either existing variant here),
// so rather than writing new copy that would need its own verification, `world` is fully decoupled
// from this shared overlay for now: it is treated like `overview` for the auto-open condition
// below, AND (unlike `overview`, whose manual-help behavior is pre-existing and intentionally left
// unchanged — see OnboardingOverlay.test.tsx) it is also excluded from the manual "?" help-control
// path, since neither existing copy variant is honest for the world scene's actual controls. A
// world-specific tour is a reasonable T2+ addition once its own copy is written deliberately.
const VIEWS_WITHOUT_ONBOARDING = new Set(['overview', 'world']);

export function OnboardingOverlay() {
  const { t } = useTranslation();
  // Executive Overview (Phase 2A default landing) and World Exploration (Phase T1) have no
  // onboarding copy that correctly describes them — the auto-shown first-visit tour only makes
  // sense once someone has actually opened a view this dialog's copy was written for. The `?` help
  // button still opens it unconditionally from `overview` (pre-existing, tested behavior — see
  // OnboardingOverlay.test.tsx) but not from `world` (see helpSignal effect below).
  const [open, setOpen] = useState(
    () => !hasSeenOnboarding() && !VIEWS_WITHOUT_ONBOARDING.has(useMapStore.getState().viewMode),
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
    // Unlike `overview` (pre-existing behavior, intentionally unchanged — the manual "?" control
    // still opens this dialog there, see OnboardingOverlay.test.tsx), `world` has no honest content
    // variant here at all (see VIEWS_WITHOUT_ONBOARDING's doc comment above), so the manual help
    // control is a no-op on that view rather than showing the wrong view's gestures. Computed as
    // the argument to the same single setOpen(...) call the original effect already ended with
    // (rather than an extra branch/early-return in the effect body) to keep this effect's shape —
    // one ref-diff guard, then one direct setState call — the shape `react-hooks/set-state-in-effect`
    // recognizes as the intentional "respond to an external signal" idiom already used throughout
    // this file, rather than one it flags as an avoidable cascading-render risk.
    setOpen(useMapStore.getState().viewMode !== 'world');
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
