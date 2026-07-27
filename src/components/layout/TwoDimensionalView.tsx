import { useState } from 'react';
import { AccessibleDirectory } from '../dashboard/AccessibleDirectory';
import { AdministrativeMap2D } from '../map/AdministrativeMap2D';
import { useTranslation } from '../../i18n/useTranslation';

export function TwoDimensionalView() {
  const { t } = useTranslation();
  const [mobilePane, setMobilePane] = useState<'map' | 'directory'>('map');
  return (
    <div className={`two-dimensional-view two-dimensional-view--${mobilePane}`}>
      <div
        className="two-dimensional-view__switch"
        role="group"
        aria-label={t('twoDView.switchAria')}
      >
        <button
          type="button"
          aria-pressed={mobilePane === 'map'}
          onClick={() => setMobilePane('map')}
        >
          {t('twoDView.mapTab')}
        </button>
        <button
          type="button"
          aria-pressed={mobilePane === 'directory'}
          onClick={() => setMobilePane('directory')}
        >
          {t('twoDView.directoryTab')}
        </button>
      </div>
      <AdministrativeMap2D />
      <AccessibleDirectory />
    </div>
  );
}
