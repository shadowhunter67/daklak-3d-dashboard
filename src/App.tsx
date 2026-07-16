import { AdministrativeMap } from './components/map/AdministrativeMap';
import { DetailPanel } from './components/dashboard/DetailPanel';
import { StatPanel } from './components/dashboard/StatPanel';
import { useMapStore } from './stores/mapStore';
export default function App() {
  const toggle = useMapStore((s) => s.toggleLabels),
    visible = useMapStore((s) => s.labelsVisible),
    autoRotate = useMapStore((s) => s.autoRotate),
    toggleAutoRotate = useMapStore((s) => s.toggleAutoRotate),
    dataMode = useMapStore((s) => s.dataMode),
    setDataMode = useMapStore((s) => s.setDataMode);
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
              onClick={() => setDataMode(mode as typeof dataMode)}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="header-meta">
          <span>102 miền đất</span>
          <button onClick={toggleAutoRotate} aria-pressed={autoRotate} title="Xoay bản đồ 360 độ">
            {autoRotate ? 'Dừng xoay' : 'Xoay 360°'}
          </button>
          <button onClick={toggle} aria-pressed={visible}>
            {visible ? 'Ẩn' : 'Hiện'} nhãn
          </button>
        </div>
      </header>
      <section className="map-stage" aria-label="Bản đồ hành chính 3D tỉnh Đắk Lắk">
        <AdministrativeMap />
        <div className="map-caption">
          <span>12°39′ BẮC · 108°02′ ĐÔNG</span>
          <p>Từ cao nguyên bazan đến duyên hải Phú Yên</p>
        </div>
        <div className="compass" aria-hidden="true">
          N<br />
          <i>↑</i>
        </div>
      </section>
      <StatPanel />
      <DetailPanel />
      <footer>
        <span title="Contains modified Copernicus Sentinel data 2016">SENTINEL-2 · EOX</span>
        <p>
          {dataMode === 'overview'
            ? 'Chỉ tiêu cấp tỉnh: nguồn công bố 2025 · Chỉ tiêu cấp xã: dữ liệu minh họa.'
            : 'Lớp chuyên đề đang dùng dữ liệu minh họa có seed cố định.'}
        </p>
        <span>SNAPSHOT 12.07.2026</span>
      </footer>
    </main>
  );
}
