import { useMapStore } from '../../stores/mapStore';
import { formatRelativeUpdatedAt } from './model/executiveOverviewSelectors';
import type { DataHealthSummary } from './model/executiveOverviewTypes';

const CONFIDENCE_LABELS: Record<string, string> = {
  verified: 'Đã xác thực',
  high: 'Cao',
  medium: 'Trung bình',
  low: 'Thấp',
  unknown: 'Chưa rõ',
};

export function DataHealthPanel({
  dataHealth,
  asOf,
}: {
  dataHealth: DataHealthSummary;
  asOf: Date;
}) {
  const openProvenancePanel = useMapStore((state) => state.openProvenancePanel);

  return (
    <section aria-labelledby="data-health-heading" className="data-health-panel">
      <h3 id="data-health-heading">Sức khỏe dữ liệu</h3>
      <dl className="data-health-panel__grid">
        <div>
          <dt>Bản ghi hợp lệ</dt>
          <dd>
            {dataHealth.validProjects} / {dataHealth.totalProjects}
          </dd>
        </div>
        <div>
          <dt>Bản ghi không hợp lệ</dt>
          <dd>{dataHealth.invalidProjects}</dd>
        </div>
        <div>
          <dt>Dữ liệu quá hạn cập nhật</dt>
          <dd>{dataHealth.staleProjectCount}</dd>
        </div>
        <div>
          <dt>Trùng lặp phát hiện được</dt>
          <dd>{dataHealth.duplicateRecordCount}</dd>
        </div>
        <div>
          <dt>Mã hành chính không xác định</dt>
          <dd>{dataHealth.unmappedAdministrativeCodeCount}</dd>
        </div>
        <div>
          <dt>Trạng thái nguồn dữ liệu</dt>
          <dd>{dataHealth.sourceAvailable ? 'Sẵn sàng' : 'Không sẵn sàng'}</dd>
        </div>
        <div>
          <dt>Cập nhật lần cuối</dt>
          <dd>{formatRelativeUpdatedAt(dataHealth.calculatedAt, asOf)}</dd>
        </div>
      </dl>
      <h3>Độ tin cậy dữ liệu</h3>
      <ul className="confidence-breakdown">
        {Object.entries(dataHealth.confidenceBreakdown)
          .filter(([, count]) => count > 0)
          .map(([confidence, count]) => (
            <li key={confidence}>
              {CONFIDENCE_LABELS[confidence] ?? confidence}: {count} dự án
            </li>
          ))}
      </ul>
      <button
        type="button"
        onClick={openProvenancePanel}
        className="data-health-panel__provenance-link"
      >
        Xem chi tiết nguồn dữ liệu
      </button>
    </section>
  );
}
