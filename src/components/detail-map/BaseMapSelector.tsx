import type { DetailBaseMap, DetailMapSourceAvailability } from './detailMapTypes';
import { useTranslation } from '../../i18n/useTranslation';
import type { MessageKey } from '../../i18n/messages';

const options: Array<{
  value: DetailBaseMap;
  labelKey: MessageKey;
  disabledReason?: keyof DetailMapSourceAvailability;
}> = [
  { value: 'default', labelKey: 'baseMap.default' },
  { value: 'terrain', labelKey: 'baseMap.terrain', disabledReason: 'terrain' },
  { value: 'satellite', labelKey: 'baseMap.satellite', disabledReason: 'satellite' },
];

export function BaseMapSelector({
  value,
  sourceAvailability,
  onChange,
}: {
  value: DetailBaseMap;
  sourceAvailability: DetailMapSourceAvailability;
  onChange: (baseMap: DetailBaseMap) => void;
}) {
  const { t } = useTranslation();
  return (
    <div role="radiogroup" aria-label={t('baseMap.aria')} className="detail-map-basemap-selector">
      {options.map((option) => {
        const disabled = Boolean(
          option.disabledReason && !sourceAvailability[option.disabledReason],
        );
        return (
          <label
            key={option.value}
            className={disabled ? 'basemap-option basemap-option--disabled' : 'basemap-option'}
            title={disabled ? t('baseMap.disabledReason') : undefined}
          >
            <input
              type="radio"
              name="detail-map-basemap"
              value={option.value}
              checked={value === option.value}
              disabled={disabled}
              onChange={() => onChange(option.value)}
              aria-describedby={disabled ? `basemap-${option.value}-disabled-reason` : undefined}
            />
            {t(option.labelKey)}
            {disabled && (
              <span id={`basemap-${option.value}-disabled-reason`} className="visually-hidden">
                {t('baseMap.disabledReason')}
              </span>
            )}
          </label>
        );
      })}
    </div>
  );
}
