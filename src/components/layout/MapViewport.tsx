import { lazy, Suspense, useState } from 'react';
import { datasetManifest } from '../../data/datasetManifest';
import { useMapStore } from '../../stores/mapStore';
import { MapFallback, MapLoading } from '../map/MapFallback';
import { hasWebGLSupport } from '../map/webglLifecycle';

const AdministrativeMap = lazy(() =>
  import('../map/AdministrativeMap').then((module) => ({ default: module.AdministrativeMap })),
);

export function MapViewport() {
  const dataMode = useMapStore((state) => state.dataMode);
  const viewMode = useMapStore((state) => state.viewMode);
  const setViewMode = useMapStore((state) => state.setViewMode);
  const [webGLSupported] = useState(() => hasWebGLSupport());
  if (viewMode !== '3d') return null;
  return (
    <section
      id="map-viewport"
      className="map-stage"
      aria-label="Bản đồ hành chính 3D tỉnh Đắk Lắk"
      tabIndex={-1}
    >
      {webGLSupported ? (
        <Suspense fallback={<MapLoading />}>
          <AdministrativeMap />
        </Suspense>
      ) : (
        <MapFallback
          reason="Trình duyệt hoặc thiết bị này không hỗ trợ WebGL. Danh sách 2D vẫn khả dụng."
          actionLabel="Mở danh sách 2D"
          onRetry={() => setViewMode('table')}
        />
      )}
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
  );
}
