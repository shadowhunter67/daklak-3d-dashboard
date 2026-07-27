import {
  formatMeasurementDistance,
  totalMeasurementDistanceMeters,
  type MeasurementPoint,
} from './distanceMeasurement';
import { useTranslation } from '../../i18n/useTranslation';

export function DistanceMeasureTool({
  active,
  points,
  onToggle,
  onUndo,
  onClear,
}: {
  active: boolean;
  points: readonly MeasurementPoint[];
  onToggle: () => void;
  onUndo: () => void;
  onClear: () => void;
}) {
  const { t } = useTranslation();
  const totalDistance = totalMeasurementDistanceMeters(points);
  return (
    <div className="distance-measure-tool">
      <button type="button" aria-pressed={active} onClick={onToggle}>
        {active ? t('distanceMeasure.exit') : t('distanceMeasure.start')}
      </button>
      {active && (
        <div className="distance-measure-tool__panel">
          <p id="distance-measure-instructions">{t('distanceMeasure.instructions')}</p>
          <p role="status" aria-live="polite">
            {points.length < 2
              ? t('distanceMeasure.notEnoughPoints')
              : t('distanceMeasure.totalDistance', {
                  distance: formatMeasurementDistance(totalDistance),
                })}
          </p>
          <div className="distance-measure-tool__actions">
            <button type="button" onClick={onUndo} disabled={points.length === 0}>
              {t('distanceMeasure.undoLast')}
            </button>
            <button type="button" onClick={onClear} disabled={points.length === 0}>
              {t('distanceMeasure.clearAll')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
