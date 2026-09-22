import { useEffect, useRef } from 'react';
import { useMapStore } from '../../stores/mapStore';
import { useTranslation } from '../../i18n/useTranslation';
import { captureProvenanceFocusTrigger } from '../provenance/provenanceFocusTrigger';
import { consumeAboutFocusTrigger, isFocusable } from './aboutFocusTrigger';

const GITHUB_REPO_URL = 'https://github.com/shadowhunter67/daklak-3d-dashboard';
const GITHUB_ISSUES_URL = `${GITHUB_REPO_URL}/issues`;

/** Same DOM-order focusable set as `DataProvenancePanel` (this dialog has no `<summary>`
 * disclosures, but the selector stays identical for consistency). */
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

/**
 * Project identity/attribution dialog — GitHub link, issue tracker, and the "independent
 * project, not an official government product" disclaimer. Mounted by App.tsx only while
 * `aboutPanelOpen` is true (see mapStore.ts), same mount-IS-open/unmount-IS-closed lazy-boundary
 * pattern as `DataProvenancePanel`.
 *
 * The "data sources" link here does not duplicate `DataProvenancePanel`'s content — it closes
 * this dialog and opens that one, since `header.provenance.label` ("Nguồn dữ liệu") already names
 * that exact panel.
 */
export function AboutPanel() {
  const { t } = useTranslation();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeAboutPanel = useMapStore((state) => state.closeAboutPanel);
  const openProvenancePanel = useMapStore((state) => state.openProvenancePanel);

  useEffect(() => {
    const previouslyFocused = consumeAboutFocusTrigger();
    return () => {
      const footerFallback = document.getElementById('open-about-panel');
      const target = isFocusable(previouslyFocused)
        ? previouslyFocused
        : isFocusable(footerFallback)
          ? footerFallback
          : null;
      target?.focus();
    };
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeAboutPanel();
        return;
      }
      if (event.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [closeAboutPanel]);

  return (
    <div
      className="provenance-panel-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) closeAboutPanel();
      }}
    >
      <section
        className="provenance-panel-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-panel-title"
        ref={panelRef}
      >
        <div className="provenance-panel-header">
          <h2 id="about-panel-title">{t('about.panelHeading')}</h2>
          <button
            type="button"
            className="dialog-close"
            autoFocus
            onClick={closeAboutPanel}
            aria-label={t('about.closeAria')}
          >
            {t('about.close')}
          </button>
        </div>
        <p className="about-panel-tagline">{t('about.tagline')}</p>
        <p className="about-panel-disclaimer">{t('about.disclaimer')}</p>
        <nav aria-label={t('about.linksAriaLabel')} className="about-panel-links">
          <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
          <a href={GITHUB_ISSUES_URL} target="_blank" rel="noopener noreferrer">
            {t('about.issuesLink')}
          </a>
          <button
            type="button"
            className="about-panel-link-button"
            aria-haspopup="dialog"
            onClick={(event) => {
              captureProvenanceFocusTrigger(event.currentTarget);
              closeAboutPanel();
              openProvenancePanel();
            }}
          >
            {t('about.dataSourcesLink')}
          </button>
        </nav>
        <p className="about-panel-copyright">{t('about.copyright')}</p>
      </section>
    </div>
  );
}
