import { AdministrativeMap } from './components/map/AdministrativeMap';
import { DetailPanel } from './components/dashboard/DetailPanel';
import { StatPanel } from './components/dashboard/StatPanel';
import { useMapStore } from './stores/mapStore';
export default function App() {
  const toggle = useMapStore((s) => s.toggleLabels),
    visible = useMapStore((s) => s.labelsVisible),
    autoRotate = useMapStore((s) => s.autoRotate),
    toggleAutoRotate = useMapStore((s) => s.toggleAutoRotate);
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
        <span>WGS84 · EPSG:4326</span>
        <p>Dữ liệu trực quan tham khảo — không dùng cho mục đích địa chính, đo đạc hoặc pháp lý.</p>
        <span>SNAPSHOT 12.07.2026</span>
      </footer>
    </main>
  );
}
