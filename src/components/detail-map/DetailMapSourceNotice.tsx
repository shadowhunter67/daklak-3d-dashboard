/**
 * A permanent, honest explanation shown over the (currently empty) map canvas when no real
 * PMTiles/vector source is configured — see readSourceAvailability() in DetailMapViewport.tsx.
 * Without this, the map background alone (see detailMapStyle.ts) is indistinguishable from a
 * rendering failure. `pointer-events: none` keeps it from blocking map panning/zooming or the
 * layer-panel trigger underneath/around it.
 */
export function DetailMapSourceNotice() {
  return (
    <div className="detail-map-source-notice">
      <p className="eyebrow">Chế độ chờ dữ liệu</p>
      <p>
        Chưa cấu hình nguồn bản đồ (PMTiles) cho môi trường này nên nền bản đồ đang để trống có chủ
        đích — không dùng dữ liệu giả thay thế. Mở <strong>Lớp bản đồ</strong> để xem từng lớp đang
        chờ dữ liệu thật.
      </p>
    </div>
  );
}
