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
  const autoRotate = useMapStore((state) => state.autoRotate);
  const reducedMotion = useMapStore((state) => state.reducedMotion);
  const changeDataMode = useMapStore((state) => state.changeDataMode);
  const setViewMode = useMapStore((state) => state.setViewMode);
  const toggleLabels = useMapStore((state) => state.toggleLabels);
  const toggleAutoRotate = useMapStore((state) => state.toggleAutoRotate);

  return (
    <header>
      <div className="brand-mark">ĐL</div>
      <div>
        <p className="eyebrow">BẢN ĐỒ HÀNH CHÍNH TƯƠNG TÁC</p>
        <h1>
          ĐẮK LẮK <i>3D</i>
        </h1>
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
        >
          {viewMode === '3d' ? 'Danh sách 2D' : 'Bản đồ 3D'}
        </button>
        <button
          onClick={toggleAutoRotate}
          aria-pressed={autoRotate}
          disabled={reducedMotion}
          title={reducedMotion ? 'Đã tắt do tùy chọn giảm chuyển động' : 'Xoay bản đồ 360 độ'}
        >
          {reducedMotion ? 'Đã giảm chuyển động' : autoRotate ? 'Dừng xoay' : 'Xoay 360°'}
        </button>
        <button onClick={toggleLabels} aria-pressed={labelsVisible}>
          {labelsVisible ? 'Ẩn' : 'Hiện'} nhãn trung tâm
        </button>
      </div>
    </header>
  );
}
