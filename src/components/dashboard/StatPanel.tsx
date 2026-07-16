import ReactECharts from 'echarts-for-react';
import metadata from '../../assets/maps/daklak/daklak-metadata.json';
import metrics from '../../assets/maps/daklak/daklak-metrics.json';
import { formatNumber } from '../../utils/geo';
export function StatPanel() {
  const values = Object.values(metrics);
  const population = values.reduce((s, v) => s + v.population, 0);
  const option = {
    backgroundColor: 'transparent',
    grid: { left: 4, right: 5, top: 8, bottom: 18, containLabel: true },
    xAxis: {
      type: 'category',
      data: ['Tây', 'Trung tâm', 'Đông'],
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#8eaaa3', fontSize: 10 },
    },
    yAxis: { type: 'value', show: false },
    series: [
      {
        type: 'bar',
        data: [62, 84, 73],
        barWidth: 15,
        itemStyle: { color: '#d4a446', borderRadius: [8, 8, 0, 0] },
      },
    ],
  };
  return (
    <aside className="stat-panel glass">
      <p className="eyebrow">TỔNG QUAN 2025</p>
      <div className="hero-stat">
        <strong>{metadata.totalUnits}</strong>
        <span>đơn vị hành chính</span>
      </div>
      <div className="stat-pair">
        <div>
          <b>{metadata.communeCount}</b>
          <small>xã</small>
        </div>
        <div>
          <b>{metadata.wardCount}</b>
          <small>phường</small>
        </div>
      </div>
      <div className="divider" />
      <div className="metric">
        <span>Dân số minh họa</span>
        <b>{formatNumber(population)}</b>
      </div>
      <div className="chart-title">Chỉ số tiếp cận dịch vụ</div>
      <ReactECharts option={option} style={{ height: 105 }} opts={{ renderer: 'svg' }} />
      <p className="mock-note">
        Số liệu dashboard là dữ liệu giả lập, không phải thống kê chính thức.
      </p>
    </aside>
  );
}
