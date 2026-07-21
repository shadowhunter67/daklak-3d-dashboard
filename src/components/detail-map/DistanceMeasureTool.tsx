import {
  formatMeasurementDistance,
  totalMeasurementDistanceMeters,
  type MeasurementPoint,
} from './distanceMeasurement';

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
  const totalDistance = totalMeasurementDistanceMeters(points);
  return (
    <div className="distance-measure-tool">
      <button type="button" aria-pressed={active} onClick={onToggle}>
        {active ? 'Thoát đo khoảng cách' : 'Đo khoảng cách'}
      </button>
      {active && (
        <div className="distance-measure-tool__panel">
          <p id="distance-measure-instructions">
            Chạm vào bản đồ để thêm điểm đo. Nhấn Escape để thoát.
          </p>
          <p role="status" aria-live="polite">
            {points.length < 2
              ? 'Chưa đủ điểm để tính khoảng cách.'
              : `Tổng khoảng cách: ${formatMeasurementDistance(totalDistance)}`}
          </p>
          <div className="distance-measure-tool__actions">
            <button type="button" onClick={onUndo} disabled={points.length === 0}>
              Hoàn tác điểm cuối
            </button>
            <button type="button" onClick={onClear} disabled={points.length === 0}>
              Xóa toàn bộ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
