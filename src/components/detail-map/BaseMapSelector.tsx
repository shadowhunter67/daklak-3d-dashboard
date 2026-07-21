import type { DetailBaseMap, DetailMapSourceAvailability } from './detailMapTypes';

const options: Array<{
  value: DetailBaseMap;
  label: string;
  disabledReason?: keyof DetailMapSourceAvailability;
}> = [
  { value: 'default', label: 'Mặc định' },
  { value: 'terrain', label: 'Địa hình', disabledReason: 'terrain' },
  { value: 'satellite', label: 'Vệ tinh', disabledReason: 'satellite' },
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
  return (
    <div role="radiogroup" aria-label="Loại bản đồ" className="detail-map-basemap-selector">
      {options.map((option) => {
        const disabled = Boolean(
          option.disabledReason && !sourceAvailability[option.disabledReason],
        );
        return (
          <label
            key={option.value}
            className={disabled ? 'basemap-option basemap-option--disabled' : 'basemap-option'}
            title={disabled ? 'Chưa cấu hình nguồn dữ liệu cho loại bản đồ này' : undefined}
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
            {option.label}
            {disabled && (
              <span id={`basemap-${option.value}-disabled-reason`} className="visually-hidden">
                Chưa cấu hình nguồn dữ liệu cho loại bản đồ này
              </span>
            )}
          </label>
        );
      })}
    </div>
  );
}
