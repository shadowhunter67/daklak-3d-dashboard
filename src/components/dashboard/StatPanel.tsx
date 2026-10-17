import metadata from '#province-assets/daklak-metadata.json';
import { unitMetrics } from '../../data/unitMetrics';
import { provinceProfileTotals } from '../../data/unitProfiles';
import wards from '#province-assets/daklak-wards-render.json';
import dashboardData from '../../assets/data/dashboard-sources.json';
import { useMapStore } from '../../stores/mapStore';
import { useTranslation } from '../../i18n/useTranslation';
import { formatNumber } from '../../i18n/formatters';

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
            {/* Số liệu dưới thanh cột trước đây chỉ có ở aria-label (chartAriaLabel) — người dùng
                đọc bằng mắt (kể cả người mắt kém đã bật A+) không thấy con số nào, chỉ thấy chữ
                "Thấp/Trung bình/Cao" và chiều cao cột — spec §XII: heatmap phải thể hiện số, không
                chỉ nhãn định tính. */}
            <text
              x={x + BAR_WIDTH / 2}
              y={Math.max(y - 4, 11)}
              textAnchor="middle"
              fontSize="11"
              fontWeight="700"
              fill="#e9f2ed"
            >
              {bar.value}
            </text>
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
  const { t, locale } = useTranslation();
  const dataMode = useMapStore((state) => state.dataMode);
  const values = Object.values(unitMetrics);
  const population = provinceProfileTotals.population2025;
  const area = wards.features.reduce((s, ward) => s + ward.properties.areaKm2, 0);
  const average = (items: number[]) =>
    items.length ? Math.round(items.reduce((sum, value) => sum + value, 0) / items.length) : 0;
  const energyValues = dashboardData.energy.nodes;
  const bars =
    dataMode === 'energy'
      ? [
          {
            label: t('statPanel.bar.hydro'),
            value: average(
              energyValues.filter((node) => node.kind === 'hydro').map((node) => node.value),
            ),
          },
          {
            label: t('statPanel.bar.renewable'),
            value: average(
              energyValues.filter((node) => node.kind === 'renewable').map((node) => node.value),
            ),
          },
          {
            label: t('statPanel.bar.load'),
            value: average(
              energyValues.filter((node) => node.kind === 'load').map((node) => node.value),
            ),
          },
        ]
      : dataMode === 'heatmap'
        ? [
            {
              label: t('statPanel.bar.low'),
              value: average(
                values.filter((metric) => metric.coverage < 50).map((metric) => metric.coverage),
              ),
            },
            {
              label: t('statPanel.bar.medium'),
              value: average(
                values
                  .filter((metric) => metric.coverage >= 50 && metric.coverage < 80)
                  .map((metric) => metric.coverage),
              ),
            },
            {
              label: t('statPanel.bar.high'),
              value: average(
                values.filter((metric) => metric.coverage >= 80).map((metric) => metric.coverage),
              ),
            },
          ]
        : [
            {
              label: t('statPanel.bar.low'),
              value: average(
                values.filter((metric) => metric.coverage < 50).map((metric) => metric.coverage),
              ),
            },
            {
              label: t('statPanel.bar.medium'),
              value: average(
                values
                  .filter((metric) => metric.coverage >= 50 && metric.coverage < 80)
                  .map((metric) => metric.coverage),
              ),
            },
            {
              label: t('statPanel.bar.high'),
              value: average(
                values.filter((metric) => metric.coverage >= 80).map((metric) => metric.coverage),
              ),
            },
          ];
  const chartAriaLabel = t('statPanel.chartAria', {
    summary: bars.map((bar) => `${bar.label} ${bar.value}`).join(', '),
  });
  return (
    <aside className="stat-panel glass">
      <p className="eyebrow">
        {dataMode === 'energy'
          ? t('statPanel.eyebrow.energy')
          : dataMode === 'heatmap'
            ? t('statPanel.eyebrow.heatmap')
            : t('statPanel.eyebrow.overview')}
      </p>
      <span className="data-badge">
        {dataMode === 'overview'
          ? t('statPanel.badge.overview')
          : t('statPanel.badge.illustrative')}
      </span>
      <div className="hero-stat">
        <strong>
          {dataMode === 'overview'
            ? metadata.totalUnits
            : dataMode === 'energy'
              ? dashboardData.energy.nodes.length
              : values.length}
        </strong>
        <span>
          {dataMode === 'overview'
            ? t('statPanel.heroLabel.overview')
            : dataMode === 'energy'
              ? t('statPanel.heroLabel.energy')
              : t('statPanel.heroLabel.heatmap')}
        </span>
      </div>
      {dataMode === 'overview' && (
        <div className="stat-pair">
          <div>
            <b>{metadata.communeCount}</b>
            <small>{t('statPanel.communeUnit')}</small>
          </div>
          <div>
            <b>{metadata.wardCount}</b>
            <small>{t('statPanel.wardUnit')}</small>
          </div>
        </div>
      )}
      <div className="divider" />
      <div className={dataMode === 'overview' ? 'metric' : 'metric metric--mock'}>
        <span>
          {dataMode === 'overview'
            ? t('statPanel.metricLabel.grdp')
            : dataMode === 'energy'
              ? t('statPanel.metricLabel.energyStatus')
              : t('statPanel.metricLabel.heatmapIndicator')}
        </span>
        <b>
          {dataMode === 'overview'
            ? `+${dashboardData.overview.grdpGrowthPercent}%`
            : dataMode === 'energy'
              ? t('statPanel.metricValue.illustrative')
              : t('statPanel.metricValue.simulatedPopulation')}
        </b>
      </div>
      {dataMode === 'overview' && (
        <div className="metric">
          <span>{t('statPanel.newBusinesses')}</span>
          <b>{formatNumber(dashboardData.overview.newBusinesses, locale)}</b>
        </div>
      )}
      {dataMode === 'overview' && (
        <>
          <div className="metric">
            <span>{t('statPanel.communePopulation')}</span>
            <b>{formatNumber(population, locale)}</b>
          </div>
          <div className="metric">
            <span>{t('statPanel.subUnits')}</span>
            <b>{formatNumber(provinceProfileTotals.subUnits, locale)}</b>
          </div>
        </>
      )}
      {dataMode === 'overview' && (
        <div className="metric">
          <span>{t('statPanel.area')}</span>
          <b>{formatNumber(area, locale)} km²</b>
        </div>
      )}
      <div className="chart-title">
        {dataMode === 'energy'
          ? t('statPanel.chartTitle.energy')
          : dataMode === 'heatmap'
            ? t('statPanel.chartTitle.heatmap')
            : t('statPanel.chartTitle.overview')}
      </div>
      <div role="img" aria-label={chartAriaLabel}>
        <MiniBarChart bars={bars} />
      </div>
      <p className="mock-note">
        {dataMode === 'overview'
          ? t('statPanel.mockNote.overview', {
              source: dashboardData.overview.sourceName,
              population: formatNumber(population, locale),
            })
          : t('statPanel.mockNote.other')}
      </p>
    </aside>
  );
}
