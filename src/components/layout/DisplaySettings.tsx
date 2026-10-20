import { useEffect, useRef, useState } from 'react';
import { captureProvenanceFocusTrigger } from '../provenance/provenanceFocusTrigger';
import { useMapStore } from '../../stores/mapStore';
import { useTranslation } from '../../i18n/useTranslation';
import { FontScaleControl } from './FontScaleControl';
import { SettingsIcon, ShareIcon } from './icons';

/**
 * "Cài đặt hiển thị" at the foot of the sidebar: the utilities that used to crowd the old header
 * (language, share link, data provenance, auto-update sources). Opens a popover above the button;
 * Escape or an outside click closes it and focus returns to the button.
 */
export function DisplaySettings({
  onAfterAction,
  autoOpen = false,
}: {
  onAfterAction?: () => void;
  /** Mở sẵn khung cài đặt (ngăn kéo menu trên điện thoại, nơi thanh đầu không còn chỗ cho cỡ chữ/ngôn ngữ). */
  autoOpen?: boolean;
}) {
  const { t, locale, setLocale } = useTranslation();
  const [open, setOpen] = useState(false);
  const [shareStatus, setShareStatus] = useState('');
  const shareTimer = useRef(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const openProvenancePanel = useMapStore((state) => state.openProvenancePanel);
  const openDataSourcesPanel = useMapStore((state) => state.openDataSourcesPanel);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (autoOpen) setOpen(true);
  }, [autoOpen]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  useEffect(() => () => window.clearTimeout(shareTimer.current), []);

  const share = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setShareStatus(t('header.share.status'));
      window.clearTimeout(shareTimer.current);
      shareTimer.current = window.setTimeout(() => setShareStatus(''), 2400);
    } catch {
      window.prompt(t('header.share.prompt'), url);
    }
  };

  return (
    <div className="display-settings" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="sidebar-link display-settings__trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <SettingsIcon />
        <span>{t('sidebar.settings')}</span>
      </button>
      {open && (
        <div className="display-settings__panel" role="dialog" aria-label={t('settings.title')}>
          <div className="display-settings__row">
            <span className="display-settings__label">{t('settings.language')}</span>
            <div
              className="header-lang-switch"
              role="group"
              aria-label={t('header.lang.ariaLabel')}
            >
              <button
                type="button"
                className="header-lang-button"
                aria-pressed={locale === 'vi'}
                aria-label={t('header.lang.viAriaLabel')}
                onClick={() => setLocale('vi')}
              >
                {t('header.lang.vi')}
              </button>
              <button
                type="button"
                className="header-lang-button"
                aria-pressed={locale === 'en'}
                aria-label={t('header.lang.enAriaLabel')}
                onClick={() => setLocale('en')}
              >
                {t('header.lang.en')}
              </button>
            </div>
          </div>
          {/* The topbar copy is hidden on narrow screens, so the same control lives here too. */}
          <div className="display-settings__font">
            <span className="display-settings__label">{t('settings.fontSize')}</span>
            <FontScaleControl />
          </div>
          <button
            type="button"
            className="display-settings__action"
            onClick={share}
            aria-label={t('header.share.ariaLabel')}
            title={t('header.share.title')}
          >
            <ShareIcon />
            <span>{t('settings.share')}</span>
          </button>
          <button
            id="open-data-provenance-panel"
            data-provenance-trigger="true"
            type="button"
            className="display-settings__action"
            aria-haspopup="dialog"
            aria-label={t('header.provenance.ariaLabel')}
            title={t('header.provenance.title')}
            onClick={(event) => {
              captureProvenanceFocusTrigger(event.currentTarget);
              setOpen(false);
              openProvenancePanel();
              onAfterAction?.();
            }}
          >
            {t('header.provenance.label')}
          </button>
          <button
            id="open-data-sources-panel"
            type="button"
            className="display-settings__action"
            aria-haspopup="true"
            aria-label={t('header.dataSources.ariaLabel')}
            title={t('header.dataSources.title')}
            onClick={() => {
              setOpen(false);
              openDataSourcesPanel();
              onAfterAction?.();
            }}
          >
            {t('header.dataSources.label')}
          </button>
          <p className="share-status" role="status" aria-live="polite">
            {shareStatus}
          </p>
        </div>
      )}
    </div>
  );
}
