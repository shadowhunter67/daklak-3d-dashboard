import metadata from '../../assets/maps/daklak/daklak-metadata.json';
import metrics from '../../assets/maps/daklak/daklak-metrics.json';
import { formatNumber } from '../../utils/geo';
import dashboardData from '../../assets/data/dashboard-sources.json';
import { useMapStore } from '../../stores/mapStore';

const CHART_HEIGHT = 105;
const CHART_LABEL_ROW_HEIGHT = 22;
const BAR_WIDTH = 15;
const BAR_AREA_HEIGHT = CHART_HEIGHT - CHART_LABEL_ROW_HEIGHT;
const CHART_VIEWBOX_WIDTH = 150;

/**
 * Bar chart nội bộ vẽ bằng SVG thuần — thay cho ECharts (core+BarChart+GridComponent+SVGRenderer+
 * echarts-for-react), vốn nặng ~172KB gzip riêng cho việc vẽ đúng 3 cột. Ba chỉ số theo mode luôn
 * đơn giản (3 danh mục, 1 series) nên không cần một thư viện chart tổng quát. Xem
 * docs/performance.md cho số byte trước/sau.
 */
function MiniBarChart({ bars }: { bars: { label: string; value: number }[] }) {
  const maxValue = Math.max(...bars.map((b) => b.value), 1);
  const gap = CHART_VIEWBOX_WIDTH / bars.length;
  return (
    <svg
      viewBox={`0 0 ${CHART_VIEWBOX_WIDTH} ${CHART_HEIGHT}`}
      width="100%"
      height={CHART_HEIGHT}
      role="presentation"
      focusable="false"
    >
      {bars.map((bar, index) => {
        const barHeight = (bar.value / maxValue) * BAR_AREA_HEIGHT;
        const x = gap * index + (gap - BAR_WIDTH) / 2;
        const y = BAR_AREA_HEIGHT - barHeight;
        return (
          <g key={bar.label}>
            <rect x={x} y={y} width={BAR_WIDTH} height={barHeight} rx={4} ry={4} fill="#d4a446" />
            <text
              x={x + BAR_WIDTH / 2}
              y={CHART_HEIGHT - 6}
              textAnchor="middle"
              fontSize="10"
              fill="#8eaaa3"
            >
              {bar.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function StatPanel() {
  const dataMode = useMapStore((state) => state.dataMode);
  const values = Object.values(metrics);
  const population = values.reduce((s, v) => s + v.population, 0);
  const bars =
    dataMode === 'energy'
      ? [
          { label: 'Thủy điện', value: 83 },
          { label: 'Tái tạo', value: 76 },
          { label: 'Phụ tải', value: 92 },
        ]
      : dataMode === 'heatmap'
        ? [
            { label: 'Thấp', value: 42 },
            { label: 'Trung bình', value: 68 },
            { label: 'Cao', value: 94 },
          ]
        : [
            { label: 'Tây', value: 62 },
            { label: 'Trung tâm', value: 84 },
            { label: 'Đông', value: 73 },
          ];
  const chartAriaLabel = `Biểu đồ cột tóm tắt ba nhóm chỉ số đang hiển thị: ${bars
    .map((bar) => `${bar.label} ${bar.value}`)
    .join(', ')}.`;
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
      <div className={dataMode === 'overview' ? 'metric' : 'metric metric--mock'}>
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
      {dataMode === 'overview' && (
        <div className="metric metric--mock">
          <span>Dân số cấp xã</span>
          <b>Minh họa</b>
        </div>
      )}
      <div className="chart-title">
        {dataMode === 'energy'
          ? 'Chỉ số theo nhóm điểm'
          : dataMode === 'heatmap'
            ? 'Cường độ phân bố'
            : 'Chỉ số tiếp cận dịch vụ'}
      </div>
      <div role="img" aria-label={chartAriaLabel}>
        <MiniBarChart bars={bars} />
      </div>
      <p className="mock-note">
        {dataMode === 'overview'
          ? `GRDP và doanh nghiệp: ${dashboardData.overview.sourceName}. Dân số cấp xã (${formatNumber(population)}) là dữ liệu minh họa.`
          : 'Các điểm và chỉ số chuyên đề dùng dữ liệu minh họa có seed cố định, chưa phải dữ liệu vận hành thời gian thực.'}
      </p>
    </aside>
  );
}
