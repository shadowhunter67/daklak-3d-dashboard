import wards from '../../assets/maps/daklak/daklak-wards-render.json';
import metrics from '../../assets/maps/daklak/daklak-metrics.json';
import type { WardCollection, Metric } from '../../types/map';
import { formatNumber, formatUnitType } from '../../utils/geo';
import { useMapStore } from '../../stores/mapStore';
const data = wards as WardCollection;
const metricMap = metrics as Partial<Record<string, Metric>>;
export function DetailPanel() {
  const selected = useMapStore((s) => s.selectedCode),
    hovered = useMapStore((s) => s.hoveredCode);
  const code = selected ?? hovered;
  const f = data.features.find((x) => x.properties.code === code);
  if (!f)
    return (
      <aside className="detail-panel glass empty">
        <span>◌</span>
        <h2>Chạm vào đại ngàn</h2>
        <p>Di chuột hoặc chọn một xã, phường để mở hồ sơ nhanh.</p>
      </aside>
    );
  const m = metricMap[f.properties.code];
  if (!m)
    return (
      <aside className="detail-panel glass empty" role="alert">
        <h2>Thiếu dữ liệu chi tiết</h2>
        <p>Không tìm thấy chỉ số tương ứng với đơn vị đã chọn.</p>
      </aside>
    );
  return (
    <aside className="detail-panel glass">
      <p className="eyebrow">{selected ? 'ĐANG CHỌN' : 'ĐANG KHÁM PHÁ'}</p>
      <h2>{f.properties.name}</h2>
      <p className="unit-type">
        {formatUnitType(f.properties.type)} · Mã {f.properties.code}
      </p>
      <dl>
        <div>
          <dt>Diện tích nguồn</dt>
          <dd>{f.properties.areaKm2.toLocaleString('vi-VN')} km²</dd>
        </div>
        <div>
          <dt>Dân số minh họa</dt>
          <dd>{formatNumber(m.population)}</dd>
        </div>
        <div>
          <dt>Tiếp cận dịch vụ</dt>
          <dd>{m.coverage}%</dd>
        </div>
        <div>
          <dt>Tăng trưởng giả lập</dt>
          <dd className={m.growth >= 0 ? 'positive' : ''}>
            {m.growth >= 0 ? '+' : ''}
            {m.growth}%
          </dd>
        </div>
      </dl>
    </aside>
  );
}
