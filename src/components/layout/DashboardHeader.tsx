import { useRef, useState } from 'react';
import { datasetManifest } from '../../data/datasetManifest';
import { useMapStore } from '../../stores/mapStore';

const modes = [
  ['overview', 'Tổng quan'],
  ['energy', 'Năng lượng'],
  ['heatmap', 'Heatmap'],
] as const;

// Primary navigation (Phase 2A): the four mutually-exclusive top-level experiences. Distinct from
// the `modes` thematic tabs above (which only apply within the 3D/2D map experiences) and from the
// quick-toggle buttons further down (kept unchanged for existing keyboard muscle-memory/tests).
// Label is "Tổng quan điều hành" (not "Tổng quan") specifically to avoid an accessible-name clash
// with the `modes` data-mode tab of the same literal text — the two are unrelated concepts
// (top-level view vs. 3D thematic overlay) and must resolve unambiguously by role+name in tests.
const primaryViews = [
  ['overview', 'Tổng quan điều hành'],
  ['3d', '3D'],
  ['table', 'Danh sách'],
  ['map', 'Bản đồ chi tiết'],
] as const;

export function DashboardHeader() {
  const [shareStatus, setShareStatus] = useState('');
  const shareTimer = useRef(0);
  const shareDashboard = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setShareStatus('Đã sao chép liên kết');
      window.clearTimeout(shareTimer.current);
      shareTimer.current = window.setTimeout(() => setShareStatus(''), 2400);
    } catch {
      window.prompt('Sao chép liên kết này:', url);
    }
  };
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
  const requestCameraReset = useMapStore((state) => state.requestCameraReset);
  const requestHelp = useMapStore((state) => state.requestHelp);
  const openProvenancePanel = useMapStore((state) => state.openProvenancePanel);

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
      <span className="header-mock-badge" role="note">
        DỮ LIỆU MINH HỌA
      </span>
      <nav className="primary-nav" aria-label="Điều hướng chính">
        {primaryViews.map(([mode, label]) => (
          <button
            key={mode}
            className={viewMode === mode ? 'active' : ''}
            aria-current={viewMode === mode ? 'page' : undefined}
            onClick={() => setViewMode(mode)}
          >
            {label}
          </button>
        ))}
      </nav>
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
          onClick={() => setViewMode('overview')}
          aria-pressed={viewMode === 'overview'}
          aria-label="Mở tổng quan điều hành"
        >
          <span className="control-label control-label--desktop">Tổng quan điều hành</span>
          <span className="control-label control-label--mobile" aria-hidden="true">
            Tổng quan
          </span>
        </button>
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
          onClick={() => setViewMode(viewMode === 'map' ? '3d' : 'map')}
          aria-pressed={viewMode === 'map'}
          aria-label={viewMode === 'map' ? 'Thoát bản đồ chi tiết' : 'Mở bản đồ chi tiết'}
        >
          <span className="control-label control-label--desktop">
            {viewMode === 'map' ? 'Thoát bản đồ chi tiết' : 'Bản đồ chi tiết'}
          </span>
          <span className="control-label control-label--mobile" aria-hidden="true">
            Chi tiết
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
        <button
          className="header-secondary-control"
          onClick={requestCameraReset}
          aria-label="Đưa camera về toàn tỉnh"
          title="Đưa camera về toàn tỉnh"
        >
          Toàn tỉnh
        </button>
        <button
          className="header-secondary-control"
          onClick={shareDashboard}
          aria-label="Sao chép liên kết trạng thái hiện tại"
          title="Sao chép liên kết"
        >
          Chia sẻ
        </button>
        <button
          className="header-secondary-control header-help-control"
          onClick={requestHelp}
          aria-label="Mở hướng dẫn sử dụng"
          title="Hướng dẫn sử dụng"
        >
          ?
        </button>
        <button
          id="open-data-provenance-panel"
          className="header-secondary-control"
          aria-haspopup="dialog"
          onClick={openProvenancePanel}
          aria-label="Xem nguồn và chất lượng dữ liệu"
          title="Nguồn dữ liệu"
        >
          Nguồn dữ liệu
        </button>
      </div>
      <span className="share-status" role="status" aria-live="polite">
        {shareStatus}
      </span>
    </header>
  );
}
