import { AdministrativeMap } from './components/map/AdministrativeMap';
import { DetailPanel } from './components/dashboard/DetailPanel';
import { StatPanel } from './components/dashboard/StatPanel';
import { AccessibleDirectory } from './components/dashboard/AccessibleDirectory';
import { useMapStore } from './stores/mapStore';
import { datasetManifest, datasetManifestIssues, formatSnapshotDate } from './data/datasetManifest';
import { useEffect, useState } from 'react';
export default function App() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const toggle = useMapStore((s) => s.toggleLabels),
    visible = useMapStore((s) => s.labelsVisible),
    autoRotate = useMapStore((s) => s.autoRotate),
    toggleAutoRotate = useMapStore((s) => s.toggleAutoRotate),
    dataMode = useMapStore((s) => s.dataMode),
    changeDataMode = useMapStore((s) => s.changeDataMode),
    viewMode = useMapStore((s) => s.viewMode),
    setViewMode = useMapStore((s) => s.setViewMode);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      setReducedMotion(media.matches);
      if (media.matches && useMapStore.getState().autoRotate)
        useMapStore.setState({ autoRotate: false });
    };
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  if (datasetManifestIssues.length) {
    return (
      <main className="app-fallback" role="alert">
        <h1>Dữ liệu cấu hình không hợp lệ</h1>
        <p>{datasetManifestIssues.join('. ')}</p>
      </main>
    );
  }
  return (
    <main className="app-shell">
      <header>
        <div className="brand-mark">ĐL</div>
        <div>
          <p className="eyebrow">BẢN ĐỒ HÀNH CHÍNH TƯƠNG TÁC</p>
          <h1>
            ĐẮK LẮK <i>3D</i>
          </h1>
        </div>
        <nav className="mode-tabs" aria-label="Chế độ dữ liệu">
          {[
            ['overview', 'Tổng quan'],
            ['energy', 'Năng lượng'],
            ['heatmap', 'Heatmap'],
          ].map(([mode, label]) => (
            <button
              key={mode}
              className={dataMode === mode ? 'active' : ''}
              aria-pressed={dataMode === mode}
              onClick={() => changeDataMode(mode as typeof dataMode)}
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
          <button onClick={toggle} aria-pressed={visible}>
            {visible ? 'Ẩn' : 'Hiện'} nhãn trung tâm
          </button>
        </div>
      </header>
      <section
        className="map-stage"
        aria-label="Bản đồ hành chính 3D tỉnh Đắk Lắk"
        hidden={viewMode !== '3d'}
      >
        <AdministrativeMap />
        {datasetManifest.metricStatus[dataMode] === 'illustrative' && (
          <div className="illustrative-watermark" aria-label="Chế độ đang dùng dữ liệu minh họa">
            DỮ LIỆU MINH HỌA
          </div>
        )}
        <div className="map-caption">
          <span>12°39′ BẮC · 108°02′ ĐÔNG</span>
          <p>Từ cao nguyên bazan đến duyên hải Phú Yên</p>
        </div>
        <div className="compass" aria-hidden="true">
          N<br />
          <i>↑</i>
        </div>
      </section>
      {viewMode === '3d' ? (
        <>
          <StatPanel />
          <DetailPanel />
        </>
      ) : (
        <AccessibleDirectory />
      )}
      <footer>
        <span title="Contains modified Copernicus Sentinel data 2016">SENTINEL-2 · EOX</span>
        <p>
          {dataMode === 'overview' ? (
            <>
              Chỉ tiêu cấp tỉnh:{' '}
              <a href={datasetManifest.sourceUrl} target="_blank" rel="noreferrer">
                nguồn công bố {datasetManifest.sourceVersion}
              </a>{' '}
              · Chỉ tiêu cấp xã: dữ liệu minh họa.
            </>
          ) : (
            'Lớp chuyên đề đang dùng dữ liệu minh họa có seed cố định.'
          )}
        </p>
        <span title={`Phiên bản cache ${datasetManifest.cacheVersion}`}>
          SNAPSHOT {formatSnapshotDate(datasetManifest.snapshotDate)}
        </span>
      </footer>
    </main>
  );
}
