import ReactECharts from 'echarts-for-react';
import metadata from '../../assets/maps/daklak/daklak-metadata.json';
import metrics from '../../assets/maps/daklak/daklak-metrics.json';
import { formatNumber } from '../../utils/geo';
import dashboardData from '../../assets/data/dashboard-sources.json';
import { useMapStore } from '../../stores/mapStore';
export function StatPanel() {
  const dataMode = useMapStore((state) => state.dataMode);
  const values = Object.values(metrics);
  const population = values.reduce((s, v) => s + v.population, 0);
  const option = {
    backgroundColor: 'transparent',
    grid: { left: 4, right: 5, top: 8, bottom: 18, containLabel: true },
    xAxis: {
      type: 'category',
      data:
        dataMode === 'energy'
          ? ['Thủy điện', 'Tái tạo', 'Phụ tải']
          : dataMode === 'heatmap'
            ? ['Thấp', 'Trung bình', 'Cao']
            : ['Tây', 'Trung tâm', 'Đông'],
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#8eaaa3', fontSize: 10 },
    },
    yAxis: { type: 'value', show: false },
    series: [
      {
        type: 'bar',
        data:
          dataMode === 'energy'
            ? [83, 76, 92]
            : dataMode === 'heatmap'
              ? [42, 68, 94]
              : [62, 84, 73],
        barWidth: 15,
        itemStyle: { color: '#d4a446', borderRadius: [8, 8, 0, 0] },
      },
    ],
  };
  return (
    <aside className="stat-panel glass">
      <p className="eyebrow">
        {dataMode === 'energy'
          ? 'NĂNG LƯỢNG'
          : dataMode === 'heatmap'
            ? 'PHÂN BỐ MINH HỌA'
            : 'TỔNG QUAN 2025'}
      </p>
      <span className="data-badge">
        {dataMode === 'overview' ? 'SỐ LIỆU CẤP TỈNH CÓ NGUỒN' : 'DỮ LIỆU MINH HỌA'}
      </span>
      <div className="hero-stat">
        <strong>
          {dataMode === 'overview'
            ? metadata.totalUnits
            : dataMode === 'energy'
              ? dashboardData.energy.nodes.length
              : 20}
        </strong>
        <span>
          {dataMode === 'overview'
            ? 'đơn vị hành chính'
            : dataMode === 'energy'
              ? 'điểm năng lượng'
              : 'điểm cường độ cao'}
        </span>
      </div>
      {dataMode === 'overview' && (
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
      )}
      <div className="divider" />
      <div className="metric">
        <span>
          {dataMode === 'overview'
            ? 'GRDP 2025'
            : dataMode === 'energy'
              ? 'Trạng thái dữ liệu'
              : 'Chỉ tiêu hiển thị'}
        </span>
        <b>
          {dataMode === 'overview'
            ? `+${dashboardData.overview.grdpGrowthPercent}%`
            : dataMode === 'energy'
              ? 'Minh họa'
              : 'Dân số giả lập'}
        </b>
      </div>
      {dataMode === 'overview' && (
        <div className="metric">
          <span>Doanh nghiệp thành lập mới</span>
          <b>{formatNumber(dashboardData.overview.newBusinesses)}</b>
        </div>
      )}
      <div className="chart-title">
        {dataMode === 'energy'
          ? 'Chỉ số theo nhóm điểm'
          : dataMode === 'heatmap'
            ? 'Cường độ phân bố'
            : 'Chỉ số tiếp cận dịch vụ'}
      </div>
      <ReactECharts option={option} style={{ height: 105 }} opts={{ renderer: 'svg' }} />
      <p className="mock-note">
        {dataMode === 'overview'
          ? `GRDP và doanh nghiệp: ${dashboardData.overview.sourceName}. Dân số cấp xã (${formatNumber(population)}) là dữ liệu minh họa.`
          : 'Các điểm và chỉ số chuyên đề dùng dữ liệu minh họa có seed cố định, chưa phải dữ liệu vận hành thời gian thực.'}
      </p>
    </aside>
  );
}
