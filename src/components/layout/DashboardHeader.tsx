import { datasetManifest } from '../../data/datasetManifest';
import { useMapStore } from '../../stores/mapStore';

const modes = [
  ['overview', 'Tổng quan'],
  ['energy', 'Năng lượng'],
  ['heatmap', 'Heatmap'],
] as const;

export function DashboardHeader() {
  const dataMode = useMapStore((state) => state.dataMode);
  const viewMode = useMapStore((state) => state.viewMode);
  const labelsVisible = useMapStore((state) => state.labelsVisible);
  const roadsVisible = useMapStore((state) => state.roadsVisible);
  const autoRotate = useMapStore((state) => state.autoRotate);
  const reducedMotion = useMapStore((state) => state.reducedMotion);
  const changeDataMode = useMapStore((state) => state.changeDataMode);
  const setViewMode = useMapStore((state) => state.setViewMode);
  const toggleLabels = useMapStore((state) => state.toggleLabels);
  const toggleRoads = useMapStore((state) => state.toggleRoads);
  const toggleAutoRotate = useMapStore((state) => state.toggleAutoRotate);

  return (
    <header className="dashboard-header">
      <div className="dashboard-brand">
        <div className="brand-mark">ĐL</div>
        <div>
          <p className="eyebrow">BẢN ĐỒ HÀNH CHÍNH TƯƠNG TÁC</p>
          <h1>
            ĐẮK LẮK <i>3D</i>
          </h1>
        </div>
      </div>
      <nav className="mode-tabs" aria-label="Chế độ dữ liệu">
        {modes.map(([mode, label]) => (
          <button
            key={mode}
            className={dataMode === mode ? 'active' : ''}
            aria-pressed={dataMode === mode}
            onClick={() => changeDataMode(mode)}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="header-meta">
        <span>{datasetManifest.administrativeUnitCount} xã/phường</span>
        <button
          onClick={() => setViewMode(viewMode === '3d' ? 'table' : '3d')}
          aria-pressed={viewMode === 'table'}
          aria-label={viewMode === '3d' ? 'Mở danh sách 2D' : 'Mở bản đồ 3D'}
        >
          <span className="control-label control-label--desktop">
            {viewMode === '3d' ? 'Danh sách 2D' : 'Bản đồ 3D'}
          </span>
          <span className="control-label control-label--mobile" aria-hidden="true">
            {viewMode === '3d' ? '2D' : '3D'}
          </span>
        </button>
        <button
          onClick={toggleAutoRotate}
          aria-pressed={autoRotate}
          disabled={reducedMotion}
          aria-label={
            reducedMotion ? 'Đã giảm chuyển động' : autoRotate ? 'Dừng xoay' : 'Xoay bản đồ'
          }
          title={reducedMotion ? 'Đã tắt do tùy chọn giảm chuyển động' : 'Xoay bản đồ 360 độ'}
        >
          <span className="control-label control-label--desktop">
            {reducedMotion ? 'Đã giảm chuyển động' : autoRotate ? 'Dừng xoay' : 'Xoay 360°'}
          </span>
          <span className="control-label control-label--mobile" aria-hidden="true">
            Xoay
          </span>
        </button>
        <button
          onClick={toggleRoads}
          aria-pressed={roadsVisible}
          aria-label={roadsVisible ? 'Ẩn lớp đường giao thông' : 'Hiện lớp đường giao thông'}
        >
          <span className="control-label control-label--desktop">
            {roadsVisible ? 'Ẩn' : 'Hiện'} đường
          </span>
          <span className="control-label control-label--mobile" aria-hidden="true">
            Đường
          </span>
        </button>
        <button
          onClick={toggleLabels}
          aria-pressed={labelsVisible}
          aria-label={labelsVisible ? 'Ẩn nhãn trung tâm' : 'Hiện nhãn trung tâm'}
        >
          <span className="control-label control-label--desktop">
            {labelsVisible ? 'Ẩn' : 'Hiện'} nhãn trung tâm
          </span>
          <span className="control-label control-label--mobile" aria-hidden="true">
            Nhãn
          </span>
        </button>
      </div>
    </header>
  );
}
